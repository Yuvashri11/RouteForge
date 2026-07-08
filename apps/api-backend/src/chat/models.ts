import { t } from "elysia";

const providerRoutingSchema = t.Object({
  order: t.Optional(t.Array(t.String({ minLength: 1 }), { minItems: 1 })),
  allowFallbacks: t.Optional(t.Boolean()),
  sort: t.Optional(
    t.Union([
      t.Literal("price"),
      t.Literal("throughput"),
      t.Literal("latency"),
      t.Object({
        by: t.Union([
          t.Literal("price"),
          t.Literal("throughput"),
          t.Literal("latency"),
        ]),
        partition: t.Optional(t.Union([t.Literal("model"), t.Literal("none")])),
      }),
    ]),
  ),
  only: t.Optional(t.Array(t.String({ minLength: 1 }), { minItems: 1 })),
  ignore: t.Optional(t.Array(t.String({ minLength: 1 }), { minItems: 1 })),
  maxPrice: t.Optional(
    t.Object({
      prompt: t.Optional(t.Number()),
      completion: t.Optional(t.Number()),
    }),
  ),
  preferredMinThroughput: t.Optional(t.Number()),
  preferredMaxLatency: t.Optional(t.Number()),
});

export const ChatModel = {
  providerRoutingSchema,

  chatCompletionBodySchema: t.Object({
    messages: t.Array(
      t.Object({
        role: t.Union([t.Literal("user"), t.Literal("assistant"), t.Literal("system")]),
        content: t.String({ minLength: 1 }),
      }),
      { minItems: 1 }
    ),
    model: t.String({ minLength: 1 }),
    models: t.Optional(t.Array(t.String({ minLength: 1 }), { minItems: 1 })),
    stream: t.Optional(t.Boolean()),
    provider: t.Optional(providerRoutingSchema),
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
