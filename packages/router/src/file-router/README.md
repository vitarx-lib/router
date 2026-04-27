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
  pages: 'src/pages'
})

// 构造函数自动扫描页面文件，无需手动调用 scan()
const { code, dts } = router.generate()
console.log(code)
```

## API

### FileRouter 类

文件路由管理器，封装文件路由的核心流程。

#### 构造函数

```typescript
new FileRouter(options?: FileRouterOptions)
```

构造函数会自动扫描页面目录并构建路由树，无需手动调用 scan 方法。

#### 实例方法

| 方法                                 | 说明                |
|------------------------------------|-------------------|
| `generate()`                       | 生成路由代码和类型定义       |
| `clearGenerateResult()`            | 清除路由代码缓存          |
| `removeDefinePage(code, filePath)` | 移除 definePage 宏调用 |
| `addPage(filePath)`                | 动态添加页面文件          |
| `removePage(filePath)`             | 动态移除页面文件          |
| `updatePage(filePath)`             | 动态更新页面文件          |
| `handleChange(event, path)`        | 处理文件变化事件          |
| `reload()`                         | 重新加载所有页面          |

#### 实例属性

| 属性         | 类型                        | 说明         |
|------------|---------------------------|------------|
| `config`   | `ResolvedConfig`          | 解析后的配置     |
| `root`     | `string`                  | 项目根目录      |
| `nodeTree` | `ParsedNode[]`            | 解析后的节点树结构  |
| `fileMap`  | `Map<string, ParsedNode>` | 文件到页面节点的映射 |

## 配置选项

### FileRouterOptions

```typescript
interface FileRouterOptions {
  root?: string
  pages?: PageSource | readonly PageSource[]
  pathStrategy?: 'kebab' | 'lowercase' | 'raw'
  importMode?: 'lazy' | 'sync' | ImportModeFunction
  injectImports?: readonly string[]
  dts?: boolean | string
  layoutFileName?: string
  configFileName?: string
  transform?: CodeTransformHook
  extendRoute?: ExtendRouteHook
  beforeWriteRoutes?: BeforeWriteRoutesHook
  pageParser?: PageParser
}
```

| 选项                  | 类型                                       | 默认值             | 说明         |
|---------------------|------------------------------------------|-----------------|------------|
| `root`              | `string`                                 | `process.cwd()` | 项目根目录      |
| `pages`             | `PageSource \| readonly PageSource[]`    | `'src/pages'`   | 页面来源配置     |
| `pathStrategy`      | `'kebab' \| 'lowercase' \| 'raw'`        | `'kebab'`       | 路径格式化策略    |
| `importMode`        | `'lazy' \| 'sync' \| ImportModeFunction` | `'lazy'`        | 组件导入模式     |
| `injectImports`     | `readonly string[]`                      | -               | 注入自定义导入语句  |
| `dts`               | `boolean \| string`                      | `false`         | 类型定义文件配置   |
| `layoutFileName`    | `string`                                 | `'_layout'`     | 布局文件名      |
| `configFileName`    | `string`                                 | `'_config'`     | 分组配置文件名    |
| `transform`         | `CodeTransformHook`                      | -               | 代码转换钩子     |
| `extendRoute`       | `ExtendRouteHook`                        | -               | 路由扩展钩子     |
| `beforeWriteRoutes` | `BeforeWriteRoutesHook`                  | -               | 写入路由文件前的钩子 |
| `pageParser`        | `PageParser`                             | -               | 自定义页面解析器   |

### PageSource

页面来源配置，支持字符串或对象形式：

```typescript
type PageSource = string | PageDirOptions
```

### PageDirOptions

页面目录选项配置：

```typescript
interface PageDirOptions {
  dir: string
  include?: readonly string[]
  exclude?: readonly string[]
  prefix?: string
  group?: boolean
}
```

| 选项        | 类型                  | 默认值                                                  | 说明           |
|-----------|---------------------|------------------------------------------------------|--------------|
| `dir`     | `string`            | -                                                    | 页面目录路径       |
| `include` | `readonly string[]` | `['**\/*.{jsx,tsx}']`                                | 要包含的 glob 模式 |
| `exclude` | `readonly string[]` | `['**\/node_modules\/**', '**\/dist\/**', '**\/.*']` | 要排除的 glob 模式 |
| `prefix`  | `string`            | -                                                    | 路由路径前缀       |
| `group`   | `boolean`           | -                                                    | 是否创建分组路由     |

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
    { dir: 'src/pages', exclude: ['**/components/**'] },
    { dir: 'src/admin', include: ['**/*.tsx'], prefix: '/admin/', group: true }
  ]
})
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

组件导入模式支持三种方式：

### 预设模式

- `lazy`（默认）：使用 `lazy(() => import(...))` 懒加载组件
- `sync`：使用静态导入，组件会被打包到主bundle中

```typescript
const router = new FileRouter({
  importMode: 'lazy'
})

