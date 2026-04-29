import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
export const redis = new Redis(redisUrl);

export type ProviderMetricEvent = {
  modelSlug: string;
  providerName: string;
  latencyMs: number;
  throughputTps: number;
  success: boolean;
  timestamp: string;
};

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
