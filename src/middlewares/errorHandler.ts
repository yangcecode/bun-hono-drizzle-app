import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types/env";

/**
 * 全局错误处理中间件
 */
export async function errorHandler(err: Error, c: Context<Env>) {
  console.error("[Error]", err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if (err instanceof Error) {
    return c.json(
      {
        error: err.message,
      },
      500
    );
  }

  return c.json({ error: "Internal Server Error" }, 500);
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
