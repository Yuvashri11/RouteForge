import Elysia from "elysia";
import { ChatModel } from "./models";
import { ChatService, ApiKeyError, ModelNotFoundError } from "./service";

export const chatRoutes = new Elysia({ prefix: "/api/v1/chat" })
  .resolve(({ headers, status }) => {
    const apiKey = headers["x-api-key"];

    if (!apiKey) {
      return status(401, { message: "Missing x-api-key header" });
    }

    return { apiKey };
  })
  .post(
    "/completions",
    async ({ apiKey, body, status }) => {
      try {
        // If stream flag is set, return SSE
        if (body.stream) {
          const stream = ChatService.streamComplete(
            apiKey,
            body.model,
            body.messages
          );

          const encoder = new TextEncoder();

          const readable = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of stream) {
                  if (chunk.type === "delta") {
                    const data = JSON.stringify({
                      choices: [
                        {
                          delta: { content: chunk.content },
                          index: 0,
                        },
                      ],
                    });
                    controller.enqueue(
                      encoder.encode(`data: ${data}\n\n`)
                    );
                  } else if (chunk.type === "done") {
                    const data = JSON.stringify({
                      choices: [{ delta: {}, finish_reason: "stop", index: 0 }],
                      usage: {
                        prompt_tokens: chunk.inputTokens,
                        completion_tokens: chunk.outputTokens,
                      },
                    });
                    controller.enqueue(
                      encoder.encode(`data: ${data}\n\n`)
                    );
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  }
                }
              } catch (err) {
                const errorData = JSON.stringify({
                  error: {
                    message:
                      err instanceof Error ? err.message : "Stream error",
                  },
                });
                controller.enqueue(
                  encoder.encode(`data: ${errorData}\n\n`)
                );
              } finally {
                controller.close();
              }
            },
          });

          return new Response(readable, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }

        // Non-streaming path
        const result = await ChatService.complete(
          apiKey,
          body.model,
          body.messages
        );

        return {
          content: result.content,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
      } catch (e) {
        if (e instanceof ApiKeyError) {
          return status(401, { message: e.message });
        }

        if (e instanceof ModelNotFoundError) {
          return status(400, { message: e.message });
        }

        console.error("Chat completion error:", e);
        return status(500, { message: "Internal server error" });
      }
    },
    {
      body: ChatModel.chatCompletionBodySchema,
    }
  );
