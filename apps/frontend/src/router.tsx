import { AppShell } from "@/components/layout/app-shell";
import { ChatPage } from "@/pages/chat-page";
import { DocsPage } from "@/pages/docs-page";
import { HomePage } from "@/pages/home-page";
import { KeysPage } from "@/pages/keys-page";
import { ModelDetailPage } from "@/pages/model-detail-page";
import { ModelsPage } from "@/pages/models-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { PricingPage } from "@/pages/pricing-page";
import { ProfilePage } from "@/pages/profile-page";
import { RankingsPage } from "@/pages/rankings-page";
import { SignInPage } from "@/pages/signin-page";
import { SignUpPage } from "@/pages/signup-page";
import { createBrowserRouter, Navigate } from "react-router-dom";

const placeholder = (title: string) => () => (
  <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 text-muted-foreground sm:px-6 lg:px-8">
    <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
    <p className="mt-2 text-sm text-muted-foreground">
      This page is part of the mock-first frontend scope and will be expanded
      next.
    </p>
  </div>
);

export const router = createBrowserRouter([
  // Auth pages — outside AppShell (no navbar/footer)
  { path: "/signin", element: <SignInPage /> },
  { path: "/signup", element: <SignUpPage /> },

  // Redirect legacy /auth to /signin
  { path: "/auth", element: <Navigate to="/signin" replace /> },

  // Main app layout
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "models", element: <ModelsPage /> },
      { path: "models/:modelId", element: <ModelDetailPage /> },
      { path: "keys", element: <KeysPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "rankings", element: <RankingsPage /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "docs", element: <DocsPage /> },
      { path: "apps", element: placeholder("Apps")() },
      { path: "enterprise", element: placeholder("Enterprise")() },
      { path: "status", element: placeholder("Status")() },
      { path: "about", element: placeholder("About")() },
      { path: "privacy", element: placeholder("Privacy")() },
      { path: "terms", element: placeholder("Terms")() },
      { path: "support", element: placeholder("Support")() },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
