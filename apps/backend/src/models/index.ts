import Elysia from "elysia";
import { ModelsModel } from "./models";
import { ModelsService } from "./service";

export const modelRoutes = new Elysia({ prefix: "/models" })
  .get(
    "/",
    async () => {
      const models = await ModelsService.getModels();
      return { models };
    },
    {
      response: {
        200: ModelsModel.getModelsResponseSchema,
      },
    }
  )
  .get(
    "/providers",
    async () => {
      const providers = await ModelsService.getProviders();
      return { providers };
    },
    {
      response: {
        200: ModelsModel.getProvidersResponseSchema,
      },
    }
  )
  .get(
    "/:id/providers",
    async ({ params: { id }, status }) => {
      const providers = await ModelsService.getModelProviders(Number(id));
      if (!providers.length) {
        return status(404, {
          message: "No providers found for this model",
        });
      }
      return { providers };
    },
    {
      response: {
        200: ModelsModel.getModelProvidersResponseSchema,
        404: ModelsModel.notFoundResponseSchema,
      },
    }
  );
