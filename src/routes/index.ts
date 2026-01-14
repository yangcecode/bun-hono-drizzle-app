import { Hono } from 'hono';
import type { Env } from '../types/env';
import usersRoute from './users';
import sseRoute from './sse';

const routes = new Hono<Env>();

// 注册所有路由
routes.route('/users', usersRoute);
routes.route('/sse', sseRoute);

// 在此添加更多路由
// routes.route("/posts", postsRoute);

export default routes;
