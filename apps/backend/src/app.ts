import { Elysia } from "elysia";
import { authRoutes } from "./auth";
import { apiKeyRoutes } from "./apiKeys";
import { modelRoutes } from "./models";
import { paymentRoutes } from "./payments";
import { events } from "./events";
import { metricsRoutes } from "./metrics";

export const app = new Elysia()
  .get("/", () => ({ status: "ok", name: "RouteForge API" }))
  .use(authRoutes)
  .use(apiKeyRoutes)
  .use(modelRoutes)
  .use(paymentRoutes)
  .use(metricsRoutes)
  .use(events);

export type App = typeof app;
