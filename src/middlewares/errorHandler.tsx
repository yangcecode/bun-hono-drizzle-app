import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types/env';
import { NotFound } from '../pages/NotFound';

/**
 * 全局错误处理中间件
 */
export async function errorHandler(err: Error, c: Context<Env>) {
  console.error('[Error]', err);

  // 如果是 Hono 的 HTTPException，直接返回 response
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  // 区分环境：生产环境隐藏错误详情
  const isProduction = c.env.ENVIRONMENT === 'production';
  const errorMessage = isProduction ? 'Internal Server Error' : err.message;

  return c.json(
    {
      error: errorMessage,
    },
    500
  );
}

/**
 * 404 处理中间件
 */
export async function notFoundHandler(c: Context<Env>) {
  return c.html(<NotFound />);
}
