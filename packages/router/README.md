# Vitarx Router

Vitarx 前端框架官方路由解决方案，提供声明式路由配置、导航守卫、动态路由匹配、文件系统路由等企业级功能。

[![npm version](https://img.shields.io/npm/v/vitarx-router.svg)](https://www.npmjs.com/package/vitarx-router)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/fork-999999?style=social&logo=github)](https://github.com/vitarx-lib/router)
[![Documentation](https://img.shields.io/badge/docs-vitarx--router-blue)](https://router.vitarx.cn)

## 目录

- [特性](#特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [路由模式](#路由模式)
- [路由配置](#路由配置)
- [导航方法](#导航方法)
- [导航守卫](#导航守卫)
- [组件](#组件)
- [组合式 API](#组合式-api)
- [路由对象](#路由对象)
- [路由选项](#路由选项)
- [TypeScript 支持](#typescript-支持)
- [文件路由](#文件路由)
- [API 参考](#api-参考)
- [License](#license)

## 特性

- 🚀 **多种路由模式** - 支持 Hash、History、Memory 三种路由模式
- 📁 **文件路由** - 基于 Vite 插件的文件系统路由自动生成
- 🔒 **导航守卫** - 完整的路由守卫机制，支持权限控制
- 🔄 **动态路由** - 支持动态参数、正则约束、可选参数
- 📦 **懒加载** - 内置组件懒加载支持
- 🎯 **TypeScript** - 完整的类型支持
- 📜 **滚动行为** - 可自定义路由切换时的滚动行为
- 🔄 **路由别名** - 支持多路径映射到同一路由
- 🎨 **命名视图** - 支持多视图布局

## 安装

```bash
# 使用 npm
npm install vitarx-router
# 或者使用 yarn
yarn add vitarx-router
# 或者使用 pnpm
pnpm add vitarx-router
```

## 快速开始

### 1. 创建路由配置

```typescript
// src/router/index.ts
import { createRouter, defineRoutes } from 'vitarx-router'
import Home from '../pages/Home.jsx'
import About from '../pages/About.jsx'

const routes = defineRoutes(
  { path: '/', component: Home },
  { path: '/about', component: About }
)

export const router = createRouter({ routes })
```

### 2. 注册路由器

```typescript
// src/main.ts
import { createApp } from 'vitarx'
import { router } from './router'
import App from './App.jsx'

createApp(App).use(router).mount('#app')
```

### 3. 使用路由视图

```jsx
// App.jsx
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

---

## 路由模式

### Hash 模式（默认）

使用 URL hash 实现路由，无需服务器配置。

```typescript
createRouter({
  routes,
  mode: 'hash'
})
// URL: https://example.com/#/user/123
```

### History 模式

使用 HTML5 History API，需要服务器配置支持。

```typescript
createRouter({
  routes,
  mode: 'path'
})
// URL: https://example.com/user/123
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

createMemoryRouter({
  routes
})
```

---

## 路由配置

### 基本路由

```typescript
import { defineRoutes } from 'vitarx-router'

const routes = defineRoutes(
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/contact', component: Contact }
)
```

### 动态路由

支持动态参数、可选参数和正则约束：

```typescript
const routes = defineRoutes(
  // 基本动态参数
  { path: '/user/{id}', component: User },
  
  // 可选参数
  { path: '/search/{query?}', component: Search },
  
  // 带正则约束
  { 
    path: '/post/{id}', 
    component: Post,
    pattern: { id: /^\d+$/ }  // 只匹配数字
  }
)
```

**参数说明：**
- `{id}` - 必填参数
- `{id?}` - 可选参数
- `pattern` - 正则约束，用于精确匹配

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

// 导航时使用名称
router.push({ index: 'user-detail', params: { id: '123' } })
```

### 路由别名

支持单个或多个别名：

```typescript
const routes = defineRoutes(
  // 单个别名
  { path: '/home', component: Home, alias: '/main' },
  
  // 多个别名
  { path: '/users', component: Users, alias: ['/members', '/people'] },
  
  // 动态路由别名
  { path: '/users/{id}', component: User, alias: '/members/{id}' }
)
```

### 重定向

支持字符串、对象和函数形式的重定向：

```typescript
const routes = defineRoutes(
  // 字符串重定向
  { path: '/home', redirect: '/' },
  
  // 对象重定向
  { path: '/old-user/{id}', redirect: { index: 'user-detail' } },
  
  // 函数重定向
  {
    path: '/search/{query}',
    redirect: (to) => {
      return { index: 'search-results', query: { q: to.params.query } }
    }
  }
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

支持多个命名视图：

```jsx
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

### 路由参数注入

支持多种方式向组件注入参数：

```typescript
const routes = defineRoutes(
  // 注入动态参数到组件 props
  { path: '/user/{id}', component: User, props: true },
  
  // 注入静态对象
  { path: '/about', component: About, props: { showFooter: true } },
  
  // 使用函数动态注入
  { 
    path: '/search/{query}', 
    component: Search, 
    props: (route) => ({ 
      query: route.params.query,
      page: route.query.page 
    }) 
  }
)
```

---

## 导航方法

### push

跳转到新路由，添加历史记录。

```typescript
// 路径导航
router.push({ index: '/user/123' })

// 命名导航
router.push({ index: 'user-detail', params: { id: '123' } })

// 带查询参数
router.push({ index: '/search', query: { q: 'keyword' } })

// 带 hash
router.push({ index: '/about', hash: '#section' })

// 也支持直接传入路径字符串
router.push('/user/123')

// 或传入 RouteLocation 对象
router.push(routeLocation)
```

**返回值：** `Promise<NavigateResult>`

### replace

替换当前路由，不添加历史记录。

```typescript
router.replace({ index: '/login' })
```

**返回值：** `Promise<NavigateResult>`

### go

前进/后退指定步数。

```typescript
router.go(-1)    // 后退一步
router.go(1)     // 前进一步
router.go(2)     // 前进两步
router.go()      // 刷新当前页面
```

### back / forward

后退/前进一步。

```typescript
router.back()    // 等同于 router.go(-1)
router.forward() // 等同于 router.go(1)
```

### 导航结果

所有导航方法返回 `NavigateResult` 对象：

```typescript
interface NavigateResult {
  state: NavState      // 导航状态
  message: string      // 状态描述
  to: RouteLocation | null   // 目标路由
  from: RouteLocation        // 来源路由
  redirectFrom?: RouteLocation  // 重定向来源
}
```

**导航状态枚举：**

| 状态           | 值  | 说明       |
|--------------|----|----------|
| `success`    | 1  | 导航成功     |
| `aborted`    | 2  | 导航被守卫阻止  |
| `cancelled`  | 4  | 导航被新导航取消 |
| `duplicated` | 8  | 重复导航     |
| `notfound`   | 16 | 路由未匹配    |

**检查导航状态：**

```typescript
import { hasSuccess, hasState, NavState } from 'vitarx-router'

const result = await router.push({ index: '/home' })

// 检查是否成功
if (hasSuccess(result)) {
  console.log('导航成功')
}

// 检查特定状态
if (hasState(result, NavState.aborted)) {
  console.log('导航被阻止')
}
```

---

## 导航守卫

### 全局前置守卫

在路由跳转前执行，可用于权限验证。

```typescript
const router = createRouter({ routes })

router.beforeEach((to, from) => {
  // 需要登录的页面
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { index: '/login' } // 重定向到登录页
  }
  
  // 返回 false 取消导航
  // return false
  
  // 返回 void 或 true 继续导航
})
```

**守卫返回值：**

| 返回值              | 说明       |
|------------------|----------|
| `true` / `void`  | 继续导航     |
| `false`          | 取消导航     |
| `string`         | 重定向到指定路径 |
| `NavigateTarget` | 重定向到目标路由 |

### 全局后置守卫

在路由跳转后执行，可用于更新页面标题等。

```typescript
router.afterEach((to, from) => {
  // 更新页面标题
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

支持数组形式的多个守卫：

```typescript
const routes = defineRoutes({
  path: '/admin',
  component: Admin,
  beforeEnter: [guard1, guard2]
})
```

### 组件内守卫

在组件内注册离开守卫和更新钩子：

```typescript
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vitarx-router'

export default function UserComponent() {
  // 离开守卫
  onBeforeRouteLeave((to, from) => {
    const answer = window.confirm('确定要离开吗？')
    if (!answer) return false
  })
  
  // 更新钩子
  onBeforeRouteUpdate((to, from) => {
    console.log('路由参数更新', to.params)
  })
}
```

### 错误处理

```typescript
const router = createRouter({
  routes,
  onError: (error, to, from) => {
    console.error('路由错误:', error)
  }
})
```

### 404 处理

```typescript
const router = createRouter({
  routes,
  onNotFound: (target) => {
    console.log('未找到路由:', target)
    return { index: '/404' }  // 重定向到 404 页面
  }
})
```

或使用 `missing` 组件：

```typescript
const router = createRouter({
  routes,
  missing: NotFoundComponent
})
```

---

## 组件

### RouterView

渲染匹配的路由组件。

```jsx
// 基本用法
<RouterView />

// 命名视图
<RouterView name="sidebar" />

// 自定义渲染
<RouterView>
  {(component, props, route) => (
    <Transition name="fade">
      <Dynamic is={component} {...props} memo />
    </Transition>
  )}
</RouterView>
```

**Props：**

| 属性         | 类型         | 默认值         | 说明      |
|------------|------------|-------------|---------|
| `name`     | `string`   | `'default'` | 命名视图名称  |
| `children` | `function` | -           | 自定义渲染函数 |

### RouterLink

声明式导航链接。

```jsx
// 基本用法
<RouterLink to="/">首页</RouterLink>

// 命名路由
<RouterLink to={{ index: 'user-detail', params: { id: '123' } }}>
  用户详情
</RouterLink>

// 带查询参数
<RouterLink to={{ index: '/search', query: { q: 'keyword' } }}>
  搜索
</RouterLink>

// 替换模式
<RouterLink to="/about" replace>关于</RouterLink>

// 激活类名
<RouterLink 
  to="/" 
  activeClass="active"
  exactActiveClass="exact-active"
>
  首页
</RouterLink>

// 禁用状态
<RouterLink to="/about" disabled>禁用链接</RouterLink>

// 外部链接
<RouterLink to="https://example.com" target="_blank">
  外部链接
</RouterLink>
```

**Props：**

| 属性                 | 类型                 | 默认值      | 说明                       |
|--------------------|--------------------|----------|--------------------------|
| `to`               | `string \| object` | -        | 目标路由                     |
| `replace`          | `boolean`          | `false`  | 是否替换历史记录                 |
| `disabled`         | `boolean`          | `false`  | 是否禁用                     |
| `activeClass`      | `string`           | -        | 激活时应用的类名                 |
| `exactActiveClass` | `string`           | -        | 精确匹配时应用的类名               |
| `ariaCurrentValue` | `string`           | `'page'` | aria-current 属性值         |
| `callback`         | `function`         | -        | 导航完成回调                   |
| `viewTransition`   | `boolean`          | `false`  | 是否使用 View Transition API |

---

## 组合式 API

### useRouter

获取路由器实例。

```jsx
import { useRouter } from 'vitarx-router'

export default function Component() {
  const router = useRouter()
  
  const handleClick = () => {
    router.push({ index: '/home' })
  }
  
  return <button onClick={handleClick}>跳转</button>
}
```

### useRoute

获取当前路由信息。

```jsx
import { useRoute } from 'vitarx-router'

export default function UserDetail() {
  const route = useRoute()
  
  // 路由参数
  const userId = route.params.id
  
  // 查询参数
  const query = route.query
  
  // 路由元数据
  const meta = route.meta
  
  return <div>用户ID: {userId}</div>
}
```

**参数：**
- `global` - 是否返回全局路由对象，默认 `false`

### useLink

创建链接助手，用于自定义导航逻辑。

```jsx
import { useLink } from 'vitarx-router'

export default function CustomLink({ to }) {
  const { href, route, isActive, isExactActive, navigate } = useLink({ to })
  
  return (
    <a 
      href={href.value} 
      onClick={navigate}
      class={{ active: isActive.value, 'exact-active': isExactActive.value }}
    >
      <slot />
    </a>
  )
}
```

**返回值：**

| 属性              | 类型                                | 说明          |
|-----------------|-----------------------------------|-------------|
| `href`          | `Computed<string>`                | 链接 href 属性值 |
| `route`         | `Computed<RouteLocation \| null>` | 匹配的路由信息     |
| `isActive`      | `Computed<boolean>`               | 是否部分匹配当前路由  |
| `isExactActive` | `Computed<boolean>`               | 是否精确匹配当前路由  |
| `navigate`      | `function`                        | 执行导航        |

---

## 路由对象

### RouteLocation

当前路由信息对象。

```typescript
interface RouteLocation {
  href: string                           // 完整 href
  path: RoutePath                        // 路由路径
  hash: URLHash | ''                     // URL hash
  params: URLParams                      // 路由参数
  query: URLQuery                        // 查询参数
  meta: RouteMetaData                    // 路由元数据
  matched: RouteRecord[]                 // 匹配的路由记录
  redirectFrom?: RouteLocation           // 重定向来源
}
```

### RouteRecord

解析后的路由记录。

```typescript
interface RouteRecord {
  isGroup: boolean                       // 是否为分组路由
  parent?: RouteRecord                   // 父级路由记录
  path: RoutePath                        // 路由路径
  aliases?: RoutePath[]                  // 别名路径列表
  name?: RouteName                       // 路由名称
  meta?: RouteMetaData                   // 路由元数据
  props?: NamedInjectProps               // 参数注入配置
  redirect?: Route['redirect']           // 重定向配置
  component?: NamedRouteComponent        // 视图组件
  beforeEnter?: NavigationGuard[]        // 路由守卫
  pattern?: ResolvedPattern[]            // 动态参数匹配模式
  params?: URLParams                     // 路由参数
  query?: URLQuery                       // 查询参数
}
```

---

## 路由选项

### RouterOptions

```typescript
interface RouterOptions {
  routes: Route[] | RouteManager         // 路由配置（必填）
  mode?: 'hash' | 'path'                 // 路由模式，默认 'hash'
  base?: `/${string}`                    // 基础路径，默认 '/'
  suffix?: `.${string}`                  // URL 后缀
  props?: boolean | InjectPropsHandler   // 全局 props 注入
  scrollBehavior?: BeforeScrollCallback  // 滚动行为
  beforeEach?: NavigationGuard | NavigationGuard[]   // 全局前置守卫
  afterEach?: AfterCallback | AfterCallback[]        // 全局后置守卫
  onNotFound?: NotFoundHandler | NotFoundHandler[]   // 404 处理
  onError?: NavErrorListener | NavErrorListener[]    // 错误处理
  missing?: RouteViewComponent           // 未匹配时渲染的组件
}
```

### RouteManagerOptions

```typescript
interface RouteManagerOptions {
  pattern?: RegExp           // 动态参数默认匹配模式，默认 /[^/]+/
  strict?: boolean           // 是否严格匹配尾部斜杠，默认 false
  ignoreCase?: boolean       // 是否忽略大小写，默认 false
  fallbackIndex?: boolean    // 是否启用索引回退匹配，默认 false
}
```

---

## TypeScript 支持

### 扩展路由元数据类型

```typescript
// 在全局类型声明文件中
declare module 'vitarx-router' {
  interface RouteMetaData {
    title?: string
    requiresAuth?: boolean
    icon?: string
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

// 使用时会有类型提示
router.push({ index: 'user-detail', params: { id: '123' } })
router.push({ index: '/search', query: { q: 'keyword' } })
```

---

## 文件路由

配合 Vite 插件实现基于文件系统的路由自动生成。

### 安装配置

```typescript
// vite.config.ts
import VitarxRouter from 'vitarx-router/vite'

export default defineConfig({
  plugins: [
    VitarxRouter({
      pagesDir: 'src/pages'
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

详细配置请参考 [Vite 插件文档](./src/vite/README.md)。

---

## API 参考

### 助手函数

| 函数                                     | 说明              |
|----------------------------------------|-----------------|
| `createRouter(options)`                | 创建路由器实例         |
| `createWebRouter(options)`             | 创建 Web 模式路由器    |
| `createMemoryRouter(options)`          | 创建 Memory 模式路由器 |
| `createRouteManager(routes, options?)` | 创建路由管理器         |
| `defineRoutes(...routes)`              | 定义路由表           |
| `useRouter()`                          | 获取路由器实例         |
| `useRoute(global?)`                    | 获取当前路由信息        |
| `useLink(options)`                     | 创建链接助手          |
| `onBeforeRouteLeave(guard)`            | 注册离开守卫          |
| `onBeforeRouteUpdate(callback)`        | 注册更新钩子          |
| `hasSuccess(result)`                   | 检查导航是否成功        |
| `hasState(result, status)`             | 检查导航状态          |

### Router 实例方法

| 方法                              | 说明        |
|---------------------------------|-----------|
| `push(target)`                  | 跳转到新路由    |
| `replace(target)`               | 替换当前路由    |
| `go(delta)`                     | 前进/后退指定步数 |
| `back()`                        | 后退一步      |
| `forward()`                     | 前进一步      |
| `addRoute(route, parent?)`      | 添加路由      |
| `removeRoute(index)`            | 移除路由      |
| `hasRoute(index)`               | 检查路由是否存在  |
| `matchRoute(target)`            | 匹配路由      |
| `buildUrl(path, query?, hash?)` | 构建 URL    |
| `resolveComponents(route?)`     | 解析异步组件    |
| `waitViewRender(navResult?)`    | 等待视图渲染    |
| `isReady()`                     | 等待路由器就绪   |
| `beforeEach(guard)`             | 添加前置守卫    |
| `afterEach(callback)`           | 添加后置回调    |
| `destroy()`                     | 销毁路由器     |

### Router 实例属性

| 属性        | 类型                              | 说明            |
|-----------|---------------------------------|---------------|
| `route`   | `ReadonlyObject<RouteLocation>` | 当前路由信息（只读响应式） |
| `routes`  | `RouteRecord[]`                 | 所有注册的路由记录     |
| `config`  | `ResolvedRouterConfig`          | 路由器配置         |
| `manager` | `RouteManager`                  | 路由管理器实例       |

### RouteManager 实例方法

| 方法                           | 说明      |
|------------------------------|---------|
| `findByPath(path)`           | 按路径查找路由 |
| `findByName(name)`           | 按名称查找路由 |
| `find(index)`                | 统一查找方法  |
| `matchByPath(path)`          | 按路径匹配路由 |
| `matchByName(name, params?)` | 按名称匹配路由 |
| `match(index, params?)`      | 统一匹配方法  |
| `addRoute(route, parent?)`   | 添加路由    |
| `removeRoute(index)`         | 移除路由    |
| `clearRoutes()`              | 清空所有路由  |

---

## License

MIT
