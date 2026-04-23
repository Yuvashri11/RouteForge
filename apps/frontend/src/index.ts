import { serve } from "bun";
import index from "./index.html";

const backendOrigin = process.env.BACKEND_URL ?? "http://localhost:3000";

function requestPath(req: Request) {
  const url = new URL(req.url);
  return `${url.pathname}${url.search}`;
}

async function proxyToBackend(req: Request, path: string) {
  const target = new URL(path, backendOrigin);
  const bodyAllowed = req.method !== "GET" && req.method !== "HEAD";

  const response = await fetch(target, {
    method: req.method,
    headers: req.headers,
    body: bodyAllowed ? req.body : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

const server = serve({
  port: 5173,
  routes: {
    "/auth/*": (req) => proxyToBackend(req, requestPath(req)),
    "/api-keys/*": (req) => proxyToBackend(req, requestPath(req)),
    "/models/*": (req) => proxyToBackend(req, requestPath(req)),
    "/payments/*": (req) => proxyToBackend(req, requestPath(req)),

    "/auth": (req) => proxyToBackend(req, "/auth"),
    "/api-keys": (req) => proxyToBackend(req, "/api-keys"),
    "/models": (req) => proxyToBackend(req, "/models"),
    "/payments": (req) => proxyToBackend(req, "/payments"),

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
