import type { PricingPlan, RankingModel } from "@/types";

export const heroStats = [
  { label: "Monthly Tokens", value: "70T" },
  { label: "Global Users", value: "5M+" },
  { label: "Active Providers", value: "60+" },
  { label: "Models", value: "300+" },
];

export const rankingModels: RankingModel[] = [
  {
    name: "Claude Opus 4.7",
    company: "Anthropic",
    weeklyTokensB: 385.3,
    trendPct: 3.2,
    quality: 98,
    priceRank: 4,
  },
  {
    name: "GPT-5.4",
    company: "OpenAI",
    weeklyTokensB: 625.2,
    trendPct: 9.05,
    quality: 97,
    priceRank: 6,
  },
  {
    name: "Gemini 3.1 Pro Preview",
    company: "Google",
    weeklyTokensB: 422.8,
    trendPct: -22.85,
    quality: 95,
    priceRank: 5,
  },
  {
    name: "DeepSeek R1 Turbo",
    company: "DeepSeek",
    weeklyTokensB: 196.4,
    trendPct: 11.3,
    quality: 91,
    priceRank: 2,
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    description: "For early product teams and individual builders",
    monthlyCredits: 250_000,
    price: 19,
    features: ["Unified model API", "Provider fallback", "Basic analytics"],
  },
  {
    name: "Growth",
    description: "For production workloads that need reliability",
    monthlyCredits: 2_000_000,
    price: 99,
    features: ["Priority routing", "Data policy controls", "Email support"],
  },
  {
    name: "Enterprise",
    description: "For high-scale and compliance-driven deployments",
    monthlyCredits: 25_000_000,
    price: 999,
    features: [
      "SLA support",
      "Custom provider allowlists",
      "Dedicated onboarding",
    ],
  },
];

export const docsSections = [
  {
    title: "Quickstart",
    points: [
      "Create API key",
      "Choose model",
      "Send OpenAI-compatible request",
    ],
  },
  {
    title: "Routing",
    points: ["Provider preferences", "Fallback chains", "Cost-aware sorting"],
  },
  {
    title: "Reliability",
    points: ["Retries", "Timeout budgets", "Status-aware failover"],
  },
  {
    title: "Security",
    points: ["Per-key controls", "Prompt logging policy", "Team scopes"],
  },
];
