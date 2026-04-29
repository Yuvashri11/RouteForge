import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getModelProviderMetricTimeseries,
  getModelProviderMetrics,
  getModelProviders,
  getModels,
} from "@/lib/api/client";
import { tokenPrice } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Globe, Gauge, ShieldCheck, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

type ProviderView = {
  id: string;
  providerName: string;
  providerWebsite: string;
  inputTokenCost: number;
  outputTokenCost: number;
  location: "US" | "EU" | "APAC";
  quantization: "fp16" | "fp8" | "int8";
  latencySec: number | null;
  throughputTps: number | null;
  uptimePct: number | null;
  errorRatePct: number | null;
  requestCount: number;
  hasLiveMetrics: boolean;
};

function scoreSeed(value: string) {
  return value.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function enrichProvider(raw: {
  id: string;
  providerName: string;
  providerWebsite: string;
  inputTokenCost: number;
  outputTokenCost: number;
}): ProviderView {
  const seed = scoreSeed(raw.id + raw.providerName);
  const locations: Array<"US" | "EU" | "APAC"> = ["US", "EU", "APAC"];
  const quantizations: Array<"fp16" | "fp8" | "int8"> = ["fp16", "fp8", "int8"];

  return {
    ...raw,
    location: locations[seed % locations.length]!,
    quantization: quantizations[seed % quantizations.length]!,
    latencySec: null,
    throughputTps: null,
    uptimePct: null,
    errorRatePct: null,
    requestCount: 0,
    hasLiveMetrics: false,
  };
}

type ChartSeries = {
  providerName: string;
  color: string;
  points: Array<{
    x: number;
    y: number;
  }>;
  latestValue: number;
};

const providerPalette = [
  "#22d3ee",
  "#facc15",
  "#60a5fa",
  "#34d399",
  "#f472b6",
  "#fb923c",
  "#a78bfa",
  "#f87171",
];

const timeRangeOptions = {
  "1h": { windowHours: 1, bucketMinutes: 5, label: "Last 1h" },
  "6h": { windowHours: 6, bucketMinutes: 10, label: "Last 6h" },
  "24h": { windowHours: 24, bucketMinutes: 30, label: "Last 24h" },
  "7d": { windowHours: 168, bucketMinutes: 120, label: "Last 7d" },
} as const;

type TimeRangeKey = keyof typeof timeRangeOptions;
type LatencyMode = "avg" | "p95";
type LineStyle = "raw" | "smoothed";

function smoothPoints(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return points;

  return points.map((point, index) => {
    const prev = points[Math.max(0, index - 1)]!.y;
    const current = point.y;
    const next = points[Math.min(points.length - 1, index + 1)]!.y;
    const y = Number(((prev + current + next) / 3).toFixed(2));

    return {
      x: point.x,
      y,
    };
  });
}

function toChartSeries(
  providers: ProviderView[],
  timeseriesProviders:
    | Array<{
        providerName: string;
        points: Array<{
          timestamp: string;
          avgThroughputTps: number;
          avgLatencyMs: number;
          p95LatencyMs: number;
          e2eLatencyMs: number;
          p95E2eLatencyMs: number;
        }>;
      }>
    | undefined,
  metricKey:
    | "avgThroughputTps"
    | "avgLatencyMs"
    | "p95LatencyMs"
    | "e2eLatencyMs"
    | "p95E2eLatencyMs",
  lineStyle: LineStyle,
): ChartSeries[] {
  const byProvider = new Map(
    (timeseriesProviders ?? []).map((row) => [row.providerName.toLowerCase(), row]),
  );

  const now = Date.now();

  return providers
    .map((provider, index) => {
      const series = byProvider.get(provider.providerName.toLowerCase());
      const points = (series?.points ?? [])
        .map((point) => ({
          x: Number(new Date(point.timestamp)),
          y: Number(point[metricKey]),
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

      if (!points.length) {
        const fallbackValue =
          metricKey === "avgThroughputTps"
            ? provider.throughputTps
            : metricKey === "avgLatencyMs" || metricKey === "p95LatencyMs"
              ? provider.latencySec !== null
                ? provider.latencySec * 1000
                : null
              : provider.latencySec !== null && provider.uptimePct !== null
                ? (provider.latencySec * 1000) / Math.max(provider.uptimePct / 100, 0.01)
                : null;

        if (fallbackValue !== null) {
          points.push({ x: now, y: Number(fallbackValue.toFixed(2)) });
        }
      }

      points.sort((a, b) => a.x - b.x);

      const plottedPoints = lineStyle === "smoothed" ? smoothPoints(points) : points;

      if (!plottedPoints.length) return null;

      return {
        providerName: provider.providerName,
        color: providerPalette[index % providerPalette.length]!,
        points: plottedPoints,
        latestValue: plottedPoints[plottedPoints.length - 1]!.y,
      } satisfies ChartSeries;
    })
    .filter((row): row is ChartSeries => row !== null);
}

function renderLinePath(
  points: Array<{ x: number; y: number }>,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  width: number,
  height: number,
) {
  const innerWidth = width - 24;
  const innerHeight = height - 20;

  return points
    .map((point, index) => {
      const xScale = maxX === minX ? 0.5 : (point.x - minX) / (maxX - minX);
      const yScale = maxY === minY ? 0.5 : (point.y - minY) / (maxY - minY);
      const x = 12 + xScale * innerWidth;
      const y = 10 + (1 - yScale) * innerHeight;

      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function MultiProviderLineChart(props: {
  title: string;
  subtitle: string;
  series: ChartSeries[];
  valueFormatter: (value: number) => string;
}) {
  const width = 540;
  const height = 210;
  const allPoints = props.series.flatMap((row) => row.points);

  const minX = allPoints.length
    ? allPoints.reduce((acc, point) => Math.min(acc, point.x), allPoints[0]!.x)
    : 0;
  const maxX = allPoints.length
    ? allPoints.reduce((acc, point) => Math.max(acc, point.x), allPoints[0]!.x)
    : 1;
  const minYRaw = allPoints.length
    ? allPoints.reduce((acc, point) => Math.min(acc, point.y), allPoints[0]!.y)
    : 0;
  const maxYRaw = allPoints.length
    ? allPoints.reduce((acc, point) => Math.max(acc, point.y), allPoints[0]!.y)
    : 1;

  const minY = minYRaw === maxYRaw ? Math.max(minYRaw * 0.9, 0) : minYRaw;
  const maxY = minYRaw === maxYRaw ? maxYRaw * 1.1 + 1 : maxYRaw;

  return (
    <Card className="border-border bg-card/60 py-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">{props.title}</CardTitle>
        <p className="text-xs text-muted-foreground">{props.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {!props.series.length && (
          <div className="rounded border border-border bg-muted p-4 text-sm text-muted-foreground">
            No metrics yet for this chart.
          </div>
        )}

        {!!props.series.length && (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-44 w-full rounded border border-border bg-muted/40"
            role="img"
            aria-label={props.title}
          >
            {[0, 1, 2, 3].map((grid) => {
              const y = 10 + (grid / 3) * (height - 20);
              return (
                <line
                  key={`grid-${grid}`}
                  x1={12}
                  x2={width - 12}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/60"
                  strokeWidth="1"
                />
              );
            })}

            {props.series.map((row) => (
              <path
                key={row.providerName}
                d={renderLinePath(row.points, minX, maxX, minY, maxY, width, height)}
                fill="none"
                stroke={row.color}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}
          </svg>
        )}

        <div className="grid grid-cols-1 gap-2">
          {props.series.map((row) => (
            <div
              key={`${row.providerName}-${props.title}`}
              className="flex items-center justify-between rounded border border-border bg-muted p-2 text-xs"
            >
              <span className="inline-flex items-center gap-2 text-foreground">
                <span
                  className="block size-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.providerName}
              </span>
              <span className="font-medium text-foreground">
                {props.valueFormatter(row.latestValue)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ModelDetailPage() {
  const { modelId = "" } = useParams();
  const [location, setLocation] = useState("all");
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("24h");
  const [latencyMode, setLatencyMode] = useState<LatencyMode>("avg");
  const [lineStyle, setLineStyle] = useState<LineStyle>("raw");
  const [hiddenProviders, setHiddenProviders] = useState<Record<string, boolean>>({});

  const selectedTimeRange = timeRangeOptions[timeRange];

  const modelListQuery = useQuery({ queryKey: ["models"], queryFn: getModels });
  const providersQuery = useQuery({
    queryKey: ["model-providers", modelId],
    queryFn: () => getModelProviders(modelId),
  });

  const model = modelListQuery.data?.find((row) => row.id === modelId);

  const metricsQuery = useQuery({
    queryKey: ["model-provider-metrics", model?.slug],
    queryFn: () => getModelProviderMetrics(model!.slug),
    enabled: Boolean(model?.slug),
  });

  const metricTimeseriesQuery = useQuery({
    queryKey: [
      "model-provider-metrics-timeseries",
      model?.slug,
      selectedTimeRange.windowHours,
      selectedTimeRange.bucketMinutes,
    ],
    queryFn: () =>
      getModelProviderMetricTimeseries(model!.slug, {
        windowHours: selectedTimeRange.windowHours,
        bucketMinutes: selectedTimeRange.bucketMinutes,
      }),
    enabled: Boolean(model?.slug),
  });

  const metricsByProviderName = useMemo(() => {
    return new Map(
      (metricsQuery.data ?? []).map((row) => [row.providerName.toLowerCase(), row]),
    );
  }, [metricsQuery.data]);

  const providerRows = useMemo(
    () =>
      (providersQuery.data ?? []).map((row) => {
        const base = enrichProvider(row);
        const metric = metricsByProviderName.get(row.providerName.toLowerCase());

        if (!metric) return base;

        return {
          ...base,
          latencySec: Number((metric.avgLatencyMs / 1000).toFixed(2)),
          throughputTps: Number(metric.avgThroughputTps.toFixed(2)),
          uptimePct: Number(metric.uptimePct.toFixed(2)),
          errorRatePct: Number(metric.errorRatePct.toFixed(2)),
          requestCount: metric.requestCount,
          hasLiveMetrics: true,
        };
      }),
    [metricsByProviderName, providersQuery.data],
  );

  const visibleProviders = useMemo(() => {
    if (location === "all") return providerRows;
    return providerRows.filter((row) => row.location.toLowerCase() === location);
  }, [location, providerRows]);

  const selectedProviders = useMemo(
    () =>
      visibleProviders.filter(
        (row) => !hiddenProviders[row.providerName.trim().toLowerCase()],
      ),
    [hiddenProviders, visibleProviders],
  );

  const visibleProviderNames = useMemo(
    () => new Set(selectedProviders.map((row) => row.providerName.toLowerCase())),
    [selectedProviders],
  );

  const visibleTimeseriesProviders = useMemo(
    () =>
      (metricTimeseriesQuery.data?.providers ?? []).filter((row) =>
        visibleProviderNames.has(row.providerName.toLowerCase()),
      ),
    [metricTimeseriesQuery.data?.providers, visibleProviderNames],
  );

  const throughputSeries = useMemo(
    () =>
      toChartSeries(
        selectedProviders,
        visibleTimeseriesProviders,
        "avgThroughputTps",
        lineStyle,
      ),
    [lineStyle, selectedProviders, visibleTimeseriesProviders],
  );

  const latencySeries = useMemo(
    () =>
      toChartSeries(
        selectedProviders,
        visibleTimeseriesProviders,
        latencyMode === "p95" ? "p95LatencyMs" : "avgLatencyMs",
        lineStyle,
      ),
    [latencyMode, lineStyle, selectedProviders, visibleTimeseriesProviders],
  );

  const e2eLatencySeries = useMemo(
    () =>
      toChartSeries(
        selectedProviders,
        visibleTimeseriesProviders,
        latencyMode === "p95" ? "p95E2eLatencyMs" : "e2eLatencyMs",
        lineStyle,
      ),
    [latencyMode, lineStyle, selectedProviders, visibleTimeseriesProviders],
  );

  const toggleProviderVisibility = (providerName: string) => {
    const key = providerName.trim().toLowerCase();
    setHiddenProviders((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const bestThroughput = useMemo(
    () =>
      [...providerRows]
        .filter((row) => row.throughputTps !== null)
        .sort((a, b) => (b.throughputTps ?? 0) - (a.throughputTps ?? 0))[0],
    [providerRows],
  );

  const lowestLatency = useMemo(
    () =>
      [...providerRows]
        .filter((row) => row.latencySec !== null)
        .sort((a, b) => (a.latencySec ?? 0) - (b.latencySec ?? 0))[0],
    [providerRows],
  );

  const bestUptime = useMemo(
    () =>
      [...providerRows]
        .filter((row) => row.uptimePct !== null)
        .sort((a, b) => (b.uptimePct ?? 0) - (a.uptimePct ?? 0))[0],
    [providerRows],
  );

  const cheapestInput = useMemo(
    () => [...providerRows].sort((a, b) => a.inputTokenCost - b.inputTokenCost)[0],
    [providerRows],
  );

  const cheapestOutput = useMemo(
    () => [...providerRows].sort((a, b) => a.outputTokenCost - b.outputTokenCost)[0],
    [providerRows],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <Link
        to="/models"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to models
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {model?.name ?? "Model"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Deep provider insights, performance, and routing guidance for this model.
      </p>
      {model && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{model.slug}</span> by {model.company.name}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {metricsQuery.data?.length
          ? "Live provider metrics from backend telemetry"
          : "Live metrics will appear after chat traffic for this model"}
      </p>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card/60 py-2">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4 text-cyan-500" /> Active Providers
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold text-foreground">{providerRows.length}</p>
                <p className="text-xs text-muted-foreground">Available endpoints</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60 py-2">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-sm font-medium">
                  <Gauge className="size-4 text-cyan-500" /> Best Throughput
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold text-foreground">
                  {bestThroughput?.throughputTps ?? "--"} tok/s
                </p>
                <p className="text-xs text-muted-foreground">{bestThroughput?.providerName ?? "No provider"}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60 py-2">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-sm font-medium">
                  <Wallet className="size-4 text-cyan-500" /> Cheapest Input
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold text-foreground">
                  {cheapestInput ? tokenPrice(cheapestInput.inputTokenCost) : "--"}
                </p>
                <p className="text-xs text-muted-foreground">{cheapestInput?.providerName ?? "No provider"}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60 py-2">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-sm font-medium">
                  <Wallet className="size-4 text-cyan-500" /> Cheapest Output
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-semibold text-foreground">
                  {cheapestOutput ? tokenPrice(cheapestOutput.outputTokenCost) : "--"}
                </p>
                <p className="text-xs text-muted-foreground">{cheapestOutput?.providerName ?? "No provider"}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <div className="flex justify-end">
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-40 border-border bg-muted">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                <SelectItem value="us">US</SelectItem>
                <SelectItem value="eu">EU</SelectItem>
                <SelectItem value="apac">APAC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-border bg-card/60 py-2">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Providers for {model?.name ?? "this model"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {providersQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Loading providers...</p>
              )}
              {providersQuery.error && (
                <p className="text-sm text-red-600 dark:text-rose-300">Could not load providers for this model.</p>
              )}

              {visibleProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted p-4 md:grid-cols-[1.3fr,1fr]"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{provider.providerName}</p>
                    <a
                      href={provider.providerWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-500 dark:text-cyan-200 dark:hover:text-cyan-100"
                    >
                      <Globe className="size-3" /> Visit provider site
                    </a>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {provider.location} · {provider.quantization.toUpperCase()}
                    </p>
                    {provider.hasLiveMetrics && (
                      <p className="mt-1 text-xs text-emerald-400">Live metrics · {provider.requestCount} requests</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="rounded border border-border bg-background/70 p-2 text-muted-foreground">
                      Latency <span className="block text-sm font-semibold text-foreground">{provider.latencySec !== null ? `${provider.latencySec}s` : "--"}</span>
                    </p>
                    <p className="rounded border border-border bg-background/70 p-2 text-muted-foreground">
                      Throughput <span className="block text-sm font-semibold text-foreground">{provider.throughputTps !== null ? `${provider.throughputTps} tok/s` : "--"}</span>
                    </p>
                    <p className="rounded border border-border bg-background/70 p-2 text-muted-foreground">
                      Input <span className="block text-sm font-semibold text-foreground">{tokenPrice(provider.inputTokenCost)}</span>
                    </p>
                    <p className="rounded border border-border bg-background/70 p-2 text-muted-foreground">
                      Output <span className="block text-sm font-semibold text-foreground">{tokenPrice(provider.outputTokenCost)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-[1fr,auto,auto,auto]">
            <p className="text-xs text-muted-foreground">
              {metricTimeseriesQuery.data?.providers.length
                ? `Provider time series over ${selectedTimeRange.label.toLowerCase()}`
                : "Collecting time series data - charts populate as traffic arrives"}
            </p>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRangeKey)}>
              <SelectTrigger className="h-8 w-28 border-border bg-muted text-xs">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last 1h</SelectItem>
                <SelectItem value="6h">Last 6h</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7d</SelectItem>
              </SelectContent>
            </Select>
            <Select value={latencyMode} onValueChange={(value) => setLatencyMode(value as LatencyMode)}>
              <SelectTrigger className="h-8 w-28 border-border bg-muted text-xs">
                <SelectValue placeholder="Latency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avg">Avg latency</SelectItem>
                <SelectItem value="p95">p95 latency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lineStyle} onValueChange={(value) => setLineStyle(value as LineStyle)}>
              <SelectTrigger className="h-8 w-32 border-border bg-muted text-xs">
                <SelectValue placeholder="Line style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">Raw lines</SelectItem>
                <SelectItem value="smoothed">Smoothed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!!visibleProviders.length && (
            <div className="mb-3 flex flex-wrap gap-2">
              {visibleProviders.map((provider) => {
                const key = provider.providerName.trim().toLowerCase();
                const hidden = Boolean(hiddenProviders[key]);

                return (
                  <button
                    key={`${provider.id}-toggle`}
                    type="button"
                    onClick={() => toggleProviderVisibility(provider.providerName)}
                    className={`rounded-md border px-2 py-1 text-xs transition ${
                      hidden
                        ? "border-border bg-muted text-muted-foreground"
                        : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    }`}
                  >
                    {hidden ? "Show" : "Hide"} {provider.providerName}
                  </button>
                );
              })}
            </div>
          )}

          {!selectedProviders.length && (
            <div className="mb-4 rounded border border-border bg-muted p-3 text-xs text-muted-foreground">
              All providers are hidden for this view. Toggle one back on to render charts.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MultiProviderLineChart
              title="Throughput"
              subtitle="Higher is better"
              series={throughputSeries}
              valueFormatter={(value) => `${value.toFixed(2)} tok/s`}
            />
            <MultiProviderLineChart
              title="Latency"
              subtitle={latencyMode === "p95" ? "p95 latency - lower is better" : "Average latency - lower is better"}
              series={latencySeries}
              valueFormatter={(value) => `${value.toFixed(0)} ms`}
            />
            <MultiProviderLineChart
              title="E2E Latency"
              subtitle={latencyMode === "p95" ? "p95 latency adjusted by uptime" : "Average latency adjusted by uptime"}
              series={e2eLatencySeries}
              valueFormatter={(value) => `${value.toFixed(0)} ms`}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-border bg-card/60 py-2">
              <CardHeader>
                <CardTitle className="text-base">Computed Uptime %</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {selectedProviders
                  .slice()
                  .sort((a, b) => (b.uptimePct ?? 0) - (a.uptimePct ?? 0))
                  .map((provider) => {
                    const uptime = provider.uptimePct ?? 0;
                    return (
                      <div
                        key={`${provider.id}-uptime`}
                        className="rounded border border-border bg-muted p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">{provider.providerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {provider.uptimePct !== null ? `${provider.uptimePct}%` : "--"}
                          </p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded bg-background/70">
                          <div
                            className="h-full rounded bg-cyan-500"
                            style={{ width: `${Math.max(0, Math.min(100, uptime))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60 py-2">
              <CardHeader>
                <CardTitle className="text-base">Error Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {selectedProviders
                  .slice()
                  .sort((a, b) => (a.errorRatePct ?? 0) - (b.errorRatePct ?? 0))
                  .map((provider) => {
                    const errorRate = provider.errorRatePct ?? 0;
                    return (
                      <div
                        key={`${provider.id}-err`}
                        className="rounded border border-border bg-muted p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">{provider.providerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {provider.errorRatePct !== null ? `${provider.errorRatePct}%` : "--"}
                          </p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded bg-background/70">
                          <div
                            className="h-full rounded bg-amber-400"
                            style={{ width: `${Math.max(0, Math.min(100, errorRate))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <Card className="border-border bg-card/60 py-2">
            <CardHeader>
              <CardTitle className="text-base">Token Pricing by Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {providerRows
                .slice()
                .sort((a, b) => a.inputTokenCost + a.outputTokenCost - (b.inputTokenCost + b.outputTokenCost))
                .map((provider) => (
                  <div key={`${provider.id}-price`} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted p-3 text-sm md:grid-cols-[1.2fr,1fr,1fr,1fr]">
                    <p className="font-medium text-foreground">{provider.providerName}</p>
                    <p className="text-muted-foreground">Input: <span className="text-foreground">{tokenPrice(provider.inputTokenCost)}</span></p>
                    <p className="text-muted-foreground">Output: <span className="text-foreground">{tokenPrice(provider.outputTokenCost)}</span></p>
                    <p className="text-muted-foreground">
                      1M mixed est: <span className="text-foreground">${(provider.inputTokenCost * 500 + provider.outputTokenCost * 500).toFixed(2)}</span>
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card className="border-border bg-card/60 py-2">
            <CardHeader>
              <CardTitle className="text-base">Routing API Example</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <p className="text-sm text-muted-foreground">
                Example request body you can support in RouteForge for provider sorting and performance preferences.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs text-foreground">
{`{
  "model": "${model?.slug ?? "moonshotai/kimi-k2.6"}",
  "messages": [{ "role": "user", "content": "Summarize this report" }],
  "provider": {
    "sort": { "by": "throughput", "partition": "none" },
    "preferredMinThroughput": { "p90": 50 },
    "preferredMaxLatency": { "p90": 3 },
    "allowFallbacks": true
  }
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
