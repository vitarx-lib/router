/**
 * @fileoverview 类型定义模块
 *
 * 定义文件路由功能所需的所有 TypeScript 类型接口。
 * 这些类型用于描述页面配置、解析结果、路由生成等各个环节的数据结构。
 */
import type { NavTarget, RouteMetaData } from '../../core/index.js'

/**
 * 页面配置选项
 *
 * 用于 definePage 宏函数，允许开发者在页面组件中自定义路由配置。
 * 仅支持可序列化的配置项。
 *
 * @example
 * ```tsx
 * import { definePage } from 'vitarx-router/auto-routes'
 *
 * definePage({
 *   name: 'user-detail',
 *   meta: { title: '用户详情', requiresAuth: true },
 *   redirect: '/login',
 *   pattern: { id: /^\d+$/ }
 * })
 *
 * export default function UserDetail() {
 *   return <div>User Detail</div>
 * }
 * ```
 */
export interface PageOptions {
  /** 自定义路由名称，优先级高于自动生成的名称 */
  name?: string
  /**
   * 路由元数据，可存储标题、权限等自定义信息
   *
   * 注意：meta 必须是可序列化的对象，不支持函数或复杂对象。
   */
  meta?: RouteMetaData
  /**
   * 动态参数匹配模式
   *
   * 用于为动态路由参数定义更精确的匹配规则。
   * 键为参数名，值为正则表达式。
   *
   * @example
   * ```typescript
   * definePage({
   *   pattern: {
   *     id: /^\d+$/,           // 匹配纯数字
   *     slug: /^[a-z-]+$/      // 匹配小写字母和横线
   *   }
   * })
   * ```
   */
  pattern?: Record<string, RegExp>
  /**
   * 路由重定向目标
   *
   * 支持字符串路径或导航配置对象。
   *
   * @example
   * ```TypeScript
   * // 字符串路径
   * definePage({ redirect: '/dashboard' })
   *
   * // 导航配置对象
   * definePage({ redirect: { index: 'home', query: { from: 'old' } } })
   * ```
   */
  redirect?: string | RedirectConfig
  /**
   * 路由的别名，用于匹配多个路径到同一个路由
   */
  alias?: string | string[]
}

/**
 * 重定向配置对象
 *
 * 与 NavigateOptions 类似，但仅包含可序列化的属性。
 */
export interface RedirectConfig {
  /** 路由索引，/开头为路径，否则为名称 */
  index: string
  /** URL 查询参数 */
  query?: Record<string, string>
  /** 路由参数 */
  params?: Record<string, string>
}

/**
 * 解析后的页面信息
 *
 * 由 parsePageFile 函数生成，包含从文件路径解析出的所有路由相关信息。
 * 这是路由生成流程中的核心数据结构。
 */
export interface ParsedPage {
  /** 路由路径，如 '/', '/user', '/user/{id}' */
  path: string
  /** 文件绝对路径 */
  filePath: string
  /** 路由名称，用于编程式导航 */
  name: string
  /** 动态参数名称列表 */
  params: string[]
  /** 是否为索引页面（index.tsx） */
  isIndex: boolean
  /** 是否包含动态参数 */
  isDynamic: boolean
  /** 子路由列表 */
  children: ParsedPage[]
  /** 路由元数据 */
  meta?: RouteMetaData
  /** 自定义路由名称（通过 definePage 设置） */
  customName?: string
  /** 动态参数匹配模式 */
  pattern?: Record<string, RegExp>
  /** 父级路径 */
  parentPath: string
  /** 路由重定向目标 */
  redirect?: string | RedirectConfig
  /** 路由别名 */
  alias?: string | string[]
  /**
   * 是否为布局文件
   * 当同名文件和目录同时存在时，文件作为布局组件
   */
  isLayoutFile?: boolean
  /**
   * 布局文件路径
   * 当目录有同名文件时，记录布局文件的路径
   */
  layoutFilePath?: string
  /**
   * 命名视图名称
   * 从文件名解析，如 index@aux.tsx -> aux
   * 默认为 null，表示默认视图
   */
  viewName?: string | null
  /**
   * 命名视图映射
   * 键为视图名称，值为文件路径
   */
  namedViews?: Record<string, string>
}

/**
 * 解析后的路由配置
 *
 * 用于代码生成阶段的中间数据结构，表示一个完整的路由记录。
 */
