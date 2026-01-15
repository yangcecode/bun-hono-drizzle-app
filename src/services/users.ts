import { eq } from 'drizzle-orm';
import { users } from '../db';
import type { Database } from '../db';

export class UserService {
  constructor(private db: Database) {}

  /**
   * 获取所有用户
   */
  async getAll() {
    return this.db.select().from(users).all();
  }

  /**
   * 根据 ID 获取用户
   */
  async getById(id: number) {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }

  /**
   * 创建用户
   */
  async create(data: { name: string; email: string }) {
    return this.db
      .insert(users)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
  }

  /**
   * 删除用户
   */
  async delete(id: number) {
    return this.db.delete(users).where(eq(users.id, id)).returning();
  }
}
