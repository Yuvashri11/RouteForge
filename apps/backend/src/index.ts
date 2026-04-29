import { app } from "./app";

const port = Number(process.env.PORT ?? 3000);

app.listen(port);

console.log(
  `🦊 RouteForge API is running at ${app.server?.hostname}:${app.server?.port}`,
);
