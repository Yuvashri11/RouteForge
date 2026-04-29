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
  Bookmark,
  Bot,
  Code2,
  Cpu,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const API_GATEWAY_URL = "http://localhost:4000";
const SAVED_CHATS_STORAGE_KEY = "routeforge.chat.saved.v1";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

type SavedChat = {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

type ChatFailureInfo = {
  status?: number;
  code?: string;
  type?: string;
  message: string;
};

class ChatRequestError extends Error {
  status?: number;
  code?: string;
  type?: string;

  constructor(info: ChatFailureInfo) {
    super(info.message);
    this.name = "ChatRequestError";
    this.status = info.status;
    this.code = info.code;
    this.type = info.type;
  }
}

function parseFailureInfo(raw: unknown, fallbackStatus?: number): ChatFailureInfo {
  const objectValue = typeof raw === "object" && raw !== null ? raw : null;
  const topMessage =
    objectValue && "message" in objectValue
      ? String((objectValue as { message?: unknown }).message ?? "")
      : "";

  const nestedError =
    objectValue && "error" in objectValue
      ? ((objectValue as { error?: unknown }).error as
          | { message?: unknown; code?: unknown; type?: unknown }
          | undefined)
      : undefined;

  const nestedMessage = nestedError?.message ? String(nestedError.message) : "";
  const nestedCode = nestedError?.code ? String(nestedError.code) : undefined;
  const nestedType = nestedError?.type ? String(nestedError.type) : undefined;

  return {
    status: fallbackStatus,
    code: nestedCode,
    type: nestedType,
    message:
      nestedMessage ||
      topMessage ||
      (fallbackStatus ? `Request failed with status ${fallbackStatus}` : "Request failed"),
  };
}

function sanitizeSensitiveText(value: string) {
  return value
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, "[REDACTED_KEY]")
    .replace(/api[_-]?key\s*[:=]\s*[^\s,;]+/gi, "api_key=[REDACTED]")
    .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/token\s*[:=]\s*[^\s,;]+/gi, "token=[REDACTED]");
}

function toUserFacingFailureMessage(error: unknown) {
  const fallback =
    "I could not complete that request due to an unexpected error. Please try again.";

  if (!(error instanceof Error)) return fallback;

  const message = error.message.toLowerCase();
  const status = (error as { status?: number }).status;
  const code = (error as { code?: string }).code?.toLowerCase();
  const type = (error as { type?: string }).type?.toLowerCase();

  if (
    status === 429 ||
    code === "rate_limit_exceeded" ||
    type?.includes("rate") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "I could not complete that request because the model provider rate-limited it (429). Please retry in a few seconds or switch to another model.";
  }

  if (
    status === 401 ||
    status === 403 ||
    code === "invalid_api_key" ||
    type?.includes("auth") ||
    message.includes("invalid api key") ||
    message.includes("incorrect api key") ||
    message.includes("api key provided") ||
    message.includes("missing x-api-key") ||
    message.includes("unauthorized")
  ) {
    return "I could not complete that request because authentication failed. Please verify your API key and permissions, then try again.";
  }

  if (status === 400 || message.includes("model not found")) {
    return "I could not complete that request because the selected model is not available. Please choose a different model and try again.";
  }

  if (status === 408 || message.includes("timeout") || message.includes("timed out")) {
    return "I could not complete that request because the model timed out. Please retry, or use a faster model.";
  }

  return `I could not complete that request: ${sanitizeSensitiveText(error.message)}`;
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

function buildChatTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const fallback = "New chat";

  if (!firstUserMessage?.content.trim()) return fallback;

  const normalized = firstUserMessage.content.replace(/\s+/g, " ").trim();
  return normalized.length > 56 ? `${normalized.slice(0, 56)}...` : normalized;
}

