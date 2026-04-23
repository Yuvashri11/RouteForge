import { app } from "./app";

app.listen(4000);

console.log(
  `🚀 RouteForge API Gateway is running at ${app.server?.hostname}:${app.server?.port}`,
);
