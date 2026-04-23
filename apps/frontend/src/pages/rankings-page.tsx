import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rankingModels } from "@/lib/mock";
import { ArrowDown, ArrowUp } from "lucide-react";

export function RankingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Model Rankings
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Mock-first leaderboard for weekly usage and model trends.
      </p>

      <Card className="mt-6 border-border bg-card/60 py-2">
        <CardHeader>
          <CardTitle className="text-base text-foreground">
            Top Weekly Models
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {rankingModels.map((model, index) => (
            <div
              key={model.name}
              className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted p-4 md:grid-cols-6 md:items-center"
            >
              <p className="text-sm font-semibold text-foreground">
                #{index + 1}
              </p>
              <div className="md:col-span-2">
                <p className="text-sm text-foreground">{model.name}</p>
                <p className="text-xs text-muted-foreground">{model.company}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {model.weeklyTokensB}B tokens
              </p>
              <p className="text-sm text-muted-foreground">Quality {model.quality}</p>
              <p className="inline-flex items-center gap-1 text-sm text-foreground">
                {model.trendPct >= 0 ? (
                  <ArrowUp className="size-4 text-emerald-500 dark:text-emerald-300" />
                ) : (
                  <ArrowDown className="size-4 text-red-500 dark:text-rose-300" />
                )}
                {model.trendPct}%
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