export interface ResolvedRoute {
  /** 路由路径 */
  path: string
  /** 路由名称（分组路由无此属性） */
  name?: string
  /**
   * 组件文件路径
   * - 单一组件：字符串形式，如 `/src/pages/index.tsx`
   * - 命名视图：对象形式，如 `{ default: '/src/pages/index.tsx', sidebar: '/src/pages/index@sidebar.tsx' }`
   * 注意：这里存储的是文件路径，在代码生成阶段才根据 importMode 转换为代码
   */
  component?: string | Record<string, string>
  /** 路由元数据 */
  meta?: RouteMetaData
  /** 动态参数匹配模式 */
  pattern?: Record<string, RegExp>
  /** 子路由列表 */
  children?: ResolvedRoute[]
  /**
   * 路由重定向目标
   */
  redirect?: string | NavTarget
  /**
   * 路由别名
   */
  alias?: string | string[]
}

/**
 * 路由扩展钩子
 *
 * 在生成路由配置时调用，允许开发者自定义扩展路由配置。
 * 支持异步操作，可以用于动态获取路由配置。
 *
 * @param route - 解析后的路由配置
 * @returns 扩展后的路由配置或 void（表示不修改）
 *
 * @example
 * ```typescript
 * VitarxRouter({
 *   extendRoute: async (route) => {
 *     // 异步获取权限配置
 *     const permissions = await fetchPermissions(route.path)
 *     route.meta = { ...route.meta, permissions }
 *     return route
 *   }
 * })
 * ```
 */
export type ExtendRouteHook = (
  route: ResolvedRoute
) => ResolvedRoute | void | Promise<ResolvedRoute | void>

/**
 * 页面目录配置项
 *
 * 用于配置多个页面目录时，可以为每个目录指定独立的包含/排除规则。
 *
 * @example
 * ```typescript
 * const pagesDirs: PagesDirConfig[] = [
 *   { dir: 'src/pages', exclude: ['components'] },
 *   { dir: 'src/admin', include: ['**\/*.tsx'], path: '/admin' }
 * ]
 * ```
 */
export interface PagesDirConfig {
  /** 页面目录路径 */
  dir: string
  /**
   * 要包含的文件/目录 glob 模式列表
   *
   * 默认匹配所有文件。只有匹配 include 模式的文件才会被扫描。
   */
  include?: string[]
  /** 要排除的文件/目录 glob 模式列表 */
  exclude?: string[]
  /**
   * 路由路径前缀
   *
   * 用于为该目录下的所有路由添加统一的前缀。
   *
   * 拼接规则：
   * 1. 前缀不以 / 开头时，自动添加 / 前缀
   * 2. 直接拼接前缀和路径（去掉路径开头的 /）
   *
   * @default ''
   *
   * @example
   * ```typescript
   * // src/admin/home.tsx -> /admin/home（需要指定结尾的 /）
   * { dir: 'src/admin', path: '/admin/' }
   *
   * // src/admin/home.tsx -> /adminhome（不指定结尾的 / 会直接拼接）
   * { dir: 'src/admin', path: '/admin' }
   *
   * // src/promos/black-friday.vue -> /promos-black-friday
   * { dir: 'src/promos', path: 'promos-' }
   * ```
   */
  prefix?: string
}

/**
 * 页面扫描选项
 *
 * 配置 scanPages 函数的扫描行为。
 */
export interface ScanOptions {
  /** 页面目录的绝对路径 */
  pagesDir: string
  /** 要处理的文件扩展名列表 */
  extensions: string[]
  /**
   * 要包含的文件/目录 glob 模式列表
   *
   * 默认匹配所有文件。只有匹配 include 模式的文件才会被扫描。
   */
  include?: string[]
  /** 要排除的文件/目录 glob 模式列表 */
  exclude?: string[]
  /**
   * 路由命名策略
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认）
   * - `lowercase`: 简单转换为小写
   * - `none`: 保持原始命名
   * @default 'kebab'
   */
  namingStrategy?: NamingStrategy
  /**
   * 路由路径前缀
   *
   * 用于为该目录下的所有路由添加统一的前缀。
   * 去除两头空格后原样拼接到扫描后生成的路径前面。
   *
   * @default ''
   *
   * @example
   * ```typescript
   * // src/admin/home.tsx -> /admin/home
   * { pagesDir: 'src/admin', pathPrefix: '/admin' }
   *
   * // src/promos/black-friday.vue -> /promos-black-friday
   * { pagesDir: 'src/promos', pathPrefix: 'promos-' }
   * ```
   */
  pathPrefix?: string
}

