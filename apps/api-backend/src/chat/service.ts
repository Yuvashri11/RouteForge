import { prisma } from "../lib/prisma";
import {
  getObservedProviderMetric,
  publishProfileUpdate,
  publishProviderMetric,
  type ProviderMetricAggregate,
} from "../lib/redis";
import { getLlmProvider } from "../llms";
import type { ChatMessage, StreamChunk } from "../llms";

type ChatCompletionResult = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

type ProviderSortMode = "price" | "throughput" | "latency";

type ProviderSortPreference =
  | ProviderSortMode
  | {
      by: ProviderSortMode;
      partition?: "model" | "none";
    };

type ProviderRoutingPreferences = {
  order?: string[];
  allowFallbacks?: boolean;
  sort?: ProviderSortPreference;
  only?: string[];
  ignore?: string[];
  maxPrice?: {
    prompt?: number;
    completion?: number;
  };
  preferredMinThroughput?: number;
  preferredMaxLatency?: number;
};

type ModelFallbackOptions = {
  models?: string[];
  provider?: ProviderRoutingPreferences;
};

type ModelProviderMappingRecord = {
  id: number;
  inputTokenCost: number;
  outputTokenCost: number;
  provider: {
    id: number;
    name: string;
    website: string;
  };
};

type ResolvedModelRecord = {
  id: number;
  name: string;
  slug: string;
  company: {
    id: number;
    name: string;
    website: string;
  };
  modelProviderMappings: ModelProviderMappingRecord[];
};

type RoutingAttempt = {
  modelSlug: string;
  modelIndex: number;
  mapping: ModelProviderMappingRecord;
  providerName: string;
  priceScore: number;
  metrics: ProviderMetricAggregate | null;
  preferred: boolean;
  orderRank: number;
};

type RoutingGroup = {
  modelSlug: string;
  modelIndex: number;
  attempts: RoutingAttempt[];
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function matchesProviderSelector(selector: string, providerName: string) {
  const normalizedSelector = normalizeKey(selector);
  const normalizedProvider = normalizeKey(providerName);

  return (
    normalizedProvider === normalizedSelector ||
    normalizedProvider.startsWith(`${normalizedSelector}/`)
  );
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeKey(value);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value);
  }

  return result;
}

function normalizeSortPreference(sort?: ProviderSortPreference) {
  if (!sort) return null;

  if (typeof sort === "string") {
    return { by: sort, partition: "model" as const };
  }

  return { by: sort.by, partition: sort.partition ?? "model" };
}

function actualModelName(modelSlug: string) {
  return modelSlug.includes("/") ? modelSlug.split("/").slice(1).join("/") : modelSlug;
}

function buildModelQueue(modelSlug: string, fallbackModels?: string[]) {
  return dedupeStrings([modelSlug, ...(fallbackModels ?? [])]);
}

function compareAttempts(
  left: RoutingAttempt,
  right: RoutingAttempt,
  sortPreference: ReturnType<typeof normalizeSortPreference>,
) {
  if (left.preferred !== right.preferred) {
    return Number(right.preferred) - Number(left.preferred);
  }

  if (left.orderRank !== right.orderRank) {
    return left.orderRank - right.orderRank;
  }

  const leftMetrics = left.metrics;
  const rightMetrics = right.metrics;
  const leftPrice = left.priceScore;
  const rightPrice = right.priceScore;
  const leftLatency = leftMetrics?.avgLatencyMs ?? Number.POSITIVE_INFINITY;
  const rightLatency = rightMetrics?.avgLatencyMs ?? Number.POSITIVE_INFINITY;
  const leftThroughput = leftMetrics?.avgThroughputTps ?? 0;
  const rightThroughput = rightMetrics?.avgThroughputTps ?? 0;
  const leftUptime = leftMetrics?.uptimePct ?? 0;
  const rightUptime = rightMetrics?.uptimePct ?? 0;
  const sortBy = sortPreference?.by ?? "price";

  if (sortBy === "throughput") {
    if (leftThroughput !== rightThroughput) {
      return rightThroughput - leftThroughput;
    }
  } else if (sortBy === "latency") {
    if (leftLatency !== rightLatency) {
      return leftLatency - rightLatency;
    }
  } else if (leftPrice !== rightPrice) {
    return leftPrice - rightPrice;
  }

  if (leftPrice !== rightPrice) {
    return leftPrice - rightPrice;
  }

  if (rightUptime !== leftUptime) {
    return rightUptime - leftUptime;
  }

  if (leftLatency !== rightLatency) {
    return leftLatency - rightLatency;
  }

  if (leftThroughput !== rightThroughput) {
    return rightThroughput - leftThroughput;
  }

  return left.providerName.localeCompare(right.providerName);
}

