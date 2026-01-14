import type { Context, Next } from "hono";
import type { Env } from "../types/env";

/**
 * 全局错误处理中间件
 */
export async function errorHandler(c: Context<Env>, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error("[Error]", error);

    if (error instanceof Error) {
      return c.json(
        {
          error: error.message,
        },
        500
      );
    }

    return c.json({ error: "Internal Server Error" }, 500);
  }
}

/**
 * 404 处理中间件
 */
export async function notFoundHandler(c: Context<Env>) {
  return c.json(
    {
      error: "Not Found",
      path: c.req.path,
    },
    404
  );
}
