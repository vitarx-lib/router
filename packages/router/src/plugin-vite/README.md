# Vitarx Router Vite 插件

基于文件系统的路由自动生成插件，支持 Vite 5.x/6.x/7.x/8.x。

## 安装

```bash
npm install vitarx-router
```

## 快速开始

### 1. 配置 Vite 插件

```typescript
import { defineConfig } from 'vite'
import VitarxRouter from 'vitarx-router/vite'

export default defineConfig({
  plugins: [
    VitarxRouter({
      pages: 'src/pages',
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
import { createRouter } from 'vitarx-router'
import routes from 'virtual:vitarx-router:routes'

const router = createRouter({ routes })
```

## 插件配置选项

### RouterPluginOptions

```typescript
interface RouterPluginOptions extends FileRouterOptions {
  dts?: string | false
}
```

| 选项               | 类型                                                 | 默认值                   | 说明           |
|------------------|----------------------------------------------------|-----------------------|--------------|
| `pages`          | `string \| PageConfig \| (PageConfig \| string)[]` | `'src/pages'`         | 页面目录配置       |
| `extensions`     | `string[]`                                         | `['.tsx', '.jsx']`    | 支持的文件扩展名     |
| `include`        | `string[]`                                         | `[]`                  | 要包含的 glob 模式 |
| `exclude`        | `string[]`                                         | `[]`                  | 要排除的 glob 模式 |
| `dts`            | `string \| false`                                  | `'typed-router.d.ts'` | 类型声明文件路径     |
| `importMode`     | `'lazy' \| 'file'`                                 | `'lazy'`              | 组件导入模式       |
| `extendRoute`    | `ExtendRouteHook`                                  | -                     | 路由扩展钩子       |
| `injectImports`  | `string[]`                                         | -                     | 自定义导入语句      |
| `namingStrategy` | `'kebab' \| 'lowercase' \| 'none'`                 | `'kebab'`             | 路由命名策略       |

### pages 配置

支持三种配置方式：

```typescript
VitarxRouter({
  pages: 'src/pages'
})

VitarxRouter({
  pages: ['src/pages', 'src/admin']
})

VitarxRouter({
  pages: [
    { dir: 'src/pages', exclude: ['components'] },
    { dir: 'src/admin', include: ['**\/*.tsx'], prefix: '/admin/' }
  ]
})
```

### PageConfig

```typescript
interface PageConfig {
  dir: string
  include?: string[]
  exclude?: string[]
  prefix?: string
}
```

| 选项        | 类型         | 说明           |
|-----------|------------|--------------|
| `dir`     | `string`   | 页面目录路径       |
| `include` | `string[]` | 要包含的 glob 模式 |
| `exclude` | `string[]` | 要排除的 glob 模式 |
| `prefix`  | `string`   | 路由路径前缀       |

### 路径前缀示例

```typescript
VitarxRouter({
  pages: [
    { dir: 'src/pages' },
    { dir: 'src/admin', prefix: '/admin/' },
    { dir: 'src/promos', prefix: 'promos-' }
  ]
})
```

- `src/admin/home.tsx` → `/admin/home`
- `src/promos/black-friday.tsx` → `/promos-black-friday`

### importMode 配置

- `lazy`（默认）：使用 `lazy(() => import(...))` 懒加载组件
- `file`：直接使用文件路径作为组件，由用户自行处理导入

```typescript
VitarxRouter({
  importMode: 'lazy'
})

VitarxRouter({
  importMode: 'file',
  injectImports: ["import { lazy } from 'vitarx'"],
  extendRoute(route) {
    if (route.component && typeof route.component === 'string') {
      route.component = `lazy(() => import(${route.component}))`
    }
    return route
  }
})
```

### extendRoute 钩子

在生成每个路由配置时调用，允许自定义扩展路由配置：

