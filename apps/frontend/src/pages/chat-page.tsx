import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getModels, listApiKeys } from "@/lib/api/client";
import type { ModelItem } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUp,
  Bot,
  Code2,
  Cpu,
  Loader2,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const API_GATEWAY_URL = "http://localhost:4000";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

const suggestionCards = [
  {
    title: "Explain a concept",
    description: "Break down any topic simply",
    prompt: "Explain how neural networks work in simple terms",
    icon: Sparkles,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    title: "Write code",
    description: "Generate code in any language",
    prompt: "Write a function to find the longest palindrome in a string",
    icon: Code2,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    title: "Debug this",
    description: "Find and fix issues in code",
    prompt:
      "Why does this code cause a memory leak?\n\nsetInterval(() => {\n  const data = new Array(1000000).fill('x');\n  globalData.push(data);\n}, 100);",
    icon: Cpu,
    color: "text-rose-500",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  {
    title: "Compare models",
    description: "Understand model differences",
    prompt:
      "What are the key differences between GPT-4, Claude, and Gemini in terms of capabilities?",
    icon: Zap,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
];

function groupModelsByCompany(models: ModelItem[]) {
  const groups: Record<string, ModelItem[]> = {};
  for (const model of models) {
    const company = model.company.name;
    if (!groups[company]) groups[company] = [];
    groups[company]!.push(model);
  }
  return groups;
}

export function ChatPage() {
  const [selectedModel, setSelectedModel] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: getModels,
  });

  const keysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  // Auto-select first model and key when data loads
  useEffect(() => {
    if (modelsQuery.data?.length && !selectedModel) {
      setSelectedModel(modelsQuery.data[0]!.slug);
    }
  }, [modelsQuery.data, selectedModel]);

  useEffect(() => {
    if (keysQuery.data?.length && !selectedApiKey) {
      const activeKey = keysQuery.data.find((k) => !k.disabled);
      if (activeKey) setSelectedApiKey(activeKey.apiKey);
    }
  }, [keysQuery.data, selectedApiKey]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const models = modelsQuery.data ?? [];
  const grouped = groupModelsByCompany(models);
  const hasConversation = messages.length > 0;

  async function sendMessage(content: string) {
    if (!content.trim() || !selectedApiKey || !selectedModel || isLoading)
      return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
    };

    const assistantId = crypto.randomUUID();
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      model: selectedModel,
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_GATEWAY_URL}/api/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": selectedApiKey,
          },
          body: JSON.stringify({
            model: selectedModel,
            stream: true,
            messages: [
              ...messages
                .filter((m) => m.content.trim().length > 0)
                .map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
              { role: "user", content: content.trim() },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ?? `Request failed with status ${response.status}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6); // strip "data: "
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);

            // Delta content
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + delta }
                    : m,
                ),
              );
            }

            // Usage stats (on finish)
            if (parsed.usage) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        inputTokens: parsed.usage.prompt_tokens,
                        outputTokens: parsed.usage.completion_tokens,
                      }
                    : m,
                ),
              );
            }
          } catch {
            // Ignore malformed SSE chunks
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `⚠️ Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function newChat() {
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  }

  const activeKeys = keysQuery.data?.filter((k) => !k.disabled) ?? [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar — model selector + new chat */}
      <div className="border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={newChat}
            className="shrink-0 border-border bg-accent/50 text-foreground hover:bg-accent"
          >
            New Chat
          </Button>

          {/* Model selector */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-64 border-border bg-muted text-foreground text-xs">
              <SelectValue placeholder="Select a model..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(grouped).map(([company, companyModels]) => (
                <div key={company}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {company}
                  </div>
                  {companyModels.map((m) => (
                    <SelectItem key={m.slug} value={m.slug} className="text-xs">
                      {m.slug}
                    </SelectItem>
                  ))}
                </div>
              ))}
              {modelsQuery.isLoading && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Loading models...
                </div>
              )}
            </SelectContent>
          </Select>

          {/* API Key selector */}
          {activeKeys.length > 0 && (
            <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
              <SelectTrigger className="w-48 border-border bg-muted text-foreground text-xs">
                <SelectValue placeholder="Select API key..." />
              </SelectTrigger>
              <SelectContent>
                {activeKeys.map((k) => (
                  <SelectItem
                    key={k.id}
                    value={k.apiKey}
                    className="text-xs"
                  >
                    {k.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeKeys.length === 0 && !keysQuery.isLoading && (
            <p className="text-xs text-muted-foreground">
              No API keys found.{" "}
              <a href="/keys" className="text-cyan-500 hover:underline">
                Create one
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {!hasConversation ? (
          /* Empty state — suggestion cards */
          <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4">
            <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 shadow-lg shadow-cyan-500/10">
              <Zap className="size-7 text-cyan-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              RouteForge Chat
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One API, any model. Start a conversation below.
            </p>

            <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {suggestionCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => sendMessage(card.prompt)}
                  disabled={!selectedApiKey || !selectedModel || isLoading}
                  className={`group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 ${card.bg}`}
                >
                  <div className="flex items-center gap-2">
                    <card.icon className={`size-4 ${card.color}`} />
                    <span className="text-sm font-medium text-foreground">
                      {card.title}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {card.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message thread */
          <div className="mx-auto max-w-3xl space-y-1 px-4 py-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 rounded-xl px-4 py-4 ${
                  msg.role === "user"
                    ? "bg-transparent"
                    : "bg-muted/40"
                }`}
              >
                <div
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${
                    msg.role === "user"
                      ? "bg-cyan-500/15 text-cyan-500"
                      : "bg-emerald-500/15 text-emerald-500"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="size-3.5" />
                  ) : (
                    <Bot className="size-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {msg.role === "user" ? "You" : "Assistant"}
                    </span>
                    {msg.model && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {msg.model}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {msg.role === "assistant" && msg.content === "" && isLoading ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span className="text-xs">Thinking...</span>
                      </span>
                    ) : (
                      <>
                        {msg.content}
                        {msg.role === "assistant" && isLoading && msg.content && (
                          <span className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-cyan-500" />
                        )}
                      </>
                    )}
                  </div>
                  {msg.inputTokens !== undefined && (
                    <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                      <span>↗ {msg.inputTokens} input tokens</span>
                      <span>↙ {msg.outputTokens} output tokens</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom input bar */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div className="relative flex items-end rounded-xl border border-border bg-muted/50 shadow-sm transition-colors focus-within:border-cyan-500/40 focus-within:shadow-[0_0_0_2px_rgba(6,182,212,0.1)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !selectedApiKey
                  ? "Create an API key first..."
                  : "Start a new message..."
              }
              disabled={!selectedApiKey || isLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button
              size="icon-sm"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || !selectedApiKey || isLoading}
              className="m-1.5 shrink-0 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40 dark:text-slate-950"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {selectedModel && (
              <>
                Using <span className="font-medium text-foreground">{selectedModel}</span>
                {" · "}
              </>
            )}
            Powered by RouteForge unified API
          </p>
        </div>
      </div>
    </div>
  );
}
