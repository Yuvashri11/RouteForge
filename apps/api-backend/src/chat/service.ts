import { prisma } from "../lib/prisma";
import { getLlmProvider } from "../llms";
import type { ChatMessage, StreamChunk } from "../llms";

type ChatCompletionResult = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

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

  static async resolveModel(modelSlug: string) {
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

    return {
      model,
      mapping: model.modelProviderMappings[0]!,
      provider: model.modelProviderMappings[0]!.provider,
    };
  }

  static async complete(
    apiKeyString: string,
    modelSlug: string,
    messages: ChatMessage[]
  ): Promise<ChatCompletionResult> {
    const apiKey = await ChatService.validateApiKey(apiKeyString);
    if (!apiKey) {
      throw new ApiKeyError("Invalid or disabled API key");
    }

    const resolved = await ChatService.resolveModel(modelSlug);
    if (!resolved) {
      throw new ModelNotFoundError(`Model not found: ${modelSlug}`);
    }

    const { model, mapping, provider: providerRecord } = resolved;

    // Use the company name from the DB to resolve the LLM provider
    const companyName = model.company.name.toLowerCase();
    const llmProvider = getLlmProvider(companyName);

    // Extract the actual API model name:
    // - Slugs with "/" prefix (e.g. "openai/gpt-3.5-turbo") → strip the prefix
    // - Slugs without "/" (e.g. "llama3.1-8b") → use as-is
    const actualModelName = modelSlug.includes("/")
      ? modelSlug.split("/").slice(1).join("/")
      : modelSlug;

    const response = await llmProvider.chat({
      messages,
      model: actualModelName,
    });

    // Calculate credit cost: inputTokens × inputTokenCost + outputTokens × outputTokenCost
    const creditCost =
      (response.inputTokens * mapping.inputTokenCost +
      response.outputTokens * mapping.outputTokenCost)/10;

    // Deduct credits from user and update API key usage
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
          modelProviderMappingId: mapping.id,
          input: messages.map((m) => m.content).join("\n"),
          output: response.content,
          inputTokenCount: response.inputTokens,
          outputTokenCount: response.outputTokens,
        },
      }),
    ]);

    return {
      content: response.content,
      model: modelSlug,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    };
  }

  /**
   * Streaming version — yields SSE-formatted chunks and handles
   * credit deduction + conversation logging after the stream ends.
   */
  static async *streamComplete(
    apiKeyString: string,
    modelSlug: string,
    messages: ChatMessage[]
  ): AsyncGenerator<StreamChunk> {
    const apiKey = await ChatService.validateApiKey(apiKeyString);
    if (!apiKey) {
      throw new ApiKeyError("Invalid or disabled API key");
    }

    const resolved = await ChatService.resolveModel(modelSlug);
    if (!resolved) {
      throw new ModelNotFoundError(`Model not found: ${modelSlug}`);
    }

    const { model, mapping } = resolved;

    const companyName = model.company.name.toLowerCase();
    const llmProvider = getLlmProvider(companyName);

    const actualModelName = modelSlug.includes("/")
      ? modelSlug.split("/").slice(1).join("/")
      : modelSlug;

    const stream = llmProvider.chatStream({
      messages,
      model: actualModelName,
    });

    let fullContent = "";
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      yield chunk;

      if (chunk.type === "delta") {
        fullContent += chunk.content;
      } else if (chunk.type === "done") {
        inputTokens = chunk.inputTokens;
        outputTokens = chunk.outputTokens;
      }
    }

    // After stream ends: deduct credits and log conversation
    const creditCost =
      (inputTokens * mapping.inputTokenCost +
      outputTokens * mapping.outputTokenCost) / 10;

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
          modelProviderMappingId: mapping.id,
          input: messages.map((m) => m.content).join("\n"),
          output: fullContent,
          inputTokenCount: inputTokens,
          outputTokenCount: outputTokens,
        },
      }),
    ]);
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