/**
 * 多目录扫描选项
 *
 * 用于扫描多个页面目录，每个目录可以有独立的包含/排除规则。
 */
export interface MultiScanOptions {
  /** 页面目录配置列表 */
  pagesDirs: PagesDirConfig[]
  /** 要处理的文件扩展名列表 */
  extensions: string[]
  /**
   * 路由命名策略
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认）
   * - `lowercase`: 简单转换为小写
   * - `none`: 保持原始命名
   * @default 'kebab'
   */
  namingStrategy?: NamingStrategy
}

/**
 * 组件导入模式
 *
 * - `lazy`: 使用 lazy(() => import(...)) 懒加载组件
 * - `file`: 直接使用文件路径作为组件，由用户自行处理导入
 */
export type ImportMode = 'lazy' | 'file'

/**
 * 路由命名策略
 *
 * - `kebab`: 将驼峰命名转换为 kebab-case（默认），如 MainHome → main-home
 * - `lowercase`: 简单转换为小写，如 MainHome → mainhome
 * - `none`: 保持原始命名，不进行转换
 */
export type NamingStrategy = 'kebab' | 'lowercase' | 'none'

/**
 * Vite 插件配置选项
 *
 * 用于配置文件路由插件的行为。
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import VitarxRouter from 'vitarx-router/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     // 单个目录
 *     VitarxRouter({
 *       pagesDir: 'src/views',
 *       extensions: ['.tsx', '.ts', '.vue'],
 *       dts: 'src/types/auto-router.d.ts'
 *     })
 *   ]
 * })
 * ```
 *
 * @example
 * ```typescript
 * // 多个目录（数组形式）
 * VitarxRouter({
 *   pagesDir: ['src/pages', 'src/admin']
 * })
 * ```
 *
 * @example
 * ```typescript
 * // 多个目录（对象形式，每个目录独立配置）
 * VitarxRouter({
 *   pagesDir: [
 *     { dir: 'src/pages', exclude: ['components'] },
 *     { dir: 'src/admin', include: ['**\/*.tsx'] }
 *   ]
 * })
 * ```
 */
