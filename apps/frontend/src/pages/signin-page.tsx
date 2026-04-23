import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Mail, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => signIn(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/profile");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.08),transparent_50%),linear-gradient(to_bottom,rgba(2,6,23,1),rgba(9,9,11,1))]" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Zap className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            RouteForge
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <h1 className="text-center text-xl font-semibold text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            Access AI models through a single API
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signin-email" className="text-sm text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/[0.08] bg-white/[0.04] pl-10 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-cyan-500/40"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signin-password" className="text-sm text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/[0.08] bg-white/[0.04] pl-10 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-cyan-500/40"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!email || !password || mutation.isPending}
              className="w-full bg-cyan-500 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 dark:text-slate-950"
            >
              {mutation.isPending ? "Signing in…" : "Sign in →"}
            </Button>
          </form>

          {mutation.error && (
            <p className="mt-3 text-center text-sm text-red-400">
              {(mutation.error as Error).message || "Invalid credentials"}
            </p>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-foreground underline decoration-muted-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          By signing in, you agree to our{" "}
          <Link to="/terms" className="underline underline-offset-2 hover:text-muted-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
