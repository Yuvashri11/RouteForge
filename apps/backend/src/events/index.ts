import { Elysia } from "elysia";
import { globalEmitter } from "../lib/redis";

import jwt from "@elysiajs/jwt";

export const events = new Elysia({ prefix: "/events" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    })
  )
  .get("/", async ({ jwt, cookie: { auth }, request, status }) => {
    // Authenticate user
    if (!auth?.value) {
      return status(401, { message: "Unauthorized" });
    }

    const profile = (await jwt.verify(auth.value as string)) as
      | { userId?: string | number }
      | false
      | null;

    if (!profile || !profile.userId) {
      return status(401, { message: "Unauthorized" });
    }

    const userId = Number(profile.userId);

    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        console.log(`[SSE] New stream connection established for user: ${userId}`);

        const send = (chunk: string) => {
          controller.enqueue(encoder.encode(`${chunk}\n\n`));
        };

        const heartbeat = setInterval(() => {
          send(": keepalive");
        }, 15000);

        const onProfileUpdate = (data: { userId: number }) => {
          console.log(`[SSE] Received profile_updated from Redis for user: ${data.userId}. Current stream user: ${userId}`);
          if (data.userId === userId) {
            console.log(`[SSE] Sending event to browser for user: ${userId}`);
            send("event: profile_updated\ndata: updated");
          }
        };

        globalEmitter.on("profile_updated", onProfileUpdate);

        request.signal.addEventListener("abort", () => {
          console.log(`[SSE] Connection closed for user: ${userId}`);
          clearInterval(heartbeat);
          globalEmitter.off("profile_updated", onProfileUpdate);
          controller.close();
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  });
