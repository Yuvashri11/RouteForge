import { t } from "elysia";

export const ModelsModel = {
  getModelsResponseSchema: t.Object({
    models: t.Array(
      t.Object({
        id: t.String(),
        name: t.String(),
        slug: t.String(),
        company: t.Object({
          id: t.String(),
          name: t.String(),
          website: t.String(),
        }),
      })
    ),
  }),

  getProvidersResponseSchema: t.Object({
    providers: t.Array(
      t.Object({
        id: t.String(),
        name: t.String(),
        website: t.String(),
      })
    ),
  }),

  getModelProvidersResponseSchema: t.Object({
    providers: t.Array(
      t.Object({
        id: t.String(),
        providerId: t.String(),
        providerName: t.String(),
        providerWebsite: t.String(),
        inputTokenCost: t.Number(),
        outputTokenCost: t.Number(),
      })
    ),
  }),

  notFoundResponseSchema: t.Object({
    message: t.String(),
  }),
};
