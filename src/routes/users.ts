import { Hono } from "hono";
import { createDb, users } from "../db";
import { eq } from "drizzle-orm";
import type { Env } from "../types/env";

const usersRoute = new Hono<Env>();

/**
 * GET /users - 获取所有用户
 */
usersRoute.get("/", async (c) => {
  const db = createDb(c.env.my_db);
  const result = await db.select().from(users).all();
  return c.json(result);
});

/**
 * GET /users/:id - 根据 ID 获取用户
 */
usersRoute.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Invalid user ID" }, 400);
  }

  const db = createDb(c.env.my_db);
  const result = await db.select().from(users).where(eq(users.id, id)).get();

  if (!result) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(result);
});

/**
 * POST /users - 创建新用户
 */
usersRoute.post("/", async (c) => {
  const body = await c.req.json<{ name: string; email: string }>();

  if (!body.name || !body.email) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const db = createDb(c.env.my_db);
  const result = await db
    .insert(users)
    .values({
      name: body.name,
      email: body.email,
      createdAt: new Date(),
    })
    .returning();

  return c.json(result[0], 201);
});

/**
 * DELETE /users/:id - 删除用户
 */
usersRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Invalid user ID" }, 400);
  }

  const db = createDb(c.env.my_db);
  const result = await db.delete(users).where(eq(users.id, id)).returning();

  if (result.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ message: "User deleted successfully" });
});

export default usersRoute;
