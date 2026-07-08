import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
export const redis = new Redis(redisUrl);

export const redisSubscriber = new Redis(redisUrl);

export type ProviderMetricEvent = {
  modelSlug: string;
  providerName: string;
  latencyMs: number;
  throughputTps: number;
  success: boolean;
  timestamp: string;
};

export type ProviderMetricAggregate = {
  providerName: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  errorRatePct: number;
  avgLatencyMs: number;
  avgThroughputTps: number;
  uptimePct: number;
  lastUpdatedAt: string;
};

const providerMetrics = new Map<string, Map<string, ProviderMetricAggregate>>();

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function upsertProviderMetric(event: ProviderMetricEvent) {
  if (!event.modelSlug || !event.providerName) return;

  const modelKey = normalizeKey(event.modelSlug);
  const providerKey = normalizeKey(event.providerName);

  let providerMap = providerMetrics.get(modelKey);
  if (!providerMap) {
    providerMap = new Map<string, ProviderMetricAggregate>();
    providerMetrics.set(modelKey, providerMap);
  }

  const existing = providerMap.get(providerKey);

  if (!existing) {
    const requestCount = 1;
    const successCount = event.success ? 1 : 0;
    const failureCount = event.success ? 0 : 1;

    providerMap.set(providerKey, {
      providerName: event.providerName,
      requestCount,
      successCount,
      failureCount,
      errorRatePct: Number(((failureCount / requestCount) * 100).toFixed(2)),
      avgLatencyMs: event.success ? Number(event.latencyMs.toFixed(2)) : 0,
      avgThroughputTps: event.success ? Number(event.throughputTps.toFixed(2)) : 0,
      uptimePct: Number(((successCount / requestCount) * 100).toFixed(2)),
      lastUpdatedAt: event.timestamp,
    });

    return;
  }

  const requestCount = existing.requestCount + 1;
  const successCount = existing.successCount + (event.success ? 1 : 0);
  const failureCount = existing.failureCount + (event.success ? 0 : 1);

  const nextLatency =
    event.success && successCount > 0
      ? (existing.avgLatencyMs * existing.successCount + event.latencyMs) / successCount
      : existing.avgLatencyMs;

  const nextThroughput =
    event.success && successCount > 0
      ? (existing.avgThroughputTps * existing.successCount + event.throughputTps) / successCount
      : existing.avgThroughputTps;

  providerMap.set(providerKey, {
    providerName: existing.providerName,
    requestCount,
    successCount,
    failureCount,
    errorRatePct: Number(((failureCount / requestCount) * 100).toFixed(2)),
    avgLatencyMs: Number(nextLatency.toFixed(2)),
    avgThroughputTps: Number(nextThroughput.toFixed(2)),
    uptimePct: Number(((successCount / requestCount) * 100).toFixed(2)),
    lastUpdatedAt: event.timestamp,
  });
}

redisSubscriber.subscribe("provider_metrics", (err) => {
  if (err) {
    console.error("Failed to subscribe to provider metrics channel:", err);
  }
});

redisSubscriber.on("message", (channel, message) => {
  if (channel !== "provider_metrics") return;

  try {
    const event = JSON.parse(message) as ProviderMetricEvent;
    upsertProviderMetric(event);
  } catch (err) {
    console.error("Failed to parse provider metric message:", err);
  }
});

export function getObservedProviderMetric(modelSlug: string, providerName: string) {
  const providerMap = providerMetrics.get(normalizeKey(modelSlug));
  if (!providerMap) return null;

  return providerMap.get(normalizeKey(providerName)) ?? null;
}

export function getObservedProviderMetrics(modelSlug: string) {
  const providerMap = providerMetrics.get(normalizeKey(modelSlug));
  if (!providerMap) return [];

  return Array.from(providerMap.values()).sort((a, b) => b.requestCount - a.requestCount);
}

export async function publishProfileUpdate(userId: number) {
  try {
    console.log(`[Redis] api-backend publishing profile_updates for user: ${userId}`);
    await redis.publish("profile_updates", JSON.stringify({ userId }));
  } catch (err) {
    console.error("Failed to publish profile update to Redis:", err);
  }
}

export async function publishProviderMetric(event: ProviderMetricEvent) {
  try {
    await redis.publish("provider_metrics", JSON.stringify(event));
  } catch (err) {
    console.error("Failed to publish provider metric to Redis:", err);
  }
}
