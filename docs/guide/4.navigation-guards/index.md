# 导航守卫

导航守卫是 vitarx-router 提供的路由拦截机制，允许你在导航过程中执行逻辑判断，决定是否放行、拦截或重定向导航。通过守卫，你可以实现权限控制、数据预加载、页面离开确认等功能。

vitarx-router 提供了三种层级的守卫：全局守卫、路由独享守卫和组件内守卫，每种守卫在导航流程的不同阶段执行。

## 本章内容

- [全局守卫](./1.global-guards.md) — beforeEach 与 afterEach
- [路由独享守卫](./2.per-route-guards.md) — beforeEnter 配置
- [组件内守卫](./3.component-guards.md) — onBeforeRouteLeave 与 onBeforeRouteUpdate
- [完整导航流程](./4.complete-flow.md) — 导航解析的完整流程
