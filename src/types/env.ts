/**
 * Cloudflare Workers 环境变量绑定类型
 */
export type Bindings = {
  /** D1 数据库绑定 */
  my_db: D1Database;
  /** 运行环境 */
  ENVIRONMENT: string;
  // 在此添加其他绑定
  // MY_KV: KVNamespace;
  // MY_BUCKET: R2Bucket;
  // AI: Ai;
};

import type { Database } from '../db';

/**
 * Hono 应用上下文变量类型
 */
export type Variables = {
  db: Database;
  // 在此添加自定义上下文变量
  // user: User;
};

/**
 * Hono 应用环境类型
 */
export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