function sortSavedChats(chats: SavedChat[]) {
  return chats
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

function formatSavedChatTimestamp(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPage() {
  const [selectedModel, setSelectedModel] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState("");
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [activeSavedChatId, setActiveSavedChatId] = useState("new");
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(SAVED_CHATS_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as SavedChat[];
      if (!Array.isArray(parsed)) return;

      const normalized = parsed.filter(
        (chat) =>
          Boolean(chat?.id) &&
          typeof chat?.title === "string" &&
          typeof chat?.model === "string" &&
          Array.isArray(chat?.messages),
      );

      setSavedChats(sortSavedChats(normalized));
    } catch {
      // Ignore malformed persisted payloads.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      SAVED_CHATS_STORAGE_KEY,
      JSON.stringify(sortSavedChats(savedChats)),
    );
  }, [savedChats]);

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
  const activeSavedChat = useMemo(
    () => savedChats.find((chat) => chat.id === activeSavedChatId),
    [activeSavedChatId, savedChats],
  );

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
    let receivedAnyAssistantContent = false;

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
        throw new ChatRequestError(parseFailureInfo(errorData, response.status));
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

          let parsed: any;
          try {
            parsed = JSON.parse(payload);
          } catch {
            // Ignore malformed SSE chunks
            continue;
          }

          if (parsed?.error) {
            throw new ChatRequestError(parseFailureInfo(parsed));
          }

          // Delta content
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            receivedAnyAssistantContent = true;
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
        }
      }

      if (!receivedAnyAssistantContent) {
        throw new ChatRequestError({
          message: "The model closed the stream before returning any content.",
        });
      }
    } catch (err) {
      const userFacingMessage = toUserFacingFailureMessage(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `⚠️ ${userFacingMessage}`,
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
    setActiveSavedChatId("new");
    textareaRef.current?.focus();
  }

  function saveCurrentChat() {
    const meaningfulMessages = messages.filter((message) => message.content.trim().length > 0);
    if (!meaningfulMessages.length) return;

    const existing = savedChats.find((chat) => chat.id === activeSavedChatId);
    const now = new Date().toISOString();
    const nextId = existing?.id ?? crypto.randomUUID();

    const nextSavedChat: SavedChat = {
      id: nextId,
      title: buildChatTitle(meaningfulMessages),
      model: selectedModel,
      messages: meaningfulMessages,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    setSavedChats((previous) =>
      sortSavedChats([
        nextSavedChat,
        ...previous.filter((chat) => chat.id !== nextSavedChat.id),
      ]),
    );
    setActiveSavedChatId(nextSavedChat.id);
  }

  function handleSavedChatChange(savedChatId: string) {
    if (savedChatId === "new") {
      newChat();
      return;
    }

    const chat = savedChats.find((entry) => entry.id === savedChatId);
    if (!chat) return;

    setActiveSavedChatId(chat.id);
    setMessages(chat.messages);
    setInput("");
    setSelectedModel(chat.model);
  }

  function deleteActiveSavedChat() {
    if (!activeSavedChat || isLoading) return;

    setSavedChats((previous) => previous.filter((chat) => chat.id !== activeSavedChat.id));
    setActiveSavedChatId("new");
    setMessages([]);
    setInput("");
  }

  useEffect(() => {
    if (activeSavedChatId === "new" || isLoading) return;

    const meaningfulMessages = messages.filter((message) => message.content.trim().length > 0);
    if (!meaningfulMessages.length) return;

    setSavedChats((previous) => {
      const existing = previous.find((chat) => chat.id === activeSavedChatId);
      if (!existing) return previous;

      const updated: SavedChat = {
        ...existing,
        title: buildChatTitle(meaningfulMessages),
        model: selectedModel,
        messages: meaningfulMessages,
        updatedAt: new Date().toISOString(),
      };

      return sortSavedChats([
        updated,
        ...previous.filter((chat) => chat.id !== activeSavedChatId),
      ]);
    });
  }, [activeSavedChatId, isLoading, messages, selectedModel]);

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

          <Button
            variant="outline"
            size="sm"
            onClick={saveCurrentChat}
            disabled={!hasConversation || isLoading}
            className="shrink-0 border-border bg-accent/50 text-foreground hover:bg-accent"
          >
            <Bookmark className="size-3.5" />
            {activeSavedChat ? "Update Chat" : "Save Chat"}
          </Button>

          <Select value={activeSavedChatId} onValueChange={handleSavedChatChange}>
            <SelectTrigger className="w-56 border-border bg-muted text-foreground text-xs">
              <SelectValue placeholder="Saved chats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new" className="text-xs">
                Current unsaved chat
              </SelectItem>
              {savedChats.map((chat) => (
                <SelectItem key={chat.id} value={chat.id} className="text-xs">
                  {chat.title} {formatSavedChatTimestamp(chat.updatedAt) ? `- ${formatSavedChatTimestamp(chat.updatedAt)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={deleteActiveSavedChat}
            disabled={!activeSavedChat || isLoading}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Delete selected saved chat"
          >
            <Trash2 className="size-4" />
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
              <Share2 className="size-7 text-cyan-500" />
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
