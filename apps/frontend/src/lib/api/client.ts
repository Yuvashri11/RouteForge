import { api } from "@/lib/api/treaty";
import type {
  ApiKeyItem,
  ModelItem,
  ModelProviderMetricItem,
  ModelProviderMetricTimeseriesItem,
  ModelProviderItem,
  ProviderItem,
  UserProfile,
} from "@/types";

type TreatyResult<T> = {
  data: T | null;
  error: unknown;
};

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const valueMessage = (error as { value?: { message?: string } }).value
      ?.message;
    if (valueMessage) return valueMessage;

    const message = (error as { message?: string }).message;
    if (message) return message;
  }

  return fallback;
}

function assertSuccess<T>(result: TreatyResult<T>, fallback?: string): T {
  if (!result.error && result.data !== null) return result.data;
  throw new Error(getErrorMessage(result.error, fallback));
}

export async function signUp(email: string, password: string) {
  const result = (await api.auth["sign-up"].post({
    email,
    password,
  })) as TreatyResult<{ id: string }>;
  return assertSuccess(result, "Failed to sign up");
}

export async function signIn(email: string, password: string) {
  const result = (await api.auth["sign-in"].post({
    email,
    password,
  })) as TreatyResult<{ message: string }>;
  return assertSuccess(result, "Failed to sign in");
}

export async function getProfile(): Promise<UserProfile | null> {
  const result = (await api.auth.profile.get()) as TreatyResult<UserProfile>;

  if (!result.error && result.data) return result.data;

  const status = (result.error as { status?: number } | null)?.status;
  if (status === 401) return null;

  throw new Error(getErrorMessage(result.error, "Failed to load profile"));
}

export async function getModels() {
  const result = (await api.models.get()) as TreatyResult<{
    models: ModelItem[];
  }>;
  return assertSuccess(result, "Failed to fetch models").models;
}

export async function getProviders() {
  const result = (await api.models.providers.get()) as TreatyResult<{
    providers: ProviderItem[];
  }>;
  return assertSuccess(result, "Failed to fetch providers").providers;
}

export async function getModelProviders(modelId: string) {
  const result = (await api
    .models({ id: modelId })
    .providers.get()) as TreatyResult<{
    providers: ModelProviderItem[];
  }>;
  return assertSuccess(result, "Failed to fetch model providers").providers;
}

export async function getModelProviderMetrics(modelSlug: string) {
  const encodedModelSlug = encodeURIComponent(modelSlug);
  const result = (await api
    .metrics
    .models({ slug: encodedModelSlug })
    .providers.get()) as TreatyResult<{
    modelSlug: string;
    providers: ModelProviderMetricItem[];
  }>;

  return assertSuccess(result, "Failed to fetch model provider metrics").providers;
}

export async function getModelProviderMetricTimeseries(
  modelSlug: string,
  options?: { windowHours?: number; bucketMinutes?: number },
) {
  const encodedModelSlug = encodeURIComponent(modelSlug);
  const windowHours = options?.windowHours ?? 24;
  const bucketMinutes = options?.bucketMinutes ?? 30;

  const result = (await api
    .metrics
    .models({ slug: encodedModelSlug })
    .timeseries.get({ query: { windowHours, bucketMinutes } })) as TreatyResult<{
    modelSlug: string;
    windowHours: number;
    bucketMinutes: number;
    providers: ModelProviderMetricTimeseriesItem[];
  }>;

  return assertSuccess(result, "Failed to fetch model provider metric timeseries");
}

export async function listApiKeys() {
  const result = (await api["api-keys"].get()) as TreatyResult<{
    apiKeys: ApiKeyItem[];
  }>;
  return assertSuccess(result, "Failed to fetch API keys").apiKeys;
}

export async function createApiKey(name: string) {
  const result = (await api["api-keys"].post({ name })) as TreatyResult<{
    id: number;
    apiKey: string;
  }>;
  return assertSuccess(result, "Failed to create API key");
}

export async function updateApiKeyDisabled(id: number, disabled: boolean) {
  const result = (await api["api-keys"].put({ id, disabled })) as TreatyResult<{
    message: string;
  }>;
  return assertSuccess(result, "Failed to update API key");
}

export async function deleteApiKey(id: number) {
  const result = (await api["api-keys"]({
    id: id.toString(),
  }).delete()) as TreatyResult<{ message: string }>;
  return assertSuccess(result, "Failed to delete API key");
}

export async function onrampCredits() {
  const result = (await api.payments.onramp.post()) as TreatyResult<{
    message: string;
    credits: number;
  }>;
  return assertSuccess(result, "Failed to add credits");
}
