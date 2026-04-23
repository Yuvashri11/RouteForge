import type { LlmProvider } from "./base";
import { OpenAiProvider } from "./openai";
import { ClaudeProvider } from "./claude";
import { GoogleProvider } from "./google";
import { CerebrasProvider } from "./cerebras";
import { GroqProvider } from "./groq";

export type { ChatMessage, ChatRole, ChatCompletionRequest, ChatCompletionResponse, LlmProvider, StreamChunk } from "./base";

const PROVIDER_MAP: Record<string, new (apiKey: string) => LlmProvider> = {
  openai: OpenAiProvider,
  anthropic: ClaudeProvider,
  google: GoogleProvider,
  cerebras: CerebrasProvider,
  groq: GroqProvider,
};

const ENV_KEY_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  groq: "GROQ_API_KEY",
};

export function getLlmProvider(providerName: string): LlmProvider {
  const normalized = providerName.toLowerCase();
  const ProviderClass = PROVIDER_MAP[normalized];

  if (!ProviderClass) {
    throw new Error(`Unsupported LLM provider: ${providerName}`);
  }

  const envKey = ENV_KEY_MAP[normalized];
  const apiKey = envKey ? process.env[envKey] : undefined;

  if (!apiKey) {
    throw new Error(`Missing API key for provider: ${providerName}. Set ${envKey} in your .env file.`);
  }

  return new ProviderClass(apiKey);
}
