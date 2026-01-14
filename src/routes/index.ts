import { Hono } from "hono";
import type { Env } from "../types/env";
import usersRoute from "./users";

const routes = new Hono<Env>();

// 注册所有路由
routes.route("/users", usersRoute);

// 在此添加更多路由
// routes.route("/posts", postsRoute);

export default routes;
