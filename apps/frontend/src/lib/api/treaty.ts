import { treaty } from "@elysiajs/eden";
import type { App as BackendApp } from "../../../../backend/src/app";

const backendUrl =
  typeof window === "undefined"
    ? "http://localhost:3000"
    : window.location.origin;

export const api = treaty<BackendApp>(backendUrl, {
  fetch: {
    credentials: "include",
  },
  throwHttpError: false,
});
