import Elysia from "elysia";
import { MetricsModel } from "./models";
import { MetricsService } from "./service";

export const metricsRoutes = new Elysia({ prefix: "/metrics" })
  .get("/prometheus", async () => {
    const body = await MetricsService.getPrometheusMetrics();

    return new Response(body, {
      headers: {
        "Content-Type": MetricsService.getPrometheusContentType(),
      },
    });
  })
  .get(
    "/models/:slug/providers",
    async ({ params: { slug } }) => {
      const providers = await MetricsService.getModelProviderMetrics(slug);
      return {
        modelSlug: slug,
        providers,
      };
    },
    {
      response: {
        200: MetricsModel.getModelProviderMetricsResponseSchema,
      },
    },
  )
  .get(
    "/models/:slug/timeseries",
    async ({ params: { slug }, query }) => {
      const windowHours = query.windowHours ?? 24;
      const bucketMinutes = query.bucketMinutes ?? 30;
      const providers = await MetricsService.getModelProviderMetricTimeseries(
        slug,
        windowHours,
        bucketMinutes,
      );

      return {
        modelSlug: slug,
        windowHours,
        bucketMinutes,
        providers,
      };
    },
    {
      query: MetricsModel.getModelProviderTimeseriesQuerySchema,
      response: {
        200: MetricsModel.getModelProviderTimeseriesResponseSchema,
      },
    },
  );