const router = new FileRouter({
  importMode: 'sync'
})
```

### 自定义函数模式

通过函数自定义导入逻辑，可以实现更灵活的导入方式。函数支持返回三种类型：

- `'lazy'`：使用预设的懒加载模式
- `'sync'`：使用预设的同步导入模式
- 自定义表达式字符串

```typescript
// 返回预设模式
const router = new FileRouter({
  importMode: (context) => {
    if (context.filePath.includes('/admin/')) {
      return 'sync'
    }
    return 'lazy'
  }
})

// 使用 Vitarx.lazy
const router = new FileRouter({
  importMode: (context) => {
    context.addImport(`import { lazy } from 'vitarx'`)
    return `lazy(() => import(${context.importPath}))`
  }
})

// 自定义懒加载包装器
const router = new FileRouter({
  importMode: (context) => {
    context.addImport(`import { lazyLoad } from '@/utils/lazy'`)
    return `lazyLoad(() => import(${context.importPath}))`
  }
})

// 条件导入
const router = new FileRouter({
  importMode: (context) => {
    if (context.filePath.includes('/admin/')) {
      context.addImport(`import { authLazy } from '@/auth'`)
      return `authLazy(() => import(${context.importPath}))`
    }
    return 'lazy'
  }
})
```

#### ImportModeContext

自定义函数接收一个上下文对象：

| 属性           | 类型                            | 说明                       |
|--------------|-------------------------------|--------------------------|
| `importPath` | `string`                      | 组件文件路径（已 JSON.stringify） |
| `filePath`   | `string`                      | 组件文件原始路径                 |
| `addImport`  | `(statement: string) => void` | 添加导入语句到生成的代码顶部           |

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

## layoutFileName 配置

自定义布局文件名，默认为 `_layout`：

```typescript
const router = new FileRouter({
  layoutFileName: '__layout__'
})
```

## configFileName 配置

自定义分组配置文件名，默认为 `_config`：

```typescript
const router = new FileRouter({
  configFileName: '__config__'
})
```

## transform 钩子

代码转换钩子，通常用于转换 markdown 文件内容为 ESModule：

```typescript
const router = new FileRouter({
  transform(content, file) {
    const { ext, name } = path.parse(file)
    if (ext === '.md') {
      const html = markdownToHtml(content)
      return `export default function ${name}() { return ${html} }`
    }
    return content
  }
})
```

## pathStrategy 配置

控制路由路径的命名转换方式：

- `kebab`（默认）：将驼峰命名转换为 kebab-case，如 `MainHome` → `main-home`
- `lowercase`：简单转换为小写，如 `MainHome` → `mainhome`
- `raw`：保持原始命名，不进行转换

```typescript
const router = new FileRouter({
  pathStrategy: 'kebab'
})
```

## PageParser 配置

自定义页面解析器，用于完全控制文件名到页面数据的转换逻辑：

```typescript
const router = new FileRouter({
  pageParser(basename, filePath) {
    // basename: 文件名（不包含扩展名）
    // filePath: 完整的文件路径

    // 示例：将所有下划线转换为横线
    if (basename.includes('_')) {
      return basename.replace(/_/g, '-')
    }

    // 返回字符串交由内置解析器处理
    return basename
  }
})
```

### 返回值

路径解析器可以返回以下两种类型：

1. **字符串**：直接作为路由路径
2. **对象**：包含路由路径和视图名称

```typescript
const router = new FileRouter({
  pageParser(basename, filePath) {
    // 处理命名视图
    // 例如：index@sidebar.tsx
    const [path, viewName] = basename.split('@')

    if (viewName) {
      return {
        routePath: path,
        viewName: viewName
      }
    }

    return path
  }
})
```

### PageParser 类型定义

```typescript
type PageParser = (basename: string, filePath: string) => string | PathParseResult

