import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LlmProvider,
  StreamChunk,
} from "./base";

export class ClaudeProvider implements LlmProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const systemMessages = request.messages.filter((msg) => msg.role === "system");
    const nonSystemMessages = request.messages.filter((msg) => msg.role !== "system");

    const systemPrompt = systemMessages.map((msg) => msg.content).join("\n");

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: 4096,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: nonSystemMessages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    });

    const textContent = response.content.find((block) => block.type === "text");

    return {
      content: textContent?.text ?? "",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    const systemMessages = request.messages.filter((msg) => msg.role === "system");
    const nonSystemMessages = request.messages.filter((msg) => msg.role !== "system");

    const systemPrompt = systemMessages.map((msg) => msg.content).join("\n");

    const stream = this.client.messages.stream({
      model: request.model,
      max_tokens: 4096,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: nonSystemMessages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { type: "delta", content: event.delta.text };
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      type: "done",
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    };
  }
}
