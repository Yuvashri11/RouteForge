import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";

interface BoilerplateCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  keyName: string;
}

// Prefer an explicitly set VITE env in local dev; default to empty string so
// generated snippets call relative `/api` paths and do not expose any deployed URL.
let API_BASE_URL = "";
if (typeof window !== "undefined") {
  try {
    // Access import.meta.env only on the client. Some server runtimes don't
    // expose `import.meta.env` and reading it at module-eval time can produce
    // runtime errors. Use a try/catch and feature-check.
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env.VITE_API_GATEWAY_URL) {
      // @ts-ignore
      API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL ?? "";
    }
  } catch (e) {
    API_BASE_URL = "";
  }
}


function generateCurlSnippet(apiKey: string) {
  return `# ── OpenAI ──
curl -X POST ${API_BASE_URL}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [
      { "role": "user", "content": "Hello, how are you?" }
    ]
  }'

# ── Anthropic Claude ──
curl -X POST ${API_BASE_URL}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{"model": "anthropic/claude-sonnet-4", "messages": [{"role": "user", "content": "Write a haiku"}]}'

# ── Google Gemini ──
curl -X POST ${API_BASE_URL}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{"model": "google/gemini-2.5-pro", "messages": [{"role": "user", "content": "Explain gravity"}]}'

# ── Cerebras (ultra-fast inference) ──
curl -X POST ${API_BASE_URL}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{"model": "cerebras/llama3.1-8b", "messages": [{"role": "user", "content": "What is Rust?"}]}'

# ── Groq (lightning-fast inference) ──
curl -X POST ${API_BASE_URL}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{"model": "groq/llama3-70b-8192", "messages": [{"role": "user", "content": "Summarize quantum computing"}]}'`;
}

function generatePythonSnippet(apiKey: string) {
  return `import requests

API_KEY = "${apiKey}"
BASE_URL = "${API_BASE_URL}/api/v1/chat/completions"

def chat(model: str, message: str) -> str:
    """Send a chat completion request to RouteForge."""
    response = requests.post(
        BASE_URL,
        headers={
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
        },
        json={
            "model": model,
            "messages": [
                {"role": "user", "content": message}
            ],
        },
    )
    response.raise_for_status()
    return response.json()

# ── OpenAI ──
result = chat("openai/gpt-4o", "Explain quantum computing in 3 sentences")
print(result["content"])

# ── Anthropic Claude ──
result = chat("anthropic/claude-sonnet-4", "Write a haiku about coding")
print(result["content"])

# ── Google Gemini ──
result = chat("google/gemini-2.5-pro", "What is the meaning of life?")
print(result["content"])

# ── Cerebras (ultra-fast inference) ──
result = chat("cerebras/llama3.1-8b", "Explain the Rust borrow checker")
print(result["content"])

# ── Groq (lightning-fast inference) ──
result = chat("groq/llama3-70b-8192", "Summarize the theory of relativity")
print(result["content"])`;
}

function generateJsSnippet(apiKey: string) {
  return `const API_KEY = "${apiKey}";
const BASE_URL = "${API_BASE_URL}/api/v1/chat/completions";

async function chat(model, message) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!response.ok) throw new Error(\`Request failed: \${response.status}\`);
  return response.json();
}

// ── OpenAI ──
const result = await chat("openai/gpt-4o", "Explain async/await in JS");
console.log(result.content);

// ── Anthropic Claude ──
const poem = await chat("anthropic/claude-sonnet-4", "Write a haiku about code");
console.log(poem.content);

// ── Google Gemini ──
const gemini = await chat("google/gemini-2.5-pro", "What is quantum entanglement?");
console.log(gemini.content);

// ── Cerebras (ultra-fast inference) ──
const cerebras = await chat("cerebras/llama3.1-8b", "Explain the Rust borrow checker");
console.log(cerebras.content);

// ── Groq (lightning-fast inference) ──
const fast = await chat("groq/llama3-70b-8192", "What is 2 + 2?");
console.log(fast.content);`;
}

function generateTsSnippet(apiKey: string) {
  return `const API_KEY = "${apiKey}";
const BASE_URL = "${API_BASE_URL}/api/v1/chat/completions";

type ChatRole = "user" | "assistant" | "system";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

async function chat(model: string, messages: ChatMessage[]): Promise<ChatResponse> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) throw new Error(\`Request failed: \${response.status}\`);
  return response.json() as Promise<ChatResponse>;
}

// ── OpenAI ──
const result = await chat("openai/gpt-4o", [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Explain TypeScript generics" },
]);
console.log(result.content);
console.log(\`Tokens: \${result.inputTokens} in / \${result.outputTokens} out\`);

// ── Anthropic Claude ──
const claude = await chat("anthropic/claude-sonnet-4", [
  { role: "user", content: "Write a function to reverse a linked list" },
]);
console.log(claude.content);

// ── Google Gemini ──
const gemini = await chat("google/gemini-2.5-pro", [
  { role: "user", content: "Compare REST vs GraphQL" },
]);
console.log(gemini.content);

// ── Cerebras (ultra-fast inference) ──
const cerebras = await chat("cerebras/llama3.1-8b", [
  { role: "user", content: "What is the Rust borrow checker?" },
]);
console.log(cerebras.content);

// ── Groq (lightning-fast inference) ──
const groq = await chat("groq/llama3-70b-8192", [
  { role: "user", content: "Summarize the theory of relativity" },
]);
console.log(groq.content);`;
}

const SNIPPETS = [
  { id: "curl", label: "cURL", lang: "bash", generate: generateCurlSnippet },
  { id: "python", label: "Python", lang: "python", generate: generatePythonSnippet },
  { id: "javascript", label: "JavaScript", lang: "javascript", generate: generateJsSnippet },
  { id: "typescript", label: "TypeScript", lang: "typescript", generate: generateTsSnippet },
] as const;

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 bg-muted/80 hover:bg-muted text-muted-foreground"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
      <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/50 p-4 text-[13px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function BoilerplateCodeDialog({
  open,
  onOpenChange,
  apiKey,
  keyName,
}: BoilerplateCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10">
              <Sparkles className="size-4 text-cyan-500" />
            </div>
            <div>
              <DialogTitle>Your API key is ready!</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{keyName}</span>
                {" — "}
                Use the snippets below to start calling any model through RouteForge.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Your API Key</p>
          <p className="mt-1 break-all font-mono text-sm text-foreground">{apiKey}</p>
        </div>

        <Tabs defaultValue="curl" className="mt-2">
          <TabsList className="w-full justify-start">
            {SNIPPETS.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="text-xs">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SNIPPETS.map((s) => (
            <TabsContent key={s.id} value={s.id}>
              <CodeBlock code={s.generate(apiKey)} />
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-1 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium text-foreground">💡 One API, any model</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Switch between OpenAI, Claude, Gemini, Cerebras, and Groq by changing the{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-cyan-600 dark:text-cyan-300">model</code>{" "}
            field. No other code changes needed.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
