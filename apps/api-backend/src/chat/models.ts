import { t } from "elysia";

export const ChatModel = {
  chatCompletionBodySchema: t.Object({
    messages: t.Array(
      t.Object({
        role: t.Union([t.Literal("user"), t.Literal("assistant"), t.Literal("system")]),
        content: t.String({ minLength: 1 }),
      }),
      { minItems: 1 }
    ),
    model: t.String({ minLength: 1 }),
    stream: t.Optional(t.Boolean()),
  }),

  chatCompletionResponseSchema: t.Object({
    content: t.String(),
    model: t.String(),
    inputTokens: t.Number(),
    outputTokens: t.Number(),
  }),

  unauthorizedResponseSchema: t.Object({
    message: t.String(),
  }),

  badRequestResponseSchema: t.Object({
    message: t.String(),
  }),

  errorResponseSchema: t.Object({
    message: t.String(),
  }),
};
