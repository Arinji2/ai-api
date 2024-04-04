import { Hono } from "hono";
import { logger } from "hono/logger";
import CompletionsRouter from "./routes/Completions";

const app = new Hono();

app.use("*", logger());
app.route("/completions", CompletionsRouter);

Bun.serve({
  fetch: app.fetch,

  port: process.env.PORT || 3000,
});
