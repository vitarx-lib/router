# Vitarx Router

Vitarx 前端框架官方路由解决方案，提供声明式路由配置、导航守卫、动态路由匹配、文件系统路由等企业级功能。

[![npm version](https://img.shields.io/npm/v/vitarx-router.svg)](https://www.npmjs.com/package/vitarx-router)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 特性

- 🚀 **多种路由模式** - 支持 Hash、History、Memory 三种路由模式
- 📁 **文件路由** - 基于 Vite 插件的文件系统路由自动生成
- 🔒 **导航守卫** - 完整的路由守卫机制，支持权限控制
- 🔄 **动态路由** - 支持动态参数、正则约束、可选参数
- 📦 **懒加载** - 内置组件懒加载支持
- 🎯 **TypeScript** - 完整的类型支持
- � **滚动行为** - 可自定义路由切换时的滚动行为

## 安装

```bash
npm install vitarx-router
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
createRouter({
  routes,
  mode: 'memory'
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

### 重定向

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

```jsx
const routes = defineRoutes({
  path: '/settings',
  component: {
    default: SettingsMain,
    sidebar: SettingsSidebar
  }
});

// 模板中使用
<RouterView />;
<RouterView name="sidebar" />
```

### 路由参数注入

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
```

### replace

替换当前路由，不添加历史记录。

```typescript
router.replace({ index: '/login' })
```

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
  },
  afterEnter: (to, from) => {
    console.log('进入管理页面')
  }
})
```

### 守卫返回值

| 返回值              | 说明       |
|------------------|----------|
| `true` / `void`  | 继续导航     |
| `false`          | 取消导航     |
| `string`         | 重定向到指定路径 |
| `NavigateTarget` | 重定向到目标路由 |

---

## 组件

### RouterView

渲染匹配的路由组件。

```jsx
// 基本用法
<RouterView />

// 命名视图
<RouterView name="sidebar" />

// 带过渡效果
<RouterView>
  {(Component) => (
    <Transition name="fade">
      <Component />
    </Transition>
  )}
</RouterView>
```

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

// 激活匹配
<RouterLink to="/" active="strict">首页</RouterLink>
```

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

---

## 路由对象

### RouteLocation

当前路由信息对象。

| 属性         | 类型                       | 说明                |
|------------|--------------------------|-------------------|
| `path`     | `string`                 | 路由路径              |
| `fullPath` | `string`                 | 完整路径（含查询参数和 hash） |
| `params`   | `Record<string, any>`    | 路由参数              |
| `query`    | `Record<string, string>` | 查询参数              |
| `hash`     | `string`                 | URL hash          |
| `name`     | `string`                 | 路由名称              |
| `meta`     | `RouteMetaData`          | 路由元数据             |
| `matched`  | `RouteNormalized[]`      | 匹配的路由记录           |

### NavigateResult

导航结果对象。

| 属性             | 类型                      | 说明    |
|----------------|-------------------------|-------|
| `status`       | `NavigateStatus`        | 导航状态  |
| `message`      | `string`                | 状态描述  |
| `to`           | `ReadonlyRouteLocation` | 目标路由  |
| `from`         | `ReadonlyRouteLocation` | 来源路由  |
| `redirectFrom` | `NavigateTarget`        | 重定向来源 |

---

## 路由选项

### RouterOptions

| 选项               | 类型                                   | 默认值        | 说明         |
|------------------|--------------------------------------|------------|------------|
| `routes`         | `Route[]`                            | -          | 路由配置数组（必填） |
| `mode`           | `'hash' \| 'path' \| 'memory'`       | `'hash'`   | 路由模式       |
| `base`           | `string`                             | `'/'`      | 基础路径       |
| `strict`         | `boolean`                            | `false`    | 是否区分大小写    |
| `suffix`         | `string \| string[] \| '*' \| false` | `'*'`      | URL 后缀匹配   |
| `defaultSuffix`  | `string`                             | `''`       | 默认后缀       |
| `pattern`        | `RegExp`                             | `/[\w.]+/` | 动态参数默认匹配模式 |
| `scrollBehavior` | `ScrollBehavior \| Function`         | `'auto'`   | 滚动行为       |
| `beforeEach`     | `BeforeEnterCallback`                | -          | 全局前置守卫     |
| `afterEach`      | `AfterEnterCallback`                 | -          | 全局后置守卫     |
| `missing`        | `RouteComponent`                     | -          | 未匹配时渲染的组件  |

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
    'search': { query: { q: string } }
  }
}

// 使用时会有类型提示
router.push({ index: 'user-detail', params: { id: '123' } })
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

| 函数                                    | 说明       |
|---------------------------------------|----------|
| `createRouter(options)`               | 创建路由器实例  |
| `defineRoutes(...routes)`             | 定义路由表    |
| `defineRoute(route)`                  | 定义单个路由   |
| `useRouter()`                         | 获取路由器实例  |
| `useRoute()`                          | 获取当前路由信息 |
| `hasNavigationStatus(result, status)` | 检查导航状态   |

### Router 实例方法

| 方法                 | 说明        |
|--------------------|-----------|
| `push(options)`    | 跳转到新路由    |
| `replace(options)` | 替换当前路由    |
| `go(delta)`        | 前进/后退指定步数 |
| `back()`           | 后退一步      |
| `forward()`        | 前进一步      |
| `scrollTo(target)` | 滚动到指定位置   |
| `initialize()`     | 初始化路由器    |

### Router 实例属性

| 属性               | 说明            |
|------------------|---------------|
| `route`          | 当前路由信息（只读响应式） |
| `options`        | 路由器配置选项       |
| `mode`           | 路由模式          |
| `isBrowser`      | 是否浏览器环境       |
| `scrollBehavior` | 滚动行为          |

---

## License

MIT
