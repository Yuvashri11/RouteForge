import { treaty } from "@elysiajs/eden";
import type { App as BackendApp } from "../../../../backend/src/app";

const backendUrl =
  typeof window === "undefined"
    ? process.env.BACKEND_URL ?? "http://localhost:3000"
    : `${window.location.origin}/api`;

export const api = treaty<BackendApp>(backendUrl, {
  fetch: {
    credentials: "include",
  },
  throwHttpError: false,
});