interface PageParseResult {
   /** 解析后的路径 如：home.jsx -> 'home' */
   path: string
   /**
    * 页面相关可配置选项
    */
   options?: PageOptions
   /** 视图名称 如：home.nav.jsx -> 'nav' */
   viewName?: string
}
```

## 动态页面管理

FileRouter 提供了动态管理页面文件的能力，适用于开发模式下的热更新场景。

### 添加页面

```typescript
const router = new FileRouter({
  root: process.cwd(),
  pages: 'src/pages'
})

// 添加新页面
router.addPage('/absolute/path/to/new-page.tsx')
```

### 移除页面

```typescript
// 移除页面
router.removePage('/absolute/path/to/page.tsx')
```

### 更新页面

```typescript
// 更新页面（会重新解析文件）
router.updatePage('/absolute/path/to/page.tsx')
```

### 处理文件变化

```typescript
// 处理文件系统事件
router.handleChange('add', '/path/to/file.tsx')
router.handleChange('change', '/path/to/file.tsx')
router.handleChange('unlink', '/path/to/file.tsx')
router.handleChange('unlinkDir', '/path/to/directory')
```

### 重新加载所有页面

```typescript
// 重新扫描所有页面
router.reload()
```

## generate() 方法

生成路由代码和类型定义。

```typescript
const result = router.generate()

// result.code - 路由代码
// result.dts - 类型定义代码（如果启用）
// result.routes - 解析后的路由数组
```

### 类型定义生成

```typescript
const router = new FileRouter({
  root: process.cwd(),
  pages: 'src/pages',
  dts: 'typed-router.d.ts'  // 指定类型定义文件路径
})

const result = router.generate()
// 类型定义会自动写入到 typed-router.d.ts 文件
```

禁用类型定义：

```typescript
const router = new FileRouter({
  root: process.cwd(),
  pages: 'src/pages',
  dts: false
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

## 类型定义

### ScanNode

扫描的节点信息，核心 IR 节点。

```typescript
interface ScanNode {
  readonly filePath: string
  readonly path: string
  parent?: ScanNode
  children?: Set<ScanNode>
  components?: Record<string, string>
  options?: PageOptions
  dirConfigFile?: string
}
```

| 属性              | 类型                       | 说明            |
|-----------------|--------------------------|---------------|
| `filePath`      | `string`                 | 文件绝对路径        |
| `path`          | `string`                 | 当前 path（不含父级） |
| `parent`        | `ScanNode`               | 父节点           |
| `children`      | `Set<ScanNode>`          | 子节点映射         |
| `components`    | `Record<string, string>` | 组件映射（命名视图）    |
| `options`       | `PageOptions`            | 页面配置选项        |
| `dirConfigFile` | `string`                 | 目录配置文件        |

### RouteNode

路由节点，解析后的路由配置。

```typescript
interface RouteNode extends PageOptions {
  readonly path: string
  readonly fullPath: string
  children?: readonly RouteNode[]
  component?: Record<string, string>
}
```

| 属性          | 类型                              | 说明                |
|-------------|---------------------------------|-------------------|
| `path`      | `string`                        | 当前 path（不含父级）     |
| `fullPath`  | `string`                        | 完整 path（含父级）      |
| `children`  | `readonly RouteNode[]`          | 子节点映射             |
| `component` | `Record<string, string>`        | 组件映射（命名视图）        |

### ExtendRouteHook

路由扩展钩子。

```typescript
type ExtendRouteHook = (
  route: RouteNode
) => RouteNode | void | Promise<RouteNode | void>
```

## License

MIT
