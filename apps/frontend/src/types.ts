export type UserProfile = {
  id: number;
  email: string;
  credits: number;
};

export type ApiKeyItem = {
  id: number;
  name: string;
  apiKey: string;
  disabled: boolean;
  lastUsed: Date | null;
  creditsConsumed: number;
};

export type ModelItem = {
  id: string;
  name: string;
  slug: string;
  company: {
    id: string;
    name: string;
    website: string;
  };
};

export type ProviderItem = {
  id: string;
  name: string;
  website: string;
};

export type ModelProviderItem = {
  id: string;
  providerId: string;
  providerName: string;
  providerWebsite: string;
  inputTokenCost: number;
  outputTokenCost: number;
};

export type RankingModel = {
  name: string;
  company: string;
  weeklyTokensB: number;
  trendPct: number;
  quality: number;
  priceRank: number;
};

export type PricingPlan = {
  name: string;
  description: string;
  monthlyCredits: number;
  price: number;
  features: string[];
};
