import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { chatRoutes } from "./chat";

export const app = new Elysia()
  .use(cors())
  .get("/", () => ({ status: "ok", name: "RouteForge API Gateway" }))
  .use(chatRoutes);

export type App = typeof app;

