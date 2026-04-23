import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getModelProviders, getModels } from "@/lib/api/client";
import { tokenPrice } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Globe } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export function ModelDetailPage() {
  const { modelId = "" } = useParams();
  const modelListQuery = useQuery({ queryKey: ["models"], queryFn: getModels });
  const providersQuery = useQuery({
    queryKey: ["model-providers", modelId],
    queryFn: () => getModelProviders(modelId),
  });

  const model = modelListQuery.data?.find((row) => row.id === modelId);

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
        Provider pricing and routing options for this model.
      </p>

      <Card className="mt-6 border-border bg-card/60 py-2">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {providersQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading providers...</p>
          )}
          {providersQuery.error && (
            <p className="text-sm text-red-600 dark:text-rose-300">
              Could not load providers for this model.
            </p>
          )}

          {(providersQuery.data ?? []).map((provider) => (
            <div
              key={provider.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted p-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {provider.providerName}
                </p>
                <a
                  href={provider.providerWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-500 dark:text-cyan-200 dark:hover:text-cyan-100"
                >
                  <Globe className="size-3" /> Visit provider site
                </a>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Input: {tokenPrice(provider.inputTokenCost)}</p>
                <p>Output: {tokenPrice(provider.outputTokenCost)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
