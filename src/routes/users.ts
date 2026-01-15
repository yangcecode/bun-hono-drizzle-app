import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types/env';
import { UserService } from '../services/users';

const usersRoute = new Hono<Env>();

// Schema 定义
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
});

/**
 * GET /users - 获取所有用户
 */
usersRoute.get('/', async (c) => {
  const userService = new UserService(c.var.db);
  const result = await userService.getAll();
  return c.json(result);
});

/**
 * GET /users/:id - 根据 ID 获取用户
 */
usersRoute.get(
  '/:id',
  zValidator(
    'param',
    z.object({
      id: z.string().regex(/^\d+$/, 'ID must be a number'),
    })
  ),
  async (c) => {
    const id = Number(c.req.valid('param').id);
    const userService = new UserService(c.var.db);
    const result = await userService.getById(id);

    if (!result) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(result);
  }
);

/**
 * POST /users - 创建新用户
 */
usersRoute.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');
  const userService = new UserService(c.var.db);
  const result = await userService.create(data);

  return c.json(result[0], 201);
});

/**
 * DELETE /users/:id - 删除用户
 */
usersRoute.delete(
  '/:id',
  zValidator(
    'param',
    z.object({
      id: z.string().regex(/^\d+$/, 'ID must be a number'),
    })
  ),
  async (c) => {
    const id = Number(c.req.valid('param').id);
    const userService = new UserService(c.var.db);
    const result = await userService.delete(id);

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'User deleted successfully' });
  }
);

export default usersRoute;
