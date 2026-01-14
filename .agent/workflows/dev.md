---
description: 开发工作流程 - 从数据库设计到部署的完整流程
---

# 开发工作流程

// turbo-all

## 1. 数据库 Schema 修改

编辑 `src/db/schema.ts` 添加或修改表结构。

## 2. 生成迁移文件

```bash
bun run db:generate
```

## 3. 应用迁移到本地数据库

```bash
bun run db:migrate:local
```

## 4. 启动本地开发服务器

```bash
bun run dev
```

## 5. 测试 API

使用浏览器或 curl 测试 API：

- 健康检查: `GET http://localhost:8787/health`
- 获取用户列表: `GET http://localhost:8787/api/users`
- 创建用户: `POST http://localhost:8787/api/users` (JSON body: `{"name": "...", "email": "..."}`)

## 6. 应用迁移到远程数据库

```bash
bun run db:migrate
```

## 7. 部署到 Cloudflare Workers

```bash
bun run deploy
```

---

## 添加新功能的步骤

1. **添加新表** (如需要): 编辑 `src/db/schema.ts`
2. **创建路由文件**: `src/routes/xxx.ts`
3. **注册路由**: 在 `src/routes/index.ts` 中添加 `routes.route("/xxx", xxxRoute)`
4. **添加业务逻辑** (如需要): `src/services/xxxService.ts`
5. **添加类型定义** (如需要): `src/types/xxx.ts`
