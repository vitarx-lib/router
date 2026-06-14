# API 参考

本节包含 vitarx-router 所有公共 API 的详细参考文档，包括路由工厂函数、Router 实例方法、类型接口、组件、组合式函数、导航工具以及文件路由插件。

## 路由工厂

- [createRouter()](./1.router-factory.md#createrouter) — 自动检测环境创建路由实例
- [createWebRouter()](./1.router-factory.md#createwebrouter) — 创建 Web 路由实例
- [createMemoryRouter()](./1.router-factory.md#creatememoryrouter) — 创建内存模式路由实例
- [defineRoutes()](./1.router-factory.md#defineroutes) — 定义路由表
- [RouteManager](./1.router-factory.md#routemanager) — 路由注册表管理器

## Router 实例

- [router.push()](./2.router-instance.md#push) — 编程式导航
- [router.replace()](./2.router-instance.md#replace) — 替换当前路由
- [router.go()](./2.router-instance.md#go) — 历史记录导航
- [router.back()](./2.router-instance.md#back) — 后退
- [router.forward()](./2.router-instance.md#forward) — 前进
- [router.beforeEach()](./2.router-instance.md#beforeeach) — 注册全局前置守卫
- [router.afterEach()](./2.router-instance.md#aftereach) — 注册全局后置钩子
- [router.addRoute()](./2.router-instance.md#addroute) — 动态添加路由
- [router.removeRoute()](./2.router-instance.md#removeroute) — 动态移除路由
- [router.hasRoute()](./2.router-instance.md#hasroute) — 检查路由是否存在
- [router.init()](./2.router-instance.md#init) — 手动初始化路由
- [router.isReady()](./2.router-instance.md#isready) — 等待路由就绪
- [router.destroy()](./2.router-instance.md#destroy) — 销毁路由实例
- [router.route](./2.router-instance.md#route) — 当前路由信息
- [router.routes](./2.router-instance.md#routes) — 路由记录数组

## 路由位置

- [RouteLocation](./3.route-location.md#routelocation) — 路由位置对象
- [RouteRecord](./3.route-location.md#routerecord) — 路由记录对象

## 组件

- [RouterView](./4.components.md#routerview) — 路由视图组件
- [RouterLink](./4.components.md#routerlink) — 路由链接组件

## 组合式函数

- [useRouter()](./5.hooks.md#userouter) — 获取路由实例
- [useRoute()](./5.hooks.md#useroute) — 获取当前路由信息
- [useLink()](./5.hooks.md#uselink) — 创建链接助手
- [onBeforeRouteLeave()](./5.hooks.md#onbeforerouteleave) — 组件内离开守卫
- [onBeforeRouteUpdate()](./5.hooks.md#onbeforerouteupdate) — 组件内更新守卫

## 导航

- [NavigateResult](./6.navigation.md#navigateresult) — 导航结果
- [NavState](./6.navigation.md#navstate) — 导航状态枚举
- [hasSuccess()](./6.navigation.md#hassuccess) — 检查导航是否成功
- [hasState()](./6.navigation.md#hasstate) — 按位检查导航状态

## 文件路由

- [FileRouter](./7.file-router.md#filerouter) — 文件路由管理器
- [FileRouterOptions](./7.file-router.md#filerouteroptions) — 文件路由配置选项
- [definePage()](./7.file-router.md#definepage) — 页面路由配置宏

## Vite 插件

- [VitarxRouter()](./8.vite-plugin.md#vitarxrouter) — Vite 文件路由插件
- [handleHotUpdate()](./8.vite-plugin.md#handlehotupdate) — 路由热更新处理
