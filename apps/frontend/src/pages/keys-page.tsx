import { BoilerplateCodeDialog } from "@/components/boilerplate-code-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  updateApiKeyDisabled,
} from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, Copy, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export function KeysPage() {
  const [name, setName] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // State for the boilerplate code dialog
  const [boilerplateOpen, setBoilerplateOpen] = useState(false);
  const [newKey, setNewKey] = useState<{ apiKey: string; name: string } | null>(null);

  const queryClient = useQueryClient();
  const keysQuery = useQuery({ queryKey: ["api-keys"], queryFn: listApiKeys });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["api-keys"] });

  const createMutation = useMutation({
    mutationFn: (keyName: string) => createApiKey(keyName),
    onSuccess: (data) => {
      // Store the new key info and open the boilerplate dialog
      setNewKey({ apiKey: data.apiKey, name: name });
      setBoilerplateOpen(true);
      setName("");
      refresh();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: number; disabled: boolean }) =>
      updateApiKeyDisabled(id, disabled),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteApiKey(id),
    onSuccess: refresh,
  });

  const rows = useMemo(() => keysQuery.data ?? [], [keysQuery.data]);

  // Handler to show boilerplate for any existing key
  const showBoilerplate = (apiKey: string, keyName: string) => {
    setNewKey({ apiKey, name: keyName });
    setBoilerplateOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        API Keys
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create and manage keys for your integrations.
      </p>

      <Card className="mt-6 border-border bg-card/60 py-2">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Create Key</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name"
            className="max-w-xs border-border bg-muted text-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim() && !createMutation.isPending) {
                createMutation.mutate(name);
              }
            }}
          />
          <Button
            onClick={() => createMutation.mutate(name)}
            disabled={!name.trim() || createMutation.isPending}
            className="bg-cyan-500 text-white hover:bg-cyan-400 dark:text-slate-950"
          >
            <Plus className="mr-1 size-4" /> Create
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4 border-border bg-card/60 py-2">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Your Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {keysQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading keys...</p>
          )}
          {keysQuery.error && (
            <p className="text-sm text-red-600 dark:text-rose-300">Unable to load keys.</p>
          )}

          {rows.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted p-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {item.apiKey}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Credits consumed: {item.creditsConsumed}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="border-border bg-accent/50 text-foreground hover:bg-accent"
                  onClick={() => showBoilerplate(item.apiKey, item.name)}
                >
                  <Code2 className="mr-1 size-4" /> Code
                </Button>

                <Button
                  variant="outline"
                  className="border-border bg-accent/50 text-foreground hover:bg-accent"
                  onClick={async () => {
                    await navigator.clipboard.writeText(item.apiKey);
                    setCopiedId(item.id);
                    setTimeout(() => setCopiedId(null), 1200);
                  }}
                >
                  <Copy className="mr-1 size-4" />{" "}
                  {copiedId === item.id ? "Copied" : "Copy"}
                </Button>

                <Button
                  variant="outline"
                  className="border-border bg-accent/50 text-foreground hover:bg-accent"
                  onClick={() =>
                    toggleMutation.mutate({
                      id: item.id,
                      disabled: !item.disabled,
                    })
                  }
                >
                  {item.disabled ? "Enable" : "Disable"}
                </Button>

                <Button
                  variant="destructive"
                  className="bg-red-500/80 text-white hover:bg-red-500"
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  <Trash2 className="mr-1 size-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Boilerplate code dialog — shown after key creation or on "Code" click */}
      {newKey && (
        <BoilerplateCodeDialog
          open={boilerplateOpen}
          onOpenChange={setBoilerplateOpen}
          apiKey={newKey.apiKey}
          keyName={newKey.name}
        />
      )}
    </div>
  );
}
