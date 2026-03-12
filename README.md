# Vitarx Router

Vitarx 前端框架官方路由解决方案，提供声明式路由配置、导航守卫、动态路由匹配、文件系统路由等企业级功能。

[![npm version](https://img.shields.io/npm/v/vitarx-router.svg)](https://www.npmjs.com/package/vitarx-router)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 仓库结构

这是一个基于 [pnpm workspace](https://pnpm.io/workspaces) 的 Monorepo 项目，包含以下包：

| 包名                                                | 说明                        |
|---------------------------------------------------|---------------------------|
| [`vitarx-router`](./packages/router)              | 核心路由库，包含路由器实现、组件、Vite 插件等 |
| [`demo`](./packages/demo)                         | 手动定义路由示例项目，演示路由库的使用方式     |
| [`demo-auto-router`](./packages/demo-auto-router) | 自动化文件路由示例项目，演示自动化文件路由功能   |


## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动示例项目
cd packages/demo
pnpm dev

# 运行测试
pnpm test

# 运行测试（监听模式）
pnpm test:watch
```

### 构建项目

```bash
cd packages/router
pnpm build
```

## 技术栈

- **构建工具**: [Vite](https://vitejs.dev/) 7.x
- **包管理**: [pnpm](https://pnpm.io/) 10.x
- **测试框架**: [Vitest](https://vitest.dev/) 4.x
- **类型检查**: [TypeScript](https://www.typescriptlang.org/) 5.x
- **代码规范**: [Prettier](https://prettier.io/)
- **提交规范**: [Commitlint](https://commitlint.js.org/) + [Husky](https://typicode.github.io/husky/)

## 核心功能

### 🚀 多种路由模式

- **Hash 模式**: 使用 URL hash，无需服务器配置
- **History 模式**: 使用 HTML5 History API，需要服务器支持
- **Memory 模式**: 不修改 URL，适用于非浏览器环境

### 📁 文件系统路由

基于 Vite 插件自动生成路由配置：

```
src/pages/
├── index.tsx        → /
├── about.tsx        → /about
└── users/
    ├── index.tsx    → /users
    └── [id].tsx     → /users/{id}
```

### 🔒 导航守卫

完整的路由守卫机制：

```typescript
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { index: '/login' }
  }
})
```

### 🔄 动态路由

支持动态参数、可选参数、正则约束：

```typescript
const routes = defineRoutes(
  { path: '/user/{id}', component: User },
  { path: '/search/{query?}', component: Search },
  { path: '/post/{id}', component: Post, pattern: { id: /^\d+$/ } }
)
```

## 包说明

### vitarx-router

核心路由库，提供：

- **路由器核心**: `createRouter`、`defineRoutes` 等 API
- **路由组件**: `RouterView`、`RouterLink`
- **组合式 API**: `useRouter`、`useRoute`
- **Vite 插件**: 文件系统路由自动生成
- **类型支持**: 完整的 TypeScript 类型定义

详细文档请参考 [packages/router/README.md](./packages/router/README.md)。

### demo

示例项目，演示：

- 基本路由配置
- 嵌套路由
- 动态路由
- 导航守卫
- 文件系统路由

## 开发指南

### 目录结构

```
vitarx-router/
├── packages/
│   ├── router/                 # 核心路由库
│   │   ├── src/
│   │   │   ├── core/          # 路由器核心实现
│   │   │   │   ├── normalize/ # 标准化处理
│   │   │   │   └── types/     # 类型定义
│   │   │   ├── components/    # 路由组件 (RouterView, RouterLink)
│   │   │   └── vite/          # Vite 插件
│   │   │       ├── auto-routes/ # 自动路由生成
│   │   │       └── core/       # 插件核心逻辑
│   │   ├── tests/             # 测试文件
│   │   └── package.json
│   ├── demo/                   # 手动定义路由示例项目
│   │   ├── src/
│   │   │   ├── pages/         # 页面组件
│   │   │   └── router/        # 路由配置
│   │   └── package.json
│   └── demo-auto-router/       # 自动化文件路由示例项目
│       ├── src/
│       │   ├── pages/         # 文件系统路由页面
│       │   │   ├── admin/     # 管理页面
│       │   │   ├── post/      # 文章详情
│       │   │   ├── user/      # 用户页面
│       │   │   └── users/     # 用户列表
│       │   └── router/        # 路由配置
│       └── package.json
├── package.json               # 根 package.json
├── pnpm-workspace.yaml        # pnpm workspace 配置
└── tsconfig.json              # TypeScript 配置
```

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构/优化
test: 测试相关
chore: 构建/工具相关
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
cd packages/router
pnpm test -- --grep "router-core"

# 生成测试覆盖率报告
pnpm test -- --coverage
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 版本发布

```bash
cd packages/router
pnpm version [patch|minor|major]
pnpm publish
```

## 相关链接

- [Vitarx 官网](https://vitarx.cn/)
- [路由文档](https://router.vitarx.cn/)
- [GitHub Issues](https://github.com/vitarx/vitarx-router/issues)

## License

[MIT](./LICENSE) © 2024-present ZhuChongLin
