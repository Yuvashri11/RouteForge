import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, onrampCredits } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, CreditCard, LogOut, Mail, Shield } from "lucide-react";
import { Navigate } from "react-router-dom";

export function ProfilePage() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const onrampMutation = useMutation({
    mutationFn: onrampCredits,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const profile = profileQuery.data;

  // Loading state
  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not logged in
  if (!profile) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage your profile and credit wallet.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Profile Info */}
        <Card className="border-border bg-card/60 py-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Shield className="size-4 text-cyan-500 dark:text-cyan-300" />
              Profile
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your account details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-cyan-500/10 text-cyan-500">
                  <Mail className="size-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Email
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {profile.email}
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-border bg-accent/50 text-foreground hover:bg-accent"
              onClick={() => {
                // Clear auth cookie by navigating — for now just redirect
                document.cookie = "auth=; max-age=0; path=/";
                queryClient.invalidateQueries({ queryKey: ["profile"] });
                window.location.href = "/signin";
              }}
            >
              <LogOut className="mr-1.5 size-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Credits */}
        <Card className="border-border bg-card/60 py-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <CreditCard className="size-4 text-cyan-500 dark:text-cyan-300" />
              Credits
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your API usage wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Available Credits
              </p>
              <p className="mt-1 text-3xl font-semibold text-cyan-600 dark:text-cyan-200">
                {profile.credits.toLocaleString()}
              </p>
            </div>

            <Button
              className="w-full bg-emerald-500 text-white transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/15 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
              onClick={() => onrampMutation.mutate()}
              disabled={onrampMutation.isPending}
            >
              <Coins className="mr-1.5 size-4" />
              {onrampMutation.isPending ? "Adding credits…" : "Add 1,000 Credits"}
            </Button>

            {onrampMutation.isSuccess && (
              <p className="text-center text-sm text-emerald-600 dark:text-emerald-300">
                Credits added successfully!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
