import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./types/env";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

import { Index } from "./pages/Index";

const app = new Hono<Env>();

// ==================== 中间件 ====================
app.use("*", logger());
app.use("*", cors());
app.use("*", errorHandler);

// ==================== 路由 ====================
// 健康检查
app.get("/health", (c) => {
  return c.html(<Index title="Index" time={new Date().toISOString()} />);
});

import { SSEPage } from "./pages/SSEPage";
app.get("/demo/sse", (c) => {
  return c.html(<SSEPage />);
});

// API 路由
app.route("/api", routes);

// 404 处理
app.notFound(notFoundHandler);

export default app;
