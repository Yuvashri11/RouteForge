import { t } from "elysia";

export const MetricsModel = {
  providerMetricSchema: t.Object({
    providerName: t.String(),
    requestCount: t.Number(),
    successCount: t.Number(),
    failureCount: t.Number(),
    errorRatePct: t.Number(),
    avgLatencyMs: t.Number(),
    avgThroughputTps: t.Number(),
    uptimePct: t.Number(),
    lastUpdatedAt: t.String(),
  }),

  getModelProviderMetricsResponseSchema: t.Object({
    modelSlug: t.String(),
    providers: t.Array(
      t.Object({
        providerName: t.String(),
        requestCount: t.Number(),
        successCount: t.Number(),
        failureCount: t.Number(),
        errorRatePct: t.Number(),
        avgLatencyMs: t.Number(),
        avgThroughputTps: t.Number(),
        uptimePct: t.Number(),
        lastUpdatedAt: t.String(),
      }),
    ),
  }),

  metricSeriesPointSchema: t.Object({
    timestamp: t.String(),
    requestCount: t.Number(),
    errorRatePct: t.Number(),
    avgLatencyMs: t.Number(),
    p95LatencyMs: t.Number(),
    avgThroughputTps: t.Number(),
    uptimePct: t.Number(),
    e2eLatencyMs: t.Number(),
    p95E2eLatencyMs: t.Number(),
  }),

  getModelProviderTimeseriesQuerySchema: t.Object({
    windowHours: t.Optional(t.Number({ minimum: 1, maximum: 168 })),
    bucketMinutes: t.Optional(t.Number({ minimum: 1, maximum: 120 })),
  }),

  getModelProviderTimeseriesResponseSchema: t.Object({
    modelSlug: t.String(),
    windowHours: t.Number(),
    bucketMinutes: t.Number(),
    providers: t.Array(
      t.Object({
        providerName: t.String(),
        points: t.Array(
          t.Object({
            timestamp: t.String(),
            requestCount: t.Number(),
            errorRatePct: t.Number(),
            avgLatencyMs: t.Number(),
            p95LatencyMs: t.Number(),
            avgThroughputTps: t.Number(),
            uptimePct: t.Number(),
            e2eLatencyMs: t.Number(),
            p95E2eLatencyMs: t.Number(),
          }),
        ),
      }),
    ),
  }),
};