export interface VitePluginRouterOptions {
  /**
   * 页面目录配置
   *
   * 支持三种配置方式：
   * 1. 字符串：单个页面目录路径
   * 2. 字符串数组：多个页面目录路径，使用全局 include/exclude 规则
   * 3. 对象数组：多个页面目录，每个目录可以有独立的 include/exclude 规则
   *
   * @default 'src/pages'
   *
   * @example
   * ```typescript
   * // 单个目录
   * pagesDir: 'src/pages'
   *
   * // 多个目录（共享全局规则）
   * pagesDir: ['src/pages', 'src/admin']
   *
   * // 多个目录（独立规则）
   * pagesDir: [
   *   { dir: 'src/pages', exclude: ['components'] },
   *   { dir: 'src/admin', include: ['**\/*.tsx'] }
   * ]
   * ```
   */
  pagesDir?: string | (PagesDirConfig | string)[]
  /**
   * 路由前缀
   */
  prefix?: string
  /** 支持的文件扩展名，默认为 ['.tsx', '.ts', '.jsx', '.js'] */
  extensions?: string[]
  /**
   * 要包含的文件/目录 glob 模式列表，默认匹配所有文件
   *
   * 注意：当 pagesDir 为对象数组时，此选项不生效，请在每个目录配置中单独设置。
   *
   * 支持的 glob 模式：
   * - `*` - 匹配任意字符（不包括路径分隔符）
   * - `**` - 匹配任意字符（包括路径分隔符）
   * - `?` - 匹配单个字符
   * - `[abc]` - 匹配指定字符集中的任意一个字符
   * - `{a,b}` - 匹配指定的任意一个模式
   *
   * @example
   * ```typescript
   * include: [
   *   '**\/*.tsx',            // 只包含 .tsx 文件
   *   'pages\/**\/*'          // 只包含 pages 目录下的文件
   * ]
   * ```
   */
  include?: string[]
  /**
   * 要排除的文件/目录 glob 模式列表
   *
   * 注意：当 pagesDir 为对象数组时，此选项不生效，请在每个目录配置中单独设置。
   *
   * 支持的 glob 模式：
   * - `*` - 匹配任意字符（不包括路径分隔符）
   * - `**` - 匹配任意字符（包括路径分隔符）
   * - `?` - 匹配单个字符
   * - `[abc]` - 匹配指定字符集中的任意一个字符
   * - `{a,b}` - 匹配指定的任意一个模式
   *
   * @example
   * ```typescript
   * exclude: [
   *   'components',           // 排除 components 目录
   *   '__tests__',            // 排除 __tests__ 目录
   *   '**\/*.test.tsx',       // 排除所有测试文件
   *   '**\/__mocks__\/**'     // 排除所有 __mocks__ 目录
   * ]
   * ```
   */
  exclude?: string[]
  /**
   * 类型声明文件路径，设为 false 可禁用生成
   *
   * @default 'typed-router.d.ts'
   */
  dts?: string | false
  /**
   * 组件导入模式
   *
   * - `lazy`: 使用 lazy(() => import(...)) 懒加载组件（默认）
   * - `file`: 直接使用文件路径作为组件，由用户自行处理导入
   *
   * @default 'lazy'
   *
   * @example
   * ```typescript
   * // 使用 file 模式，手动处理导入
   * VitarxRouter({
   *   importMode: 'file'
   * })
   * // 生成的路由：
   * // { path: '/', component: '/系统绝对路径/src/pages/index.tsx' }
   * ```
   */
  importMode?: ImportMode
  /**
   * 路由扩展钩子
   *
   * 在生成每个路由配置时调用，允许开发者自定义扩展路由配置。
   * 可以用于添加 redirect、children、自定义属性等。
   *
   * @example
   * ```typescript
   * VitarxRouter({
   *   extendRoute(route) {
   *     // 为所有路由添加重定向
   *     if (route.path === '/old-path') {
   *       route.redirect = '/new-path'
   *     }
   *     // 返回修改后的路由
   *     return route
   *   }
   * })
   * ```
   */
  extendRoute?: ExtendRouteHook
  /**
   * 自定义导入语句
   *
   * 允许开发者向虚拟模块注入自定义的导入语句。
   * 当使用 `importMode: 'file'` 并在 `extendRoute` 中使用 `lazy` 时需要配置此项。
   *
   * @example
   * ```typescript
   * VitarxRouter({
   *   importMode: 'file',
   *   imports: ["import { lazy } from 'vitarx'"],
   *   extendRoute(route) {
   *     // 将文件路径转换为懒加载组件
   *     if(route.component) route.component = `lazy(() => import('${route.component}'))`
   *     return route
   *   }
   * })
   * ```
   */
  imports?: string[]
  /**
   * 路由命名策略
   *
   * 控制路由名称和路径的命名转换方式。
   * 注意：此选项只影响路径段名称，不影响动态参数变量名。
   *
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认），如 MainHome → main-home
   * - `lowercase`: 简单转换为小写，如 MainHome → mainhome
   * - `none`: 保持原始命名，不进行转换
   *
   * @default 'kebab'
   *
   * @example
   * ```typescript
   * // kebab 策略（默认）
   * VitarxRouter({
   *   namingStrategy: 'kebab'
   * })
   * // MainHome.tsx → { name: 'main-home', path: '/main-home' }
   * // [userName].tsx → { name: 'user-name', path: '/{userName}' }
   *
   * // lowercase 策略
   * VitarxRouter({
   *   namingStrategy: 'lowercase'
   * })
   * // MainHome.tsx → { name: 'mainhome', path: '/mainhome' }
   *
   * // none 策略
   * VitarxRouter({
   *   namingStrategy: 'none'
   * })
   * // MainHome.tsx → { name: 'MainHome', path: '/MainHome' }
   * ```
   */
  namingStrategy?: NamingStrategy
}

/**
 * 路由索引条目
 *
 * 描述单个路由的类型信息，主要用于类型推断。
 */
export interface RouteIndexMapEntry {
  /** 动态参数类型映射 */
  params?: Record<string, string | number>
}

/**
 * 路由索引映射表
 *
 * 将路由名称和路径映射到对应的类型信息。
 * 支持通过名称或路径两种方式进行类型安全的导航。
 *
 * @example
 * ```typescript
 * // 生成的类型示例
 * interface RouteIndexMap {
 *   'home': {},
 *   '/': {},
 *   'user-id': { params: { id: string } },
 *   '/user/{id}': { params: { id: string } }
 * }
 *
 * // 使用示例
 * router.push({ index: 'user-id', params: { id: '123' } })
 * ```
 */
export interface RouteIndexMap {
  [key: string]: RouteIndexMapEntry
}
