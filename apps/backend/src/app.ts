import { Elysia } from "elysia";
import { authRoutes } from "./auth";
import { apiKeyRoutes } from "./apiKeys";
import { modelRoutes } from "./models";
import { paymentRoutes } from "./payments";

export const app = new Elysia()
  .get("/", () => ({ status: "ok", name: "RouteForge API" }))
  .use(authRoutes)
  .use(apiKeyRoutes)
  .use(modelRoutes)
  .use(paymentRoutes);

export type App = typeof app;
