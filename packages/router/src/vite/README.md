# Vitarx Router Vite 插件

基于文件系统的路由自动生成插件，支持 Vite 5.x/6.x/7.x/8.x。

## 安装

```bash
npm install vitarx-router
```

## 快速开始

### 1. 配置 Vite 插件

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import VitarxRouter from 'vitarx-router/vite'

export default defineConfig({
  plugins: [
    VitarxRouter({
      pagesDir: 'src/pages',
      extensions: ['.tsx', '.ts', '.jsx', '.js']
    })
  ]
})
```

### 2. 创建页面文件

```
src/pages/
├── index.tsx        → /
├── about.tsx        → /about
└── users/
    ├── index.tsx    → /users
    └── [id].tsx     → /users/{id}
```

### 3. 使用自动生成的路由

```typescript
// main.tsx
import { createRouter } from 'vitarx-router'
import routes from 'virtual:vitarx-router:routes'

const router = createRouter({
  routes
})
```

---

## 插件配置选项

### VitePluginRouterOptions

| 选项            | 类型                                       | 默认值                              | 说明              |
|---------------|------------------------------------------|----------------------------------|-----------------|
| `pagesDir`    | `string \| string[] \| PagesDirConfig[]` | `'src/pages'`                    | 页面目录配置          |
| `extensions`  | `string[]`                               | `['.tsx', '.ts', '.jsx', '.js']` | 支持的文件扩展名        |
| `include`     | `string[]`                               | `[]`                             | 要包含的 glob 模式    |
| `exclude`     | `string[]`                               | `[]`                             | 要排除的 glob 模式    |
| `dts`         | `string \| false`                        | `'types-router.d.ts'`            | 类型声明文件路径        |
| `importMode`  | `'lazy' \| 'file'`                       | `'lazy'`                         | 组件导入模式          |
| `extendRoute` | `ExtendRouteHook`                        | -                                | 路由扩展钩子          |
| `imports`     | `string[]`                               | -                                | 自定义导入语句         |
| `lowercase`   | `boolean`                                | `true`                           | 是否将路由名称和路径转换为小写 |

### pagesDir 配置

支持三种配置方式：

```typescript
// 单个目录
VitarxRouter({
  pagesDir: 'src/pages'
})

// 多个目录（共享全局规则）
VitarxRouter({
  pagesDir: ['src/pages', 'src/admin']
})

// 多个目录（独立规则）
VitarxRouter({
  pagesDir: [
    { dir: 'src/pages', exclude: ['components'] },
    { dir: 'src/admin', include: ['**/*.tsx'] }
  ]
})
```

### importMode 配置

- `lazy`（默认）：使用 `lazy(() => import(...))` 懒加载组件
- `file`：直接使用文件路径作为组件，由用户自行处理导入

```typescript
// lazy 模式（默认）
VitarxRouter({
  importMode: 'lazy'
})
// 生成：{ path: '/', component: lazy(() => import('/src/pages/index.tsx')) }

// file 模式
VitarxRouter({
  importMode: 'file'
})
// 生成：{ path: '/', component: '/src/pages/index.tsx' }
```

### extendRoute 钩子

在生成每个路由配置时调用，允许自定义扩展路由配置：

```typescript
VitarxRouter({
  extendRoute(route) {
    // 添加自定义 meta
    route.meta = {
      ...route.meta,
      layout: 'default'
    }
    return route
  }
})
```

支持异步操作：

```typescript
VitarxRouter({
  extendRoute: async (route) => {
    const permissions = await fetchPermissions(route.path)
    route.meta = { ...route.meta, permissions }
    return route
  }
})
```

### imports 配置

向虚拟模块注入自定义导入语句：

```typescript
VitarxRouter({
  importMode: 'file',
  imports: ["import { lazy } from 'vitarx'"],
  extendRoute(route) {
    route.component = `lazy(() => import('${route.component}'))`
    return route
  }
})
```

---

## definePage 宏

在页面组件中使用 `definePage` 宏自定义路由配置。

### 基本用法

```tsx
import { definePage } from 'vitarx-router/auto-routes'

definePage({
  name: 'user-detail',
  meta: { title: '用户详情', requiresAuth: true },
  redirect: '/login',
  pattern: { id: /^\d+$/ }
})

