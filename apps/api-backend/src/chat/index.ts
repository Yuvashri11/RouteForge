import Elysia from "elysia";
import { ChatModel } from "./models";
import { ChatService, ApiKeyError, ModelNotFoundError } from "./service";

type SafeErrorPayload = {
  status: number;
  code: string;
  type: string;
  message: string;
};

function sanitizeSensitiveText(value: string) {
  return value
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, "[REDACTED_KEY]")
    .replace(/api[_-]?key\s*[:=]\s*[^\s,;]+/gi, "api_key=[REDACTED]")
    .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/token\s*[:=]\s*[^\s,;]+/gi, "token=[REDACTED]");
}

function getErrorMeta(err: unknown) {
  const raw = (err ?? {}) as {
    status?: unknown;
    code?: unknown;
    type?: unknown;
    name?: unknown;
    message?: unknown;
  };

  return {
    status: typeof raw.status === "number" ? raw.status : undefined,
    code: typeof raw.code === "string" ? raw.code : undefined,
    type: typeof raw.type === "string" ? raw.type : undefined,
    name: typeof raw.name === "string" ? raw.name : undefined,
    message:
      err instanceof Error
        ? err.message
        : typeof raw.message === "string"
          ? raw.message
          : "Internal server error",
  };
}

function toSafeErrorPayload(err: unknown): SafeErrorPayload {
  if (err instanceof ApiKeyError) {
    return {
      status: 401,
      code: "invalid_api_key",
      type: "auth_error",
      message: "Authentication failed.",
    };
  }

  if (err instanceof ModelNotFoundError) {
    return {
      status: 400,
      code: "model_not_found",
      type: "invalid_request_error",
      message: "Requested model is not available.",
    };
  }

  const meta = getErrorMeta(err);
  const message = sanitizeSensitiveText(meta.message).toLowerCase();

  if (
    meta.status === 429 ||
    meta.code === "rate_limit_exceeded" ||
    meta.type?.includes("rate") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return {
      status: 429,
      code: "rate_limit_exceeded",
      type: "rate_limit_error",
      message: "Provider rate limit exceeded. Please retry shortly.",
    };
  }

  if (
    meta.status === 401 ||
    meta.status === 403 ||
    meta.code === "invalid_api_key" ||
    meta.type?.includes("auth") ||
    message.includes("invalid api key") ||
    message.includes("incorrect api key") ||
    message.includes("api key provided") ||
    message.includes("unauthorized") ||
    message.includes("authentication")
  ) {
    return {
      status: 401,
      code: "auth_failed",
      type: "auth_error",
      message: "Authentication failed.",
    };
  }

  if (
    meta.status === 408 ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return {
      status: 504,
      code: "upstream_timeout",
      type: "timeout_error",
      message: "Upstream model timed out.",
    };
  }

  return {
    status: 500,
    code: "internal_error",
    type: "internal_server_error",
    message: "Unable to complete request.",
  };
}

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
                const safeError = toSafeErrorPayload(err);
                const errorData = JSON.stringify({
                  error: {
                    message: safeError.message,
                    code: safeError.code,
                    type: safeError.type,
                    status: safeError.status,
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
        const safeError = toSafeErrorPayload(e);
        const meta = getErrorMeta(e);
        console.error("Chat completion error:", {
          status: safeError.status,
          code: safeError.code,
          type: safeError.type,
          message: safeError.message,
          sourceName: meta.name,
          sourceMessage: sanitizeSensitiveText(meta.message),
        });

        return status(safeError.status, {
          message: safeError.message,
          code: safeError.code,
          type: safeError.type,
        });
      }
    },
    {
      body: ChatModel.chatCompletionBodySchema,
    }
  );
