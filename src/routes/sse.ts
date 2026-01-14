import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Env } from '../types/env';

const sse = new Hono<Env>();

sse.get('/stream', async (c) => {
  const maxMessages = Number(c.req.query('max')) || 100; // 默认100消息，避免无限循环
  return streamSSE(c, async (stream) => {
    let id = 0;
    while (id < maxMessages) {
      const message = `It is ${new Date().toISOString()}`;
      await stream.writeSSE({
        data: message,
        event: 'time-update',
        id: String(id++),
      });
      await stream.sleep(1000);
    }
  });
});

export default sse;
