import { t } from "elysia";

export const ApiKeyModel = {
  createApiKeySchema: t.Object({
    name: t.String({ minLength: 1 }),
  }),

  createApiKeyReponse: t.Object({
    id: t.Number(),
    apiKey: t.String(),
  }),

  getApiKeysResponseSchema: t.Object({
    apiKeys: t.Array(
      t.Object({
        id: t.Number(),
        name: t.String(),
        apiKey: t.String(),
        disabled: t.Boolean(),
        lastUsed: t.Nullable(t.Date()),
        creditsConsumed: t.Number(),
      })
    ),
  }),

  updateApiKeySchema: t.Object({
    id: t.Number(),
    disabled: t.Boolean(),
  }),

  updateApiKeyResponseSchema: t.Object({
    message: t.String(),
  }),

  disableApiKeyResponseFailedSchema: t.Object({
    message: t.String(),
  }),

  deleteApiKeyResponseSchema: t.Object({
    message: t.String(),
  }),

  deleteApiKeyResponseFailedSchema: t.Object({
    message: t.String(),
  }),
};
