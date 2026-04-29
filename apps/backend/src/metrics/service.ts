import { globalEmitter } from "../lib/redis";
import { Counter, Gauge, Histogram, Registry } from "prom-client";
import pg from "pg";

type ProviderMetricEvent = {
  modelSlug: string;
  providerName: string;
  latencyMs: number;
  throughputTps: number;
  success: boolean;
  timestamp: string;
};

type ProviderMetricAggregate = {
  providerName: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  errorRatePct: number;
  avgLatencyMs: number;
  avgThroughputTps: number;
  uptimePct: number;
  lastUpdatedAt: string;
};

type ProviderMetricSeriesPoint = {
  timestamp: string;
  requestCount: number;
  errorRatePct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgThroughputTps: number;
  uptimePct: number;
  e2eLatencyMs: number;
  p95E2eLatencyMs: number;
};

type ProviderMetricSeries = {
  providerName: string;
  points: ProviderMetricSeriesPoint[];
};

const modelProviderMetrics = new Map<string, Map<string, ProviderMetricAggregate>>();
let listenerInitialized = false;
let timescaleInitialized = false;
let timescaleAvailable = false;

const metricsDbUrl = process.env.METRICS_DATABASE_URL || process.env.DATABASE_URL;
const metricsPool = metricsDbUrl
  ? new pg.Pool({
      connectionString: metricsDbUrl,
    })
  : null;

const promRegistry = new Registry();

const requestCounter = new Counter({
  name: "routeforge_provider_requests_total",
  help: "Total provider requests seen by RouteForge",
  labelNames: ["model", "provider", "status"] as const,
  registers: [promRegistry],
});

const latencyHistogram = new Histogram({
  name: "routeforge_provider_latency_ms",
  help: "Provider request latency in milliseconds",
  labelNames: ["model", "provider"] as const,
  buckets: [100, 250, 500, 1000, 2000, 4000, 8000, 16000],
  registers: [promRegistry],
});

const throughputGauge = new Gauge({
  name: "routeforge_provider_throughput_tps",
  help: "Latest observed provider throughput in tokens/sec",
  labelNames: ["model", "provider"] as const,
  registers: [promRegistry],
});

const uptimeGauge = new Gauge({
  name: "routeforge_provider_uptime_pct",
  help: "Computed provider uptime percentage based on observed requests",
  labelNames: ["model", "provider"] as const,
  registers: [promRegistry],
});

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

async function initTimescale() {
  if (!metricsPool || timescaleInitialized) return;

  timescaleInitialized = true;

  try {
    await metricsPool.query(`
      CREATE TABLE IF NOT EXISTS provider_metrics (
        time TIMESTAMPTZ NOT NULL,
        model_slug TEXT NOT NULL,
        provider_name TEXT NOT NULL,
        latency_ms DOUBLE PRECISION NOT NULL,
        throughput_tps DOUBLE PRECISION NOT NULL,
        success BOOLEAN NOT NULL
      );
    `);

    try {
      await metricsPool.query("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;");
      await metricsPool.query(
        "SELECT create_hypertable('provider_metrics', 'time', if_not_exists => TRUE);",
      );
    } catch (err) {
      console.warn("TimescaleDB extension unavailable; using regular PostgreSQL table for metrics.");
    }

    timescaleAvailable = true;
  } catch (err) {
    timescaleAvailable = false;
    console.error("Failed to initialize provider metrics storage:", err);
  }
}

