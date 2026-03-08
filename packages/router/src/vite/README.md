# 自动化文件约定路由

## 一、路由目录结构规则

约定默认目录：

```text
src/pages
```

示例：

```text
src/pages
 ├─ index.tsx
 ├─ user
 │   ├─ index.tsx
 │   ├─ [id].tsx
 │   └─ settings.tsx
 └─ admin
     ├─ index.tsx
     └─ users.tsx
```

生成路由：

```text
/                -> index.tsx
/user            -> user/index.tsx
/user/{id}       -> user/[id].tsx
/user/settings   -> user/settings.tsx
/admin           -> admin/index.tsx
/admin/users     -> admin/users.tsx
```

## 二、动态参数规则

使用 `[]` 表示参数：

```text
[id].tsx        -> /{id}
[slug].tsx      -> /{slug}
```

例如：

```text
pages/user/[id].tsx
```

生成：

```text
/user/{id}
```

## 三、RouteIndex 生成规则

推荐规则：

| 文件                      | index           |
|-------------------------|-----------------|
| pages/index.tsx         | `home`          |
| pages/user/index.tsx    | `user`          |
| pages/user/[id].tsx     | `user-id`       |
| pages/user/[post-id]    | `user-post-id`  |
| pages/user/settings.tsx | `user-settings` |
| pages/admin/users.tsx   | `admin-users`   |


生成逻辑：

```text
目录名用 "-"
动态参数用 "-"
```

例如：

```text
user/[id] -> user-id
```

## 四、页面 meta 定义方式

推荐使用 definePage 宏函数。

页面示例：

```jsx
import { definePage } from 'vite-router/auto-routes'
definePage({
  meta: {
    title: 'User Detail',
    requiresAuth: true
  }
})

export default function UserPage() {
  return <div>User</div>
}
```

## 五、definePage 类型定义

插件提供：

```ts
export interface PageOptions {
  name?:string, // 优先级高于自动生成的name
  meta?: Record<string, any>,
}

export function definePage(options: PageOptions): void
```

这个函数：
  - 生产环境被移除
  - 只用于 Vite 插件解析

## 六、生成路由记录

插件扫描 `pages` 目录后生成虚拟模块：

```text
virtual:vitarx-router:routes
```

示例输出：

```typescript
import { lazy } from 'vitarx'
export const routes = [
  {
    name: 'home',
    path: '/',
    component: lazy(() => import('/src/pages/index.tsx'))
  },
  {
    name: 'user',
    path: '/user',
    component: lazy(() => import('/src/pages/user/index.tsx'))
  },
  {
    name: 'user-id',
    path: '/user/{id}',
    component: lazy(() => import('/src/pages/user/[id].tsx')),
    meta: {
      title: 'User Detail'
    }
  }
]
```

## 七、自动生成 RouteIndexMap 类型

插件额外生成类型定义虚拟模块：

```text
virtual:vitarx-router:types
```

示例输出：

```typescript
export interface RouteIndexMap {
  home: {},
  '/':{},
  user: {},
  '/user':{},
  'user-id': {
    params: {
      id: string
    }
  },
  '/user/{id}': {
    params: {
      id: string
    }
  }
}
```

写入到插件配置的 `.d.ts` 存放文件中：

```typescript
import type { RouteIndexMap as AutoRouteIndexMap } from 'virtual:vitarx-router/types'
declare module 'vitarx-router' {
  interface RouteIndexMap extends AutoRouteIndexMap{}
}
```

开发者项目中使用示例：

```typescript
router.push({
  index: 'user-id',
  params: {
    id: '123'
  }
})
```

> IDE 自动提示。

## 八、嵌套路由支持

```text
src/pages/
├── users/
│   └── index.tsx
└── users.tsx
```

生成：

```typescript
import { lazy } from 'vitarx'
const routes = [
  {
    path: '/users',
    component: lazy(() => import('src/pages/users.tsx')),
    children: [
      { path: '/index', component: lazy(() => import('src/pages/users/index.tsx')) },
    ],
  },
]
```

## 九、Vite 插件结构

插件流程：

```text
scanPages
     ↓
parseFilePath
     ↓
parseDefinePage
     ↓
buildRouteTree
     ↓
generateRoutes
     ↓
generateTypes
```

核心代码结构：

```text
packages/router/src/vite
 ├─ scanPages.ts
 ├─ parsePage.ts
 ├─ generateRoutes.ts
 ├─ generateTypes.ts
 ├─ auto-routes # 客户端api提供
 │   ├─ routes.ts # 路由配置
 │   ├─ handleHotUpdate.ts # 热更新处理
 │   └─ index.ts
 └─ index.ts
```

## 十、客户端api提供

```typescript
import { createRouter } from 'vitarx-router'
import { routes, handleHotUpdate } from 'vitarx-router/auto-routes'

const router = createRouter({
  // ... 其他配置
  routes
})
// 这将在运行时更新路由而无需重新加载页面
if (import.meta.hot) {
  handleHotUpdate(router)
}
export default router
```
