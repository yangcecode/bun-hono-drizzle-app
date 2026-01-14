import { Hono } from 'hono';
import { users } from '../db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Env } from '../types/env';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
});

const usersRoute = new Hono<Env>();

/**
 * GET /users - 获取所有用户
 */
usersRoute.get('/', async (c) => {
  const db = c.var.db;
  const result = await db.select().from(users).all();
  return c.json(result);
});

/**
 * GET /users/:id - 根据 ID 获取用户
 */
usersRoute.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  const db = c.var.db;
  const result = await db.select().from(users).where(eq(users.id, id)).get();

  if (!result) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(result);
});

/**
 * POST /users - 创建新用户
 */
usersRoute.post('/', async (c) => {
  const body = await c.req.json();

  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: validation.error.issues }, 400);
  }

  const { name, email } = validation.data;

  const db = c.var.db;
  const result = await db
    .insert(users)
    .values({
      name,
      email,
      createdAt: new Date(),
    })
    .returning();

  return c.json(result[0], 201);
});

/**
 * DELETE /users/:id - 删除用户
 */
usersRoute.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  const db = c.var.db;
  const result = await db.delete(users).where(eq(users.id, id)).returning();

  if (result.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ message: 'User deleted successfully' });
});

export default usersRoute;
