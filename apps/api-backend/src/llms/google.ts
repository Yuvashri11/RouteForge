import { GoogleGenAI, type Content } from "@google/genai";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LlmProvider,
  StreamChunk,
} from "./base";

export class GoogleProvider implements LlmProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const systemMessages = request.messages.filter((msg) => msg.role === "system");
    const nonSystemMessages = request.messages.filter((msg) => msg.role !== "system");

    const systemInstruction = systemMessages.map((msg) => msg.content).join("\n") || undefined;

    const contents: Content[] = nonSystemMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await this.client.models.generateContent({
      model: request.model,
      contents,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });

    const text = response.text ?? "";
    const usageMetadata = response.usageMetadata;

    return {
      content: text,
      inputTokens: usageMetadata?.promptTokenCount ?? 0,
      outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    const systemMessages = request.messages.filter((msg) => msg.role === "system");
    const nonSystemMessages = request.messages.filter((msg) => msg.role !== "system");

    const systemInstruction = systemMessages.map((msg) => msg.content).join("\n") || undefined;

    const contents: Content[] = nonSystemMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await this.client.models.generateContentStream({
      model: request.model,
      contents,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        yield { type: "delta", content: text };
      }

      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount ?? 0;
        outputTokens = chunk.usageMetadata.candidatesTokenCount ?? 0;
      }
    }

    yield { type: "done", inputTokens, outputTokens };
  }
}