function buildRoutingGroups(
  models: ResolvedModelRecord[],
  preferences?: ProviderRoutingPreferences,
) {
  const normalizedOrder = preferences?.order?.map((value) => normalizeKey(value)) ?? [];
  const sortPreference = normalizeSortPreference(preferences?.sort);

  return models
    .map((model, modelIndex): RoutingGroup => {
      const attempts = model.modelProviderMappings
        .map((mapping) => {
          const providerName = mapping.provider.name;
          const metrics = getObservedProviderMetric(model.slug, providerName);
          const orderRank = normalizedOrder.length
            ? normalizedOrder.findIndex((selector) =>
                matchesProviderSelector(selector, providerName),
              )
            : Number.POSITIVE_INFINITY;

          return {
            modelSlug: model.slug,
            modelIndex,
            mapping,
            providerName,
            priceScore: mapping.inputTokenCost + mapping.outputTokenCost,
            metrics,
            preferred: false,
            orderRank: orderRank === -1 ? Number.POSITIVE_INFINITY : orderRank,
          } satisfies RoutingAttempt;
        })
        .filter((attempt) => {
          if (preferences?.only?.length) {
            const allowed = preferences.only.some((selector) =>
              matchesProviderSelector(selector, attempt.providerName),
            );

            if (!allowed) return false;
          }

          if (preferences?.ignore?.length) {
            const ignored = preferences.ignore.some((selector) =>
              matchesProviderSelector(selector, attempt.providerName),
            );

            if (ignored) return false;
          }

          if (preferences?.maxPrice) {
            const { prompt, completion } = preferences.maxPrice;

            if (typeof prompt === "number" && attempt.mapping.inputTokenCost > prompt) {
              return false;
            }

            if (
              typeof completion === "number" &&
              attempt.mapping.outputTokenCost > completion
            ) {
              return false;
            }
          }

          return true;
        })
        .map((attempt) => {
          const throughput = attempt.metrics?.avgThroughputTps ?? 0;
          const latency = attempt.metrics?.avgLatencyMs ?? Number.POSITIVE_INFINITY;
          const preferredMinThroughput = preferences?.preferredMinThroughput;
          const preferredMaxLatency = preferences?.preferredMaxLatency;

          return {
            ...attempt,
            preferred:
              (typeof preferredMinThroughput !== "number" || throughput >= preferredMinThroughput) &&
              (typeof preferredMaxLatency !== "number" || latency <= preferredMaxLatency * 1000),
          } satisfies RoutingAttempt;
        })
        .sort((left, right) => compareAttempts(left, right, sortPreference));

      return {
        modelSlug: model.slug,
        modelIndex,
        attempts,
      };
    })
    .filter((group) => group.attempts.length > 0);
}

function buildGlobalQueue(groups: RoutingGroup[]) {
  return groups.flatMap((group) => group.attempts);
}

