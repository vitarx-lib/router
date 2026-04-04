# File Router

文件路由核心模块，提供基于文件系统的路由自动生成能力。与构建工具无关，可在 Vite、Webpack、Rollup 等构建工具中复用，或在 Node.js 脚本中直接使用。

## 安装

```bash
npm install vitarx-router
```

## 快速开始

### 基本使用

```typescript
import { FileRouter } from 'vitarx-router/file-router'

const router = new FileRouter({
  root: process.cwd(),
  pages: 'src/pages',
  extensions: ['.tsx', '.ts', '.jsx', '.js']
})

router.scan()

const { code } = await router.generateRoutes()
console.log(code)
```

### 生成类型定义

```typescript
const dts = router.generateDts()
console.log(dts)

router.writeDts('typed-router.d.ts')
```

## API

### FileRouter 类

文件路由管理器，封装文件路由的核心流程。

#### 构造函数

```typescript
new FileRouter(options?: FileRouterOptions)
```

#### 实例方法

| 方法                                 | 说明                  |
|------------------------------------|---------------------|
| `scan()`                           | 扫描页面目录，解析页面文件并构建路由树 |
| `invalidate()`                     | 清除路由代码缓存            |
| `isPageFile(file)`                 | 检查文件是否为页面文件         |
| `getPages()`                       | 获取解析后的页面列表          |
| `getRouteTree()`                   | 获取路由树结构             |
| `generateRoutes()`                 | 生成路由代码              |
| `generateDts()`                    | 生成类型定义内容            |
| `writeDts(dtsPath)`                | 写入类型定义文件            |
| `removeDefinePage(code, filePath)` | 移除 definePage 宏调用   |

#### 实例属性

| 属性       | 类型               | 说明     |
|----------|------------------|--------|
| `config` | `ResolvedConfig` | 解析后的配置 |
| `root`   | `string`         | 项目根目录  |

## 配置选项

### FileRouterOptions

```typescript
interface FileRouterOptions {
  root?: string
  pages?: string | PageConfig | (PageConfig | string)[]
  prefix?: string
  extensions?: string[]
  include?: string[]
  exclude?: string[]
  importMode?: 'lazy' | 'file'
  extendRoute?: ExtendRouteHook
  injectImports?: string[]
  namingStrategy?: 'kebab' | 'lowercase' | 'none'
}
```

| 选项               | 类型                                                 | 默认值                | 说明           |
|------------------|----------------------------------------------------|--------------------|--------------|
| `root`           | `string`                                           | `process.cwd()`    | 项目根目录        |
| `pages`          | `string \| PageConfig \| (PageConfig \| string)[]` | `'src/pages'`      | 页面目录配置       |
| `prefix`         | `string`                                           | -                  | 路由前缀         |
| `extensions`     | `string[]`                                         | `['.tsx', '.jsx']` | 支持的文件扩展名     |
| `include`        | `string[]`                                         | `[]`               | 要包含的 glob 模式 |
| `exclude`        | `string[]`                                         | `[]`               | 要排除的 glob 模式 |
| `importMode`     | `'lazy' \| 'file'`                                 | `'lazy'`           | 组件导入模式       |
| `extendRoute`    | `ExtendRouteHook`                                  | -                  | 路由扩展钩子       |
| `injectImports`  | `string[]`                                         | -                  | 注入自定义导入语句    |
| `namingStrategy` | `'kebab' \| 'lowercase' \| 'none'`                 | `'kebab'`          | 路由命名策略       |

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

### pages 配置示例

```typescript
const router = new FileRouter({
  pages: 'src/pages'
})

const router = new FileRouter({
  pages: ['src/pages', 'src/admin']
})

const router = new FileRouter({
  pages: [
    { dir: 'src/pages', exclude: ['components'] },
    { dir: 'src/admin', include: ['**\/*.tsx'], prefix: '/admin/' }
  ]
})
```

## 文件路由转换规则

### 基本规则

1. **同名文件+目录组合（布局路由）**
   - 当 `xxx.jsx` 和 `xxx/` 目录同时存在时
   - `xxx.jsx` 作为布局组件（父路由的 component）
   - `xxx/` 目录内的页面文件作为子路由

2. **纯目录**
   - 当只有 `xxx/` 目录存在时
   - 目录内有多个文件时，创建目录路由
   - 目录内只有 `index.jsx` 时，直接作为独立路由

3. **纯文件**
   - 当只有 `xxx.jsx` 文件存在时
   - 直接作为一个 Route

4. **同级文件名冲突**
   - 当 `users.jsx` 和 `users.tsx` 同时存在时，抛出警告日志，忽略后者

### 动态路由

使用 `[param]` 语法定义动态参数：

```
src/pages/
├── user/
│   └── [id].tsx     → /user/{id}
└── post/
    └── [slug?].tsx   → /post/{slug?}
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

### PageOptions

```typescript
interface PageOptions {
  name?: string
  meta?: RouteMetaData
  pattern?: Record<string, RegExp>
  redirect?: string | RedirectConfig
  alias?: string | string[]
}
```

| 选项         | 类型                         | 说明            |
|------------|----------------------------|---------------|
| `name`     | `string`                   | 自定义路由名称       |
| `meta`     | `RouteMetaData`            | 路由元数据（必须可序列化） |
| `pattern`  | `Record<string, RegExp>`   | 动态参数匹配模式      |
| `redirect` | `string \| RedirectConfig` | 路由重定向目标       |
| `alias`    | `string \| string[]`       | 路由别名          |

## importMode 配置

- `lazy`（默认）：使用 `lazy(() => import(...))` 懒加载组件
- `file`：直接使用文件路径作为组件，由用户自行处理导入

```typescript
const router = new FileRouter({
  importMode: 'lazy'
})

const router = new FileRouter({
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

## extendRoute 钩子

在生成每个路由配置时调用，允许自定义扩展路由配置：

```typescript
const router = new FileRouter({
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
const router = new FileRouter({
  extendRoute: async (route) => {
    const permissions = await fetchPermissions(route.path)
    route.meta = { ...route.meta, permissions }
    return route
  }
})
```

## namingStrategy 配置

控制路由名称和路径的命名转换方式：

- `kebab`（默认）：将驼峰命名转换为 kebab-case，如 `MainHome` → `main-home`
- `lowercase`：简单转换为小写，如 `MainHome` → `mainhome`
- `none`：保持原始命名，不进行转换

```typescript
const router = new FileRouter({
  namingStrategy: 'kebab'
})
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

### 示例2：同名文件 + 目录（布局路由）

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

## 类型定义

### ParsedPage

解析后的页面信息。

```typescript
interface ParsedPage {
  path: string
  filePath: string
  name: string
  params: string[]
  isIndex: boolean
  isDynamic: boolean
  children: ParsedPage[]
  meta?: RouteMetaData
  customName?: string
  pattern?: Record<string, RegExp>
  parentPath: string
  redirect?: string | RedirectConfig
  alias?: string | string[]
  isLayoutFile?: boolean
  layoutFilePath?: string
  viewName?: string | null
  namedViews?: Record<string, string>
}
```

### ResolvedRoute

解析后的路由配置。

```typescript
interface ResolvedRoute {
  path: string
  name?: string
  component?: string | Record<string, string>
  meta?: RouteMetaData
  pattern?: Record<string, RegExp>
  children?: ResolvedRoute[]
  redirect?: string | NavOptions
  alias?: string | string[]
}
```

### ExtendRouteHook

路由扩展钩子。

```typescript
type ExtendRouteHook = (
  route: ResolvedRoute
) => ResolvedRoute | void | Promise<ResolvedRoute | void>
```

## License

MIT
