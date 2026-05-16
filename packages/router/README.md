# Vitarx Router

Vitarx 前端框架官方路由解决方案，提供声明式路由配置、导航守卫、动态路由匹配、文件系统路由等企业级功能。

[![npm version](https://img.shields.io/npm/v/vitarx-router.svg)](https://www.npmjs.com/package/vitarx-router)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/fork-999999?style=social&logo=github)](https://github.com/vitarx-lib/router)
[![Documentation](https://img.shields.io/badge/docs-vitarx--router-blue)](https://router.vitarx.cn)

## 特性

- 🚀 **多种路由模式** - 支持 Hash、History、Memory 三种路由模式
- 📁 **文件路由** - 基于 Vite 插件的文件系统路由自动生成，HMR 热更新支持
- 🔒 **导航守卫** - 完整的路由守卫机制，支持权限控制
- 🔄 **动态路由** - 支持动态参数、正则约束、可选参数
- 📦 **懒加载** - 内置组件懒加载支持
- 🎯 **TypeScript** - 完整的类型支持
- 📜 **滚动行为** - 可自定义路由切换时的滚动行为
- 🔄 **路由别名** - 支持多路径映射到同一路由
- 🎨 **命名视图** - 支持多视图布局

## 安装

```bash
npm install vitarx-router
```

## 快速开始

### 1. 创建路由配置

```typescript
import { createRouter, defineRoutes } from 'vitarx-router'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'

const routes = defineRoutes(
  { path: '/', component: Home },
  { path: '/about', component: About }
)

export const router = createRouter({ routes })
```

### 2. 注册路由器

```typescript
import { createApp } from 'vitarx'
import { router } from './router'
import App from './App.jsx'

createApp(App).use(router).mount('#app')
```

### 3. 使用路由视图

```jsx
import { RouterView } from 'vitarx-router'

export default function App() {
  return (
    <div>
      <nav>
        <a href="/">首页</a>
        <a href="/about">关于</a>
      </nav>
      <RouterView />
    </div>
  )
}
```

## 路由模式

### Hash 模式（默认）

使用 URL hash 实现路由，无需服务器配置。

```typescript
createRouter({
  routes,
  mode: 'hash'
})
```

### History 模式

使用 HTML5 History API，需要服务器配置支持。

```typescript
createRouter({
  routes,
  mode: 'path'
})
```

**服务器配置（Nginx）：**

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Memory 模式

不修改 URL，适用于非浏览器环境或测试场景。

```typescript
import { createMemoryRouter } from 'vitarx-router'

createMemoryRouter({ routes })
```

### 手动初始化

默认情况下，`createRouter` / `createWebRouter` 会在创建实例后自动初始化路由器（执行初始导航并注册浏览器事件监听）。如果需要延迟初始化，可以使用 `createWebRouter` 并将第二个参数 `autoInit` 设为 `false`，然后手动调用 `init()` 方法。

```typescript
const router = createWebRouter({ routes }, false)

// 在合适的时机手动初始化
router.init()
```

**适用场景：**

- 需要在初始化前注册导航守卫
- 需要在初始化前完成异步配置加载
- 需要精确控制初始化时机

> **注意：** `autoInit` 仅对 Web 路由器有效。

## 路由配置

### 基本路由

```typescript
import { defineRoutes } from 'vitarx-router'

const routes = defineRoutes(
  { path: '/', component: Home },
  { path: '/about', component: About }
)
```

### 动态路由

支持动态参数、可选参数和正则约束：

```typescript
const routes = defineRoutes(
  { path: '/user/{id}', component: User },
  { path: '/search/{query?}', component: Search },
  { 
    path: '/post/{id}', 
    component: Post,
    pattern: { id: /^\d+$/ }
  }
)
```

### 嵌套路由

```typescript
const routes = defineRoutes({
  path: '/user',
  component: UserLayout,
  children: [
    { path: '/user/profile', component: Profile },
    { path: '/user/settings', component: Settings }
  ]
})
```

### 命名路由

```typescript
const routes = defineRoutes({
  path: '/user/{id}',
  name: 'user-detail',
  component: UserDetail
})

router.push({ index: 'user-detail', params: { id: '123' } })
```

### 路由别名

```typescript
const routes = defineRoutes(
  { path: '/home', component: Home, alias: '/main' },
  { path: '/users', component: Users, alias: ['/members', '/people'] }
)
```

### 重定向

```typescript
const routes = defineRoutes(
  { path: '/home', redirect: '/' },
  { path: '/old-user/{id}', redirect: { index: 'user-detail' } }
)
```

### 路由元数据

```typescript
const routes = defineRoutes({
  path: '/admin',
  component: Admin,
  meta: {
    requiresAuth: true,
    title: '管理后台'
  }
})
```

### 命名视图

```tsx
const routes = defineRoutes({
  path: '/settings',
  component: {
    default: SettingsMain,
    sidebar: SettingsSidebar
  }
});

// 模板中使用
<RouterView />
<RouterView name="sidebar" />
```

## 导航方法

### push

跳转到新路由，添加历史记录。

```typescript
router.push({ index: '/user/123' })
router.push({ index: 'user-detail', params: { id: '123' } })
router.push({ index: '/search', query: { q: 'keyword' } })
router.push('/user/123')
```

### replace

替换当前路由，不添加历史记录。

```typescript
router.replace({ index: '/login' })
```

### go

前进/后退指定步数。

```typescript
router.go(-1)
router.go(1)
router.go(2)
```

### back / forward

```typescript
router.back()
router.forward()
```

### 导航结果

```typescript
import { hasSuccess, NavState } from 'vitarx-router'

const result = await router.push({ index: '/home' })

if (hasSuccess(result)) {
  console.log('导航成功')
}
```

**导航状态：**

| 状态           | 值  | 说明       |
|--------------|----|----------|
| `success`    | 1  | 导航成功     |
| `aborted`    | 2  | 导航被守卫阻止  |
| `cancelled`  | 4  | 导航被新导航取消 |
| `duplicated` | 8  | 重复导航     |
| `notfound`   | 16 | 路由未匹配    |
| `external`   | 32 | 外部跳转     |

## 路由未匹配处理

当路由匹配失败（404）时，可以通过 `onNotFound` 钩子进行自定义处理。

### onNotFound 钩子

```typescript
import { createRouter } from 'vitarx-router'

const router = createRouter({
  routes: [],
  onNotFound(target) {
    // target.index 为用户尝试访问的目标
    console.log('路由未匹配:', target.index)
  }
})
```

**返回值说明：**

| 返回值                        | 说明                   |
|----------------------------|----------------------|
| `NavTarget` / `RouteIndex` | 重定向到新目标              |
| `RouteLocation`            | 作为未匹配路由的位置对象（渲染指定组件） |
| `void`                     | 不处理，返回 `notfound` 状态 |

### 重定向到 404 页面

```typescript
import { createRouter } from 'vitarx-router'

const router = createRouter({
  routes: [],
  onNotFound(target) {
    return { index: '/404' }
  }
})
```

### 渲染 404 组件（使用 createMissingRoute）

```typescript
import { createRouter, createMissingRoute } from 'vitarx-router'
import NotFoundPage from './pages/NotFound.jsx'

const router = createRouter({
  routes: [],
  onNotFound(target) {
    return createMissingRoute(NotFoundPage, target, {
      title: '页面未找到'
    })
  }
})
```

### 名称导航不匹配

名称导航（name-based）匹配失败时，路由器会直接抛出错误，因为名称导航是编程式调用，name 不存在属于代码 bug：

```typescript
// 如果 'userDetail' 路由不存在，将抛出错误
router.push({ index: 'userDetail', params: { id: '123' } })
```

## 导航守卫

### 全局前置守卫

```typescript
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { index: '/login' }
  }
})
```

### 全局后置守卫

```typescript
router.afterEach((to, from) => {
  document.title = to.meta.title || '默认标题'
})
```

### 路由级守卫

```typescript
const routes = defineRoutes({
  path: '/admin',
  component: Admin,
  beforeEnter: (to, from) => {
    if (!isAdmin()) {
      return { index: '/' }
    }
  }
})
```

### 组件内守卫

```typescript
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vitarx-router'

export default function UserComponent() {
  onBeforeRouteLeave((to, from) => {
    if (!window.confirm('确定要离开吗？')) return false
  })
  
  onBeforeRouteUpdate((to, from) => {
    console.log('路由参数更新', to.params)
  })
}
```

## 组件

### RouterView

渲染匹配的路由组件。

```jsx
<RouterView />
<RouterView name="sidebar" />
<RouterView>
  {(component, props, route) => (
    <Transition name="fade">
      <Dynamic is={component} {...props} memo />
    </Transition>
  )}
</RouterView>
```

### RouterLink

声明式导航链接。

```jsx
<RouterLink to="/">首页</RouterLink>
<RouterLink to={{ index: 'user-detail', params: { id: '123' } }}>
  用户详情
</RouterLink>
<RouterLink to="/about" replace>关于</RouterLink>
<RouterLink to="/" activeClass="active" exactActiveClass="exact-active">
  首页
</RouterLink>
```

## 组合式 API

### useRouter

获取路由器实例。

```typescript
import { useRouter } from 'vitarx-router'

const router = useRouter()
router.push({ index: '/home' })
```

### useRoute

获取当前路由信息。

```typescript
import { useRoute } from 'vitarx-router'

const route = useRoute()
const userId = route.params.id
const query = route.query
```

### useLink

创建链接助手。

```typescript
import { useLink } from 'vitarx-router'

const { href, route, isActive, isExactActive, navigate } = useLink({ to: '/home' })
```

## 文件路由

配合 Vite 插件实现基于文件系统的路由自动生成。

### 安装配置

```typescript
import VitarxRouter from 'vitarx-router/vite'

export default defineConfig({
  plugins: [
    VitarxRouter({
      pages: 'src/pages',
      pathStrategy: 'kebab',
      importMode: 'lazy',
      dts: 'router.d.ts'
    })
  ]
})
```

### 使用生成的路由

```typescript
import routes from 'virtual:vitarx-router:routes'
import { createRouter } from 'vitarx-router'

export const router = createRouter({ routes })
```

### 文件路由配置选项

请参考 [File Router 文档](src/file-router/README.md)。

## TypeScript 支持

### 扩展路由元数据类型

```typescript
declare module 'vitarx-router' {
  interface RouteMetaData {
    title?: string
    requiresAuth?: boolean
  }
}
```

### 扩展路由索引类型

```typescript
declare module 'vitarx-router' {
  interface RouteIndexMap {
    'user-detail': { params: { id: string } }
    '/search': { query: { q: string } }
  }
}
```

## API 参考

### 助手函数

| 函数                                             | 说明                        |
|------------------------------------------------|---------------------------|
| `createRouter(options)`                        | 创建路由器实例                   |
| `createWebRouter(options)`                     | 创建 Web 模式路由器              |
| `createMemoryRouter(options)`                  | 创建 Memory 模式路由器           |
| `createRouteManager(routes, options?)`         | 创建路由管理器                   |
| `defineRoutes(...routes)`                      | 定义路由表                     |
| `createMissingRoute(component, target, meta?)` | 创建未匹配路由的 RouteLocation    |
| `cloneRouteLocation(location)`                 | 克隆 RouteLocation          |
| `useRouter()`                                  | 获取路由器实例                   |
| `useRoute(global?)`                            | 获取当前路由信息                  |
| `useLink(options)`                             | 创建链接助手                    |
| `onBeforeRouteLeave(guard)`                    | 注册离开守卫                    |
| `onBeforeRouteUpdate(callback)`                | 注册更新钩子                    |
| `removeTrailingSlash(path)`                    | 删除路径末尾的斜杠                 |
| `normalizePath(path, removeTrailingSlash?)`    | 规范化路径                     |
| `parseQuery(queryString)`                      | 解析查询字符串                   |
| `stringifyQuery(query)`                        | 序列化查询对象                   |
| `isNavTarget(value)`                           | 检查一个值是否为导航目标对象            |
| `isNavIndex(value)`                            | 检查一个值是否为有效的导航索引           |
| `isRouteLocation(value)`                       | 检查一个值是否为 RouteLocation 对象 |
| `isRoutePath(index)`                           | 检查一个值是否为有效的路由路径           |
| `isExternalLink(href)`                         | 检查一个值是否为外部链接              |

### Router 实例方法

| 方法                         | 说明                    |
|----------------------------|-----------------------|
| `init()`                   | 手动初始化路由器（仅 WebRouter） |
| `push(target)`             | 跳转到新路由                |
| `replace(target)`          | 替换当前路由                |
| `go(delta)`                | 前进/后退指定步数             |
| `back()`                   | 后退一步                  |
| `forward()`                | 前进一步                  |
| `addRoute(route, parent?)` | 添加路由                  |
| `removeRoute(index)`       | 移除路由                  |
| `hasRoute(index)`          | 检查路由是否存在              |
| `matchRoute(target)`       | 匹配路由                  |
| `beforeEach(guard)`        | 添加前置守卫                |
| `afterEach(callback)`      | 添加后置回调                |
| `destroy()`                | 销毁路由器                 |

### Router 实例属性

| 属性        | 类型                              | 说明        |
|-----------|---------------------------------|-----------|
| `route`   | `ReadonlyObject<RouteLocation>` | 当前路由信息    |
| `routes`  | `RouteRecord[]`                 | 所有注册的路由记录 |
| `config`  | `ResolvedRouterConfig`          | 路由器配置     |
| `manager` | `RouteManager`                  | 路由管理器实例   |

## License

MIT
