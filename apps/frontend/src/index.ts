import { serve } from "bun";
import index from "./index.html";

const backendOrigin = process.env.BACKEND_URL ?? "http://localhost:3000";

function requestPath(req: Request) {
  const url = new URL(req.url);
  return `${url.pathname}${url.search}`;
}

function backendPathFromApi(req: Request) {
  const url = new URL(req.url);
  const strippedPath = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  return `${strippedPath}${url.search}`;
}

function backendPathFromRequest(req: Request) {
  return requestPath(req);
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
  port: Number(process.env.PORT ?? 5173),
  routes: {
    "/auth/*": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/api-keys": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/api-keys/*": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/models": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/models/*": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/payments": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/payments/*": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/metrics": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/metrics/*": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/events": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/events/*": (req) => proxyToBackend(req, backendPathFromRequest(req)),
    "/api/*": (req) => proxyToBackend(req, backendPathFromApi(req)),
    "/api": (req) => proxyToBackend(req, "/"),
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
