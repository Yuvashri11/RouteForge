import Redis from "ioredis";
import { EventEmitter } from "node:events";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

function attachRedisHandlers(client: Redis, name: string) {
  client.on("error", (err) => console.error(`[ioredis][${name}] error:`, err));
  client.on("connect", () => console.log(`[ioredis][${name}] connect`));
  client.on("ready", () => console.log(`[ioredis][${name}] ready`));
  client.on("close", () => console.log(`[ioredis][${name}] close`));
  client.on("reconnecting", () => console.log(`[ioredis][${name}] reconnecting`));
  client.on("end", () => console.log(`[ioredis][${name}] end`));
}

// Subscriber client for listening to messages
export const redisSubscriber = new Redis(redisUrl);
attachRedisHandlers(redisSubscriber, "subscriber");
// Publisher client for local publishes
export const redisPublisher = new Redis(redisUrl);
attachRedisHandlers(redisPublisher, "publisher");

// Internal event emitter to bridge Redis messages to Elysia Stream
export const globalEmitter = new EventEmitter();

// Subscribe to the necessary channels
redisSubscriber.subscribe("profile_updates", "provider_metrics", (err, count) => {
  if (err) {
    console.error("Failed to subscribe to Redis:", err);
  }
});

redisSubscriber.on("message", (channel, message) => {
  if (channel === "profile_updates") {
    try {
      const data = JSON.parse(message);
      // Emit locally to our SSE endpoints
      globalEmitter.emit("profile_updated", data);
    } catch (e) {
      console.error("Failed to parse Redis message:", e);
    }
    return;
  }

  if (channel === "provider_metrics") {
    try {
      const data = JSON.parse(message);
      globalEmitter.emit("provider_metric", data);
    } catch (e) {
      console.error("Failed to parse provider metric message:", e);
    }
  }
});

// Helper for local modules to publish updates (e.g. adding credits)
export async function publishProfileUpdate(userId: number) {
  try {
    await redisPublisher.publish("profile_updates", JSON.stringify({ userId }));
  } catch (err) {
    console.error("Failed to publish profile update to Redis:", err);
  }
}
