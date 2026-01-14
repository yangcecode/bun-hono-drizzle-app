import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

/**
 * 创建 Drizzle 数据库实例
 * @param d1 - Cloudflare D1 数据库绑定
 * @returns Drizzle 数据库实例
 */
export function createDb(d1: D1Database): Database {
  return drizzle(d1, { schema });
}

// 导出所有 schema
export * from "./schema";