async function executeCompletionAttempt(
  candidate: RoutingAttempt,
  messages: ChatMessage[],
) {
  const startedAt = Date.now();
  const llmProvider = getLlmProvider(candidate.providerName);

  try {
    const response = await llmProvider.chat({
      messages,
      model: actualModelName(candidate.modelSlug),
    });

    const latencyMs = Date.now() - startedAt;
    const latencySec = Math.max(latencyMs / 1000, 0.001);
    const throughputTps = Number((response.outputTokens / latencySec).toFixed(2));

    return {
      content: response.content,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      latencyMs,
      throughputTps,
      creditCost:
        (response.inputTokens * candidate.mapping.inputTokenCost +
          response.outputTokens * candidate.mapping.outputTokenCost) /
        10,
    };
  } catch (error) {
    await publishProviderMetric({
      modelSlug: candidate.modelSlug,
      providerName: candidate.providerName,
      latencyMs: Date.now() - startedAt,
      throughputTps: 0,
      success: false,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

async function collectResolvedModels(modelSlug: string, fallbackModels?: string[]) {
  const requestedModels = buildModelQueue(modelSlug, fallbackModels);
  const resolvedModels: ResolvedModelRecord[] = [];

  for (const requestedSlug of requestedModels) {
    const model = await ChatService.resolveModel(requestedSlug);
    if (model) {
      resolvedModels.push(model);
    }
  }

  return resolvedModels;
}

export abstract class ChatService {
  static async validateApiKey(apiKeyString: string) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { apiKey: apiKeyString },
      include: { user: true },
    });

    if (!apiKey || apiKey.disabled || apiKey.deleted) {
      return null;
    }

    return apiKey;
  }

  static async resolveModel(modelSlug: string): Promise<ResolvedModelRecord | null> {
    const model = await prisma.model.findFirst({
      where: { slug: modelSlug },
      include: {
        company: true,
        modelProviderMappings: {
          include: { provider: true },
        },
      },
    });

    if (!model || model.modelProviderMappings.length === 0) {
      return null;
    }

    return model as ResolvedModelRecord;
  }

  static async complete(
    apiKeyString: string,
    modelSlug: string,
    messages: ChatMessage[],
    options?: ModelFallbackOptions,
  ): Promise<ChatCompletionResult> {
    const apiKey = await ChatService.validateApiKey(apiKeyString);
    if (!apiKey) {
      throw new ApiKeyError("Invalid or disabled API key");
    }

    const resolvedModels = await collectResolvedModels(modelSlug, options?.models);
    if (!resolvedModels.length) {
      throw new ModelNotFoundError(`Model not found: ${modelSlug}`);
    }

    const routingGroups = buildRoutingGroups(resolvedModels, options?.provider);
    if (!routingGroups.length) {
      throw new Error("No eligible providers were found for the requested model.");
    }

    const sortPreference = normalizeSortPreference(options?.provider?.sort);
    const allowFallbacks = options?.provider?.allowFallbacks ?? true;
    const attempts =
      sortPreference?.partition === "none"
        ? allowFallbacks
          ? buildGlobalQueue(routingGroups).sort((left, right) => compareAttempts(left, right, sortPreference))
          : buildGlobalQueue(routingGroups)
              .sort((left, right) => compareAttempts(left, right, sortPreference))
              .slice(0, 1)
        : undefined;

    if (attempts) {
      let lastError: unknown = null;

      for (const candidate of attempts) {
        try {
          const result = await executeCompletionAttempt(candidate, messages);

          await prisma.$transaction([
            prisma.user.update({
              where: { id: apiKey.userId },
              data: { credits: { decrement: result.creditCost } },
            }),
            prisma.apiKey.update({
              where: { id: apiKey.id },
              data: {
                lastUsed: new Date(),
                creditsConsumed: { increment: result.creditCost },
              },
            }),
            prisma.conversation.create({
              data: {
                userId: apiKey.userId,
                apiKeyId: apiKey.id,
                modelProviderMappingId: candidate.mapping.id,
                input: messages.map((m) => m.content).join("\n"),
                output: result.content,
                inputTokenCount: result.inputTokens,
                outputTokenCount: result.outputTokens,
              },
            }),
          ]);

          await publishProfileUpdate(apiKey.userId);
          await publishProviderMetric({
            modelSlug: candidate.modelSlug,
            providerName: candidate.providerName,
            latencyMs: result.latencyMs,
            throughputTps: result.throughputTps,
            success: true,
            timestamp: new Date().toISOString(),
          });

          return {
            content: result.content,
            model: candidate.modelSlug,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError ?? new Error("Unable to complete request.");
    }

    let lastError: unknown = null;

    for (const group of routingGroups) {
      const candidates = allowFallbacks ? group.attempts : group.attempts.slice(0, 1);

      for (const candidate of candidates) {
        try {
          const result = await executeCompletionAttempt(candidate, messages);

          await prisma.$transaction([
            prisma.user.update({
              where: { id: apiKey.userId },
              data: { credits: { decrement: result.creditCost } },
            }),
            prisma.apiKey.update({
              where: { id: apiKey.id },
              data: {
                lastUsed: new Date(),
                creditsConsumed: { increment: result.creditCost },
              },
            }),
            prisma.conversation.create({
              data: {
                userId: apiKey.userId,
                apiKeyId: apiKey.id,
                modelProviderMappingId: candidate.mapping.id,
                input: messages.map((m) => m.content).join("\n"),
                output: result.content,
                inputTokenCount: result.inputTokens,
                outputTokenCount: result.outputTokens,
              },
            }),
          ]);

          await publishProfileUpdate(apiKey.userId);
          await publishProviderMetric({
            modelSlug: candidate.modelSlug,
            providerName: candidate.providerName,
            latencyMs: result.latencyMs,
            throughputTps: result.throughputTps,
            success: true,
            timestamp: new Date().toISOString(),
          });

          return {
            content: result.content,
            model: candidate.modelSlug,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          };
        } catch (error) {
          lastError = error;
          if (!allowFallbacks) {
            break;
          }
        }
      }
    }

    throw lastError ?? new Error("Unable to complete request.");
  }

  static async *streamComplete(
    apiKeyString: string,
    modelSlug: string,
    messages: ChatMessage[],
    options?: ModelFallbackOptions,
  ): AsyncGenerator<StreamChunk> {
    const apiKey = await ChatService.validateApiKey(apiKeyString);
    if (!apiKey) {
      throw new ApiKeyError("Invalid or disabled API key");
    }

    const resolvedModels = await collectResolvedModels(modelSlug, options?.models);
    if (!resolvedModels.length) {
      throw new ModelNotFoundError(`Model not found: ${modelSlug}`);
    }

    const routingGroups = buildRoutingGroups(resolvedModels, options?.provider);
    if (!routingGroups.length) {
      throw new Error("No eligible providers were found for the requested model.");
    }

    const sortPreference = normalizeSortPreference(options?.provider?.sort);
    const allowFallbacks = options?.provider?.allowFallbacks ?? true;
    const attempts =
      sortPreference?.partition === "none"
        ? allowFallbacks
          ? buildGlobalQueue(routingGroups).sort((left, right) => compareAttempts(left, right, sortPreference))
          : buildGlobalQueue(routingGroups)
              .sort((left, right) => compareAttempts(left, right, sortPreference))
              .slice(0, 1)
        : undefined;

    const candidateGroups = attempts ? [{ attempts }] : routingGroups.map((group) => ({ attempts: allowFallbacks ? group.attempts : group.attempts.slice(0, 1) }));

    let lastError: unknown = null;

    for (const group of candidateGroups) {
      for (const candidate of group.attempts) {
        const startedAt = Date.now();
        const llmProvider = getLlmProvider(candidate.providerName);
        const modelName = actualModelName(candidate.modelSlug);

        let fullContent = "";
        let inputTokens = 0;
        let outputTokens = 0;
        let emittedDelta = false;

        try {
          const stream = llmProvider.chatStream({
            messages,
            model: modelName,
          });

          for await (const chunk of stream) {
            yield chunk;

            if (chunk.type === "delta") {
              emittedDelta = true;
              fullContent += chunk.content;
            } else if (chunk.type === "done") {
              inputTokens = chunk.inputTokens;
              outputTokens = chunk.outputTokens;
            }
          }

          const latencyMs = Date.now() - startedAt;
          const latencySec = Math.max(latencyMs / 1000, 0.001);
          const throughputTps = Number((outputTokens / latencySec).toFixed(2));
          const creditCost =
            (inputTokens * candidate.mapping.inputTokenCost +
              outputTokens * candidate.mapping.outputTokenCost) /
            10;

          await prisma.$transaction([
            prisma.user.update({
              where: { id: apiKey.userId },
              data: { credits: { decrement: creditCost } },
            }),
            prisma.apiKey.update({
              where: { id: apiKey.id },
              data: {
                lastUsed: new Date(),
                creditsConsumed: { increment: creditCost },
              },
            }),
            prisma.conversation.create({
              data: {
                userId: apiKey.userId,
                apiKeyId: apiKey.id,
                modelProviderMappingId: candidate.mapping.id,
                input: messages.map((m) => m.content).join("\n"),
                output: fullContent,
                inputTokenCount: inputTokens,
                outputTokenCount: outputTokens,
              },
            }),
          ]);

          await publishProfileUpdate(apiKey.userId);
          await publishProviderMetric({
            modelSlug: candidate.modelSlug,
            providerName: candidate.providerName,
            latencyMs,
            throughputTps,
            success: true,
            timestamp: new Date().toISOString(),
          });

          return;
        } catch (error) {
          lastError = error;

          await publishProviderMetric({
            modelSlug: candidate.modelSlug,
            providerName: candidate.providerName,
            latencyMs: Date.now() - startedAt,
            throughputTps: 0,
            success: false,
            timestamp: new Date().toISOString(),
          });

          if (emittedDelta) {
            throw error;
          }
        }
      }
    }

    throw lastError ?? new Error("Unable to complete request.");
  }
}

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyError";
  }
}

export class ModelNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelNotFoundError";
  }
}
