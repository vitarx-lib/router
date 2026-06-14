# 文件系统路由

文件系统路由（File-based Routing）是一种基于文件目录结构自动生成路由配置的方式。你只需在指定的页面目录下创建文件，路由规则就会自动生成，无需手动维护路由表。

vitarx-router 提供了 Vite 插件，支持文件监听、热更新、`definePage` 宏、布局路由等功能，让路由开发更加高效。

::: info
文件系统路由是 vitarx-router 的可选功能，你也可以继续使用手动定义路由的方式。
:::

## 本章内容

- [插件配置](./1.setup.md) — 安装与配置 Vite 文件路由插件
- [文件约定](./2.file-conventions.md) — 文件命名规则与路由生成逻辑
- [definePage 宏](./3.define-page.md) — 在页面中声明路由配置
- [布局路由](./4.layout-routes.md) — 使用布局组件组织页面
- [热更新](./5.hmr.md) — 开发模式下的路由热更新
