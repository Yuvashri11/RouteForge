export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatCompletionRequest = {
  messages: ChatMessage[];
  model: string;
};

export type ChatCompletionResponse = {
  content: string;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Yielded by the streaming method.
 * - type "delta"  → a chunk of text
 * - type "done"   → final usage stats (stream ended)
 */
export type StreamChunk =
  | { type: "delta"; content: string }
  | { type: "done"; inputTokens: number; outputTokens: number };

export interface LlmProvider {
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk>;
}