```typescript
VitarxRouter({
  extendRoute(route) {
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

### namingStrategy 配置

控制路由名称和路径的命名转换方式：

- `kebab`（默认）：将驼峰命名转换为 kebab-case，如 `MainHome` → `main-home`
- `lowercase`：简单转换为小写，如 `MainHome` → `mainhome`
- `none`：保持原始命名，不进行转换

```typescript
VitarxRouter({
  namingStrategy: 'kebab'
})
```

## definePage 宏

在页面组件中使用 `definePage` 宏自定义路由配置。

### 基本用法

```jsx
definePage({
  name: 'user-detail',
  meta: { title: '用户详情', requiresAuth: true },
  redirect: '/login',
  pattern: { id: /^\d+$/ },
  alias: '/member/{id}'
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
| `alias`    | `string \| string[]`       | 路由别名          |

### meta 配置

meta 必须是可序列化的对象：

```jsx
definePage({
  meta: {
    title: '用户详情',
    requiresAuth: true,
    order: 1,
    roles: ['admin']
  }
})
```

### redirect 配置

```jsx
definePage({ redirect: '/dashboard' })

definePage({
  redirect: {
    index: 'home',
    query: { from: 'old' },
    params: { id: 1 }
  }
})
```

### pattern 配置

为动态路由参数定义匹配规则：

```jsx
definePage({
  pattern: {
    id: /^\d+$/,
    slug: /^[a-z0-9-]+$/
  }
})
```

### alias 配置

```jsx
definePage({ alias: '/member/{id}' })

definePage({ alias: ['/member/{id}', '/profile/{id}'] })
```

## 文件路由转换规则

### 基本规则

1. **同名文件+目录冲突**
   - 当 `xxx.jsx` 和 `xxx/` 目录同时存在时，抛出异常
   - 如需定义布局路由，请在目录下创建 `_layout.jsx` 文件

2. **布局路由**
   - 在目录下创建 `_layout.jsx` 文件作为布局组件
   - 支持 `_layout.jsx`（默认布局）和 `_layout.name.jsx`（命名布局）
   - 目录内的其他页面文件作为子路由

3. **纯目录**
   - 当只有 `xxx/` 目录存在时
   - 目录内有多个文件时，创建目录路由
   - 目录内只有 `index.jsx` 时，直接作为独立路由

4. **纯文件**
   - 当只有 `xxx.jsx` 文件存在时
   - 直接作为一个 Route

5. **同级文件名冲突**
   - 当 `users.jsx` 和 `users.tsx` 同时存在时，抛出警告日志，忽略后者

### 动态路由

使用 `[param]` 语法定义动态参数：

```
src/pages/
├── user/
│   └── [id].tsx     → /user/{id}
└── post/
    └── [slug].tsx   → /post/{slug}
```

### 命名视图

支持通过文件名后缀 `@view` 语法定义命名视图：

```
src/pages/
├── index.tsx        ← 默认视图
└── index@aux.tsx    ← aux 命名视图
```

生成：

```typescript
{
  path: '/',
  component: {
    default: lazy(() => import('src/pages/index.tsx')),
    aux: lazy(() => import('src/pages/index@aux.tsx'))
  }
}
```

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
  children: [
    { path: '', component: lazy(() => import('src/pages/users/index.jsx')) },
    { path: 'profile', component: lazy(() => import('src/pages/users/profile.jsx')) }
  ]
}]
```

### 示例2：布局路由（_layout.jsx）

```
src/pages/
└── users/
    ├── _layout.jsx    ← 布局组件
    ├── index.jsx      ← 默认子路由
    └── profile.jsx    ← 其他子路由
```

生成：

```typescript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users/_layout.jsx')),
  children: [
    { path: '', component: lazy(() => import('src/pages/users/index.jsx')) },
    { path: 'profile', component: lazy(() => import('src/pages/users/profile.jsx')) }
  ]
}]
```

### 示例3：动态路由

```
src/pages/
├── user/
│   └── [id].jsx     → /user/{id}
```

生成：

```typescript
[{
  path: '/user/{id}',
  component: lazy(() => import('src/pages/user/[id].jsx'))
}]
```

## 虚拟模块

| 模块 ID                          | 说明        |
|--------------------------------|-----------|
| `virtual:vitarx-router:routes` | 自动生成的路由配置 |

### 使用路由模块

```typescript
import { createRouter } from 'vitarx-router'
import { routes } from 'vitarx-router/auto-routes'
// import routes from 'virtual:vitarx-router:routes' 
// 从虚拟模块导入ts类型校验会失败，建议从'vitarx-router/auto-routes'导入

const router = createRouter({ routes })
```

## TypeScript 支持

插件会自动生成类型声明文件，提供完整的类型支持：

```typescript
interface RouteIndexMap {
  'home': {},
  '/': {},
  'user-id': { params: { id: string } },
  '/user/{id}': { params: { id: string } }
}

router.push({ index: 'user-id', params: { id: '123' } })
```

## 注意事项

1. **默认导出检测**：插件会检测页面文件是否有有效的默认导出函数组件，没有则跳过该文件并发出警告。

2. **meta 序列化**：`definePage` 的 `meta` 必须是可序列化的对象。

3. **构建优化**：构建模式下会自动移除 `definePage` 调用和导入语句。

4. **HMR 支持**：开发模式下修改页面文件会触发热更新。

5. **分组路由命名**：有 `children` 的路由（分组路由）默认不会生成 `name` 属性，除非设置了 `redirect`。

6. **路径前缀**：使用 `prefix` 配置时，注意结尾的 `/` 会影响拼接结果。

## License

MIT
