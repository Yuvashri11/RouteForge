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
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return proxyToBackend(req, backendPathFromApi(req));
    }

    return index;
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
