import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getModels } from "@/lib/api/client";
import { compactNumber } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export function ModelsPage() {
  const [query, setQuery] = useState("");
  const modelsQuery = useQuery({ queryKey: ["models"], queryFn: getModels });

  const filtered = useMemo(() => {
    const rows = modelsQuery.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.company.name.toLowerCase().includes(q),
    );
  }, [modelsQuery.data, query]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Models
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Discover available models and provider coverage.
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search model, slug, company"
            className="border-border bg-muted pl-9 text-foreground"
          />
        </div>
      </div>

      <Card className="mt-6 border-border bg-card/60 py-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base text-foreground">
            Active Models
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {compactNumber(filtered.length)} shown
          </span>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 pb-4">
          {modelsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading models...</p>
          )}
          {modelsQuery.error && (
            <p className="text-sm text-red-600 dark:text-rose-300">Failed to load models.</p>
          )}

          {filtered.map((model) => (
            <div
              key={model.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted p-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {model.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{model.slug}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-200">
                  <Building2 className="size-3" /> {model.company.name}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="border-border bg-accent/50 text-foreground hover:bg-accent"
              >
                <Link to={`/models/${model.id}`}>View providers</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
