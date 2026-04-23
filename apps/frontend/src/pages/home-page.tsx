import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { heroStats } from "@/lib/mock";
import { ChevronRight, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Sparkles,
    title: "One API for Any Model",
    text: "Use a single OpenAI-compatible interface to access major model families across providers.",
  },
  {
    icon: TrendingUp,
    title: "Price and Performance Routing",
    text: "Pick providers by speed, cost, and reliability with graceful fallback when one region degrades.",
  },
  {
    icon: ShieldCheck,
    title: "Data Policy Controls",
    text: "Constrain routing to providers that match your privacy and compliance posture.",
  },
];

export function HomePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-8 shadow-[0_20px_80px_rgba(2,132,199,0.15)] md:p-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_30%)]" />
        <p className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-200">
          RouteForge Platform
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
          The unified interface for LLM providers and model routing.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
          Better uptime, transparent pricing, and instant provider failover with
          one API surface.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            className="bg-cyan-500 text-white hover:bg-cyan-400 dark:text-slate-950"
          >
            <Link to="/keys">Get API Key</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-border bg-accent/50 text-foreground hover:bg-accent"
          >
            <Link to="/models" className="inline-flex items-center gap-1">
              Explore Models <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {heroStats.map((stat) => (
          <Card
            key={stat.label}
            className="border-border bg-card/60 py-4"
          >
            <CardContent className="space-y-1 px-4">
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {features.map((item) => (
          <Card
            key={item.title}
            className="border-border bg-card/60 py-2"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <item.icon className="size-4 text-cyan-500 dark:text-cyan-300" />
                {item.title}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {item.text}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}