async function persistMetricEvent(event: ProviderMetricEvent) {
  if (!metricsPool) return;

  if (!timescaleInitialized) {
    await initTimescale();
  }

  if (!timescaleAvailable) return;

  try {
    await metricsPool.query(
      `
      INSERT INTO provider_metrics (time, model_slug, provider_name, latency_ms, throughput_tps, success)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        event.timestamp,
        event.modelSlug,
        event.providerName,
        event.latencyMs,
        event.throughputTps,
        event.success,
      ],
    );
  } catch (err) {
    console.error("Failed to persist provider metric:", err);
  }
}

function updatePrometheus(event: ProviderMetricEvent, aggregate: ProviderMetricAggregate) {
  const model = event.modelSlug;
  const provider = event.providerName;
  const status = event.success ? "success" : "failure";

  requestCounter.inc({ model, provider, status });
  latencyHistogram.observe({ model, provider }, Math.max(event.latencyMs, 0));
  throughputGauge.set({ model, provider }, Math.max(event.throughputTps, 0));
  uptimeGauge.set({ model, provider }, aggregate.uptimePct);
}

function upsertProviderMetric(event: ProviderMetricEvent) {
  if (!event.modelSlug || !event.providerName) return;

  const modelKey = event.modelSlug;
  const providerKey = normalizeKey(event.providerName);

  let providerMap = modelProviderMetrics.get(modelKey);
  if (!providerMap) {
    providerMap = new Map<string, ProviderMetricAggregate>();
    modelProviderMetrics.set(modelKey, providerMap);
  }

  const existing = providerMap.get(providerKey);

  if (!existing) {
    const requestCount = 1;
    const successCount = event.success ? 1 : 0;
    const failureCount = event.success ? 0 : 1;

    const aggregate = {
      providerName: event.providerName,
      requestCount,
      successCount,
      failureCount,
      errorRatePct: Number(((failureCount / requestCount) * 100).toFixed(2)),
      avgLatencyMs: event.success ? Number(event.latencyMs.toFixed(2)) : 0,
      avgThroughputTps: event.success ? Number(event.throughputTps.toFixed(2)) : 0,
      uptimePct: Number(((successCount / requestCount) * 100).toFixed(2)),
      lastUpdatedAt: event.timestamp,
    } satisfies ProviderMetricAggregate;

    providerMap.set(providerKey, aggregate);
    updatePrometheus(event, aggregate);

    return;
  }

  const requestCount = existing.requestCount + 1;
  const successCount = existing.successCount + (event.success ? 1 : 0);
  const failureCount = existing.failureCount + (event.success ? 0 : 1);

  const nextLatency =
    event.success && successCount > 0
      ? (existing.avgLatencyMs * existing.successCount + event.latencyMs) / successCount
      : existing.avgLatencyMs;

  const nextThroughput =
    event.success && successCount > 0
      ? (existing.avgThroughputTps * existing.successCount + event.throughputTps) / successCount
      : existing.avgThroughputTps;

  const aggregate = {
    providerName: existing.providerName,
    requestCount,
    successCount,
    failureCount,
    errorRatePct: Number(((failureCount / requestCount) * 100).toFixed(2)),
    avgLatencyMs: Number(nextLatency.toFixed(2)),
    avgThroughputTps: Number(nextThroughput.toFixed(2)),
    uptimePct: Number(((successCount / requestCount) * 100).toFixed(2)),
    lastUpdatedAt: event.timestamp,
  } satisfies ProviderMetricAggregate;

  providerMap.set(providerKey, aggregate);
  updatePrometheus(event, aggregate);
}

function ensureListener() {
  if (listenerInitialized) return;

  globalEmitter.on("provider_metric", async (event: ProviderMetricEvent) => {
    upsertProviderMetric(event);
    await persistMetricEvent(event);
  });

  listenerInitialized = true;
}

ensureListener();

export abstract class MetricsService {
  static async getModelProviderMetrics(modelSlug: string) {
    if (metricsPool) {
      if (!timescaleInitialized) {
        await initTimescale();
      }

      if (timescaleAvailable) {
        try {
          const result = await metricsPool.query<{
            provider_name: string;
            request_count: string;
            success_count: string;
            failure_count: string;
            avg_latency_ms: string;
            avg_throughput_tps: string;
            last_updated_at: string;
          }>(
            `
            SELECT
              provider_name,
              COUNT(*)::text AS request_count,
              SUM(CASE WHEN success THEN 1 ELSE 0 END)::text AS success_count,
              SUM(CASE WHEN success THEN 0 ELSE 1 END)::text AS failure_count,
              COALESCE(AVG(CASE WHEN success THEN latency_ms END), 0)::text AS avg_latency_ms,
              COALESCE(AVG(CASE WHEN success THEN throughput_tps END), 0)::text AS avg_throughput_tps,
              MAX(time)::text AS last_updated_at
            FROM provider_metrics
            WHERE model_slug = $1
            GROUP BY provider_name
            ORDER BY COUNT(*) DESC
            `,
            [modelSlug],
          );

          return result.rows.map((row) => {
            const requestCount = Number(row.request_count);
            const successCount = Number(row.success_count);
            const failureCount = Number(row.failure_count);

            return {
              providerName: row.provider_name,
              requestCount,
              successCount,
              failureCount,
              errorRatePct: Number(((failureCount / Math.max(requestCount, 1)) * 100).toFixed(2)),
              avgLatencyMs: Number(Number(row.avg_latency_ms).toFixed(2)),
              avgThroughputTps: Number(Number(row.avg_throughput_tps).toFixed(2)),
              uptimePct: Number(((successCount / Math.max(requestCount, 1)) * 100).toFixed(2)),
              lastUpdatedAt: row.last_updated_at,
            };
          });
        } catch (err) {
          console.error("Failed to query provider metrics from storage:", err);
        }
      }
    }

    const providerMap = modelProviderMetrics.get(modelSlug);
    if (!providerMap) return [];

    return Array.from(providerMap.values()).sort((a, b) => b.requestCount - a.requestCount);
  }

  static async getPrometheusMetrics() {
    return promRegistry.metrics();
  }

  static async getModelProviderMetricTimeseries(
    modelSlug: string,
    windowHours = 24,
    bucketMinutes = 30,
  ): Promise<ProviderMetricSeries[]> {
    const boundedWindowHours = Math.min(Math.max(Math.floor(windowHours), 1), 168);
    const boundedBucketMinutes = Math.min(Math.max(Math.floor(bucketMinutes), 1), 120);

    if (metricsPool) {
      if (!timescaleInitialized) {
        await initTimescale();
      }

      if (timescaleAvailable) {
        try {
          const bucketSeconds = boundedBucketMinutes * 60;
          const result = await metricsPool.query<{
            provider_name: string;
            bucket_time: string;
            request_count: string;
            success_count: string;
            failure_count: string;
            avg_latency_ms: string;
            p95_latency_ms: string;
            avg_throughput_tps: string;
          }>(
            `
            SELECT
              provider_name,
              to_timestamp(floor(extract(epoch FROM time) / $2::numeric) * $2::numeric)::timestamptz AS bucket_time,
              COUNT(*)::text AS request_count,
              SUM(CASE WHEN success THEN 1 ELSE 0 END)::text AS success_count,
              SUM(CASE WHEN success THEN 0 ELSE 1 END)::text AS failure_count,
              COALESCE(AVG(CASE WHEN success THEN latency_ms END), 0)::text AS avg_latency_ms,
              COALESCE(
                PERCENTILE_CONT(0.95) WITHIN GROUP (
                  ORDER BY CASE WHEN success THEN latency_ms END
                ),
                0
              )::text AS p95_latency_ms,
              COALESCE(AVG(CASE WHEN success THEN throughput_tps END), 0)::text AS avg_throughput_tps
            FROM provider_metrics
            WHERE model_slug = $1
              AND time >= NOW() - ($3::text || ' hours')::interval
            GROUP BY provider_name, bucket_time
            ORDER BY bucket_time ASC, provider_name ASC
            `,
            [modelSlug, bucketSeconds, boundedWindowHours],
          );

          const byProvider = new Map<string, ProviderMetricSeriesPoint[]>();

          for (const row of result.rows) {
            const requestCount = Number(row.request_count);
            const successCount = Number(row.success_count);
            const failureCount = Number(row.failure_count);
            const uptimePct = Number(
              ((successCount / Math.max(requestCount, 1)) * 100).toFixed(2),
            );
            const avgLatencyMs = Number(Number(row.avg_latency_ms).toFixed(2));
            const p95LatencyMs = Number(Number(row.p95_latency_ms).toFixed(2));
            const avgThroughputTps = Number(Number(row.avg_throughput_tps).toFixed(2));
            const e2eLatencyMs = Number(
              (avgLatencyMs / Math.max(uptimePct / 100, 0.01)).toFixed(2),
            );
            const p95E2eLatencyMs = Number(
              (p95LatencyMs / Math.max(uptimePct / 100, 0.01)).toFixed(2),
            );

            const nextPoint: ProviderMetricSeriesPoint = {
              timestamp: new Date(row.bucket_time).toISOString(),
              requestCount,
              errorRatePct: Number(
                ((failureCount / Math.max(requestCount, 1)) * 100).toFixed(2),
              ),
              avgLatencyMs,
              p95LatencyMs,
              avgThroughputTps,
              uptimePct,
              e2eLatencyMs,
              p95E2eLatencyMs,
            };

            const points = byProvider.get(row.provider_name) ?? [];
            points.push(nextPoint);
            byProvider.set(row.provider_name, points);
          }

          return Array.from(byProvider.entries()).map(([providerName, points]) => ({
            providerName,
            points,
          }));
        } catch (err) {
          console.error("Failed to query provider metric timeseries from storage:", err);
        }
      }
    }

    const providerMap = modelProviderMetrics.get(modelSlug);
    if (!providerMap) return [];

    return Array.from(providerMap.values())
      .sort((a, b) => b.requestCount - a.requestCount)
      .map((row) => {
        const e2eLatencyMs = Number(
          (row.avgLatencyMs / Math.max(row.uptimePct / 100, 0.01)).toFixed(2),
        );
        return {
          providerName: row.providerName,
          points: [
            {
              timestamp: row.lastUpdatedAt,
              requestCount: row.requestCount,
              errorRatePct: row.errorRatePct,
              avgLatencyMs: row.avgLatencyMs,
              p95LatencyMs: row.avgLatencyMs,
              avgThroughputTps: row.avgThroughputTps,
              uptimePct: row.uptimePct,
              e2eLatencyMs,
              p95E2eLatencyMs: e2eLatencyMs,
            },
          ],
        };
      });
  }

  static getPrometheusContentType() {
    return promRegistry.contentType;
  }
}
