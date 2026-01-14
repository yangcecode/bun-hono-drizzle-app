import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { createDb } from './db';

import { Index } from './pages/Index';

const app = new Hono<Env>();

// ==================== 中间件 ====================
app.use('/api/*', logger());
app.use('/api/*', cors());
app.use('*', (c, next) => {
  c.set('db', createDb(c.env.my_db));
  return next();
});
app.onError(errorHandler);

// ==================== 路由 ====================
// 首页
app.get('/', (c) => {
  return c.html(<Index title="Index" time={new Date().toISOString()} />);
});

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`);
        ws.send('Hello from server!');
      },
      onClose: () => {
        console.log('Connection closed');
      },
    };
  })
);

// API 路由
app.route('/api', routes);

// 404 处理
app.notFound(notFoundHandler);

export default app;