export default function UserDetail() {
  return <div>User Detail</div>
}
```

### 支持的配置项

| 选项         | 类型                         | 说明            |
|------------|----------------------------|---------------|
| `name`     | `string`                   | 自定义路由名称       |
| `meta`     | `RouteMetaData`            | 路由元数据（必须可序列化） |
| `redirect` | `string \| RedirectConfig` | 路由重定向目标       |
| `pattern`  | `Record<string, RegExp>`   | 动态参数匹配模式      |

### meta 配置

meta 必须是可序列化的对象，不支持函数或复杂对象：

```tsx
definePage({
  meta: {
    title: '用户详情',      // ✅ 字符串
    requiresAuth: true,    // ✅ 布尔值
    order: 1,              // ✅ 数字
    roles: ['admin'],      // ✅ 数组
    config: { a: 1 }       // ✅ 简单对象
  }
})
```

### redirect 配置

支持字符串路径或导航配置对象：

```tsx
// 字符串路径
definePage({ redirect: '/dashboard' })

// 导航配置对象
definePage({
  redirect: {
    index: 'home',
    query: { from: 'old' },
    params: { id: 1 }
  }
})
```

### pattern 配置

为动态路由参数定义更精确的匹配规则：

```tsx
// src/pages/user/[id].tsx
definePage({
  pattern: {
    id: /^\d+$/        // 只匹配数字
  }
})

// src/pages/post/[slug].tsx
definePage({
  pattern: {
    slug: /^[a-z0-9-]+$/  // 只匹配小写字母、数字和横线
  }
})
```

---

## 文件路由转换规则

### 基本规则

1. **同名文件+目录组合（布局路由）**
   - 当 `xxx.jsx` 和 `xxx/` 目录同时存在时
   - `xxx.jsx` 作为布局组件（父路由的 component）
   - `xxx/` 目录内的页面文件作为子路由
   - `xxx/index.jsx` 的 path 为 `index`
   - 父路由自动添加 `redirect` 重定向到 `index`

2. **纯目录**
   - 当只有 `xxx/` 目录存在时
   - 目录内有多个文件时，创建目录路由
   - 目录内只有 `index.jsx` 时，直接作为独立路由
   - 目录内的其他页面文件作为子路由

3. **无效目录**
   - 目录既没有同名文件，也没有任何页面文件
   - 该目录被忽略

4. **纯文件**
   - 当只有 `xxx.jsx` 文件存在时
   - 直接作为一个 Route

5. **同级文件名冲突**
   - 当 `users.jsx` 和 `users/` 目录同时存在时，`users.jsx` 作为布局组件
   - 当 `users.jsx` 和 `users.tsx` 同时存在时，抛出警告日志，忽略后者

6. **组件导入路径**
   - 导入路径是基于系统的绝对路径
   - 根据插件配置生成 `lazy(()=>import('路径'))` | `'路径'`

### 命名视图

支持通过文件名后缀 `@view` 语法定义命名视图，规则与 vue-router 一致：

1. **默认视图**：
   - `index.tsx` 或 `index@default.tsx` 作为默认视图
   - 生成 `component: { default: lazy(() => import('...')) }`

2. **命名视图**：
   - `index@aux.tsx` 作为 `aux` 命名视图
   - 与默认视图文件组合，生成组件对象

3. **组合规则**：
   - `index.tsx` + `index@aux.tsx` → 生成包含 default 和 aux 视图的组件对象
   - `index@default.tsx` + `index@aux.tsx` → 与上面等价

4. **验证规则**：
   - 每个命名视图组必须包含默认视图（index.tsx 或 index@default.tsx）
   - 如果只有命名视图文件（如 index@aux.tsx）而没有默认视图文件，会抛出错误

#### 示例：命名视图

```
src/pages/
├── index.tsx        ← 默认视图
└── index@aux.tsx    ← aux 命名视图
```

生成：

```typescript
[
  {
    path: '/',
    component: {
      default: lazy(() => import('src/pages/index.tsx')),
      aux: lazy(() => import('src/pages/index@aux.tsx'))
    }
  }
]
```

#### 错误示例：缺少默认视图

```
src/pages/
└── index@aux.tsx    ← 只有命名视图，缺少默认视图
```

错误信息：
```
[vitarx-router] 命名视图错误: 路径 "/" 只有命名视图文件 (/src/pages/index@aux.tsx)，缺少默认视图文件 (index.tsx 或 index@default.tsx)。
修复方案: 添加 index.tsx 或 index@default.tsx 文件。
```

---

## 示例

### 示例1：目录 + index + 子页面

```
src/pages/
├── users/
    ├── profile.jsx
    └── index.jsx
