# 开发规范

## 📁 项目结构

```
src/
├── db/                  # 数据库相关
│   ├── schema.ts       # 数据库表结构定义
│   └── index.ts        # DB 实例导出
├── routes/              # API 路由模块
│   ├── users.ts
│   └── index.ts        # 路由聚合导出
├── services/            # 业务逻辑层
├── middlewares/         # Hono 中间件
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
├── config/              # 配置文件
└── index.ts             # 应用入口
```

## 📋 代码组织原则

| 层级           | 职责                                        |
| -------------- | ------------------------------------------- |
| `routes/`      | 处理 HTTP 请求/响应，参数验证，调用 service |
| `services/`    | 业务逻辑，调用 db 层                        |
| `db/`          | 数据库 schema 和查询                        |
| `middlewares/` | 跨路由的通用逻辑                            |
| `types/`       | 所有 TypeScript 类型定义                    |
| `utils/`       | 纯函数工具                                  |

## 📝 命名规范

| 类型      | 规范             | 示例                   |
| --------- | ---------------- | ---------------------- |
| 文件名    | camelCase        | `userService.ts`       |
| 变量/函数 | camelCase        | `getUserById()`        |
| 类型/接口 | PascalCase       | `UserResponse`         |
| 常量      | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`      |
| 数据库表  | snake_case       | `users`, `order_items` |

## 🔀 路由设计

### 路由文件结构

```typescript
// src/routes/xxx.ts
import { Hono } from "hono";
import type { Env } from "../types/env";

const xxxRoute = new Hono<Env>();

xxxRoute.get("/", async (c) => { ... });
xxxRoute.get("/:id", async (c) => { ... });
xxxRoute.post("/", async (c) => { ... });

export default xxxRoute;
```

### 路由注册

```typescript
// src/routes/index.ts
import xxxRoute from "./xxx";

routes.route("/xxx", xxxRoute);
```

## 📦 NPM Scripts

| 命令                       | 说明                      |
| -------------------------- | ------------------------- |
| `bun run dev`              | 启动本地开发服务器        |
| `bun run deploy`           | 部署到 Cloudflare Workers |
| `bun run db:generate`      | 生成数据库迁移文件        |
| `bun run db:migrate:local` | 应用迁移到本地数据库      |
| `bun run db:migrate`       | 应用迁移到远程数据库      |

## 📝 Git 提交规范

使用 Conventional Commits：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/依赖更新

示例：`feat: add user authentication`
