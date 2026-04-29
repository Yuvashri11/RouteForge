import { app } from "./app";

const port = Number(process.env.PORT ?? 4000);

app.listen(port);

console.log(
  `🚀 RouteForge API Gateway is running at ${app.server?.hostname}:${app.server?.port}`,
);
