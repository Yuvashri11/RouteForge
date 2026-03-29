import { Elysia } from "elysia";
import { authRoutes } from "./auth";
import { apiKeyRoutes } from "./apiKeys";
import { modelRoutes } from "./models";

const app = new Elysia()
  .get("/", () => ({ status: "ok", name: "RouteForge API" }))
  .use(authRoutes)
  .use(apiKeyRoutes)
  .use(modelRoutes)
  .listen(3000);

console.log(
  `🦊 RouteForge API is running at ${app.server?.hostname}:${app.server?.port}`
);