```

生成：

```typescript
[{
  path: '/users',
  redirect: '/users/index',
  children: [
    { path: 'index', component: lazy(() => import('src/pages/users/index.jsx')) },
    { path: 'profile', component: lazy(() => import('src/pages/users/profile.jsx')) }
  ]
}]
```

### 示例2：目录 + 子页面（无index）

```
src/pages/
├── users/
    ├── profile1.jsx
    └── profile2.jsx
```

生成：

```typescript
[{
  path: '/users',
  children: [
    { path: 'profile1', component: lazy(() => import('src/pages/users/profile1.jsx')) },
    { path: 'profile2', component: lazy(() => import('src/pages/users/profile2.jsx')) }
  ]
}]
```

### 示例3：目录 + index

```
src/pages/
├── users/
│   └── index.jsx
```

生成：

```typescript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users/index.jsx'))
}]
```

### 示例4：嵌套目录

```
src/pages/
└── users/
    ├── index.jsx
    ├── profile.jsx
    └── settings/
        ├── index.jsx
        └── security.jsx
```

生成：

```typescript
[{
  path: '/users',
  redirect: '/users/index',
  children: [
    {
      path: 'profile',
      component: lazy(() => import('src/pages/users/profile.jsx'))
    },
    {
      path: 'settings',
      component: lazy(() => import('src/pages/users/settings/index.jsx')),
      children: [
        {
          path: 'security',
          component: lazy(() => import('src/pages/users/settings/security.jsx'))
        }
      ]
    }
  ]
}]
```

### 示例5：纯文件

```
src/pages/
└── users.jsx
```

生成：

```typescript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users.jsx'))
}]
```

### 示例6：无效目录

```
src/pages/
├── users/
│   └── (空或无有效页面文件)
```

生成：

```typescript
[]
```

### 示例7：同名文件 + 目录（布局路由）

```
src/pages/
├── users.jsx        ← 布局组件
└── users/
    ├── index.jsx    ← 默认子路由
    └── profile.jsx  ← 其他子路由
```

生成：

```typescript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users.jsx')),
  redirect: '/users/index',
  children: [
    { path: 'index', component: lazy(() => import('src/pages/users/index.jsx')) },
    { path: 'profile', component: lazy(() => import('src/pages/users/profile.jsx')) }
  ]
}]
```

### 示例8：同名文件 + 目录（无 index）

```
src/pages/
├── users.jsx        ← 布局组件
└── users/
    └── profile.jsx  ← 子路由
```

生成：

```typescript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users.jsx')),
  children: [
    { path: 'profile', component: lazy(() => import('src/pages/users/profile.jsx')) }
  ]
}]
```

### 示例9：同级文件名冲突（抛出警告）

```
src/pages/
├── users.jsx
└── users.tsx
```

处理：抛出警告日志，忽略后者（users.tsx）

生成：

```typescript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users.jsx'))
}]
```

### 示例10：动态路由

```
src/pages/
├── user/
│   └── [id].jsx     → /user/{id}
└── post/
    └── [slug].jsx   → /post/{slug}
```

生成：

```typescript
[
  {
    path: '/user/{id}',
    component: lazy(() => import('src/pages/user/[id].jsx'))
  },
  {
    path: '/post/{slug}',
    component: lazy(() => import('src/pages/post/[slug].jsx'))
  }
]
```

---

## 虚拟模块

插件提供以下虚拟模块：

| 模块 ID                          | 说明            |
|--------------------------------|---------------|
| `virtual:vitarx-router:routes` | 自动生成的路由配置     |
| `virtual:vitarx-router:types`  | 类型声明（仅用于类型推断） |

### 使用路由模块

```typescript
import routes from 'virtual:vitarx-router:routes'

const router = createRouter({ routes })
```

### TypeScript 支持

插件会自动生成类型声明文件，提供完整的类型支持：

```typescript
// 生成的类型示例
interface RouteIndexMap {
  'home': {},
  '/': {},
  'user-id': { params: { id: string } },
  '/user/{id}': { params: { id: string } }
}

// 使用示例 - 完全类型安全
router.push({ index: 'user-id', params: { id: '123' } })
```

---

## 注意事项

1. **默认导出检测**：插件会检测页面文件是否有有效的默认导出函数组件，没有则跳过该文件并发出警告。

2. **definePage 导入**：使用 `definePage` 时必须从 `vitarx-router/auto-routes` 导入。

3. **meta 序列化**：`definePage` 的 `meta` 必须是可序列化的对象。

4. **构建优化**：构建模式下会自动移除 `definePage` 调用和导入语句。

5. **HMR 支持**：开发模式下修改页面文件会触发热更新。
