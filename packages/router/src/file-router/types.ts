/**
 * @fileoverview 类型定义模块
 *
 * 定义文件路由功能所需的所有 TypeScript 类型接口。
 * 这些类型用于描述页面配置、解析结果、路由生成等各个环节的数据结构。
 */
import type { NavOptions, RouteMetaData } from '../core/index.js'

export interface BasePageConfig {
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
   * @default '/'
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
  /** 支持的文件扩展名，默认为 ['.tsx', '.jsx'] */
  extensions?: string[]
}
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
  redirect?: string | NavOptions
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
 * extendRoute: async (route) => {
 *   const permissions = await fetchPermissions(route.path)
 *   route.meta = { ...route.meta, permissions }
 *   return route
 * }
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
 * const pagess: pagesConfig[] = [
 *   { dir: 'src/pages', exclude: ['components'] },
 *   { dir: 'src/admin', include: ['**\/*.tsx'], prefix: '/admin' }
 * ]
 * ```
 */
export interface PageConfig extends BasePageConfig {
  /** 页面目录路径 */
  dir: string
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
 * 文件读取上下文
 *
 * 提供文件的基本信息，供读取函数使用
 */
export interface FileReadContext {
  /** 文件绝对路径 */
  filePath: string
  /** 文件扩展名（包含点，如 '.md', '.tsx'） */
  extension: string
  /** 相对于页面目录的路径 */
  relativePath: string
  /** 页面目录路径 */
  pagesDir: string
}

/**
 * 文件读取函数
 *
 * 用于自定义文件读取和内容转换逻辑。
 * 支持异步操作，可用于：
 * - 读取 Markdown 文件并转换为 React 组件
 * - 自定义文件内容预处理
 * - 集成第三方转换工具
 *
 * @param context - 文件读取上下文
 * @param defaultRead - 默认读取函数，用于读取原始文件内容
 * @returns 文件内容字符串
 *
 * @example
 * ```typescript
 * // Markdown 转 React 组件示例
 * const fileReader: FileReader = async (context, defaultRead) => {
 *   if (context.extension === '.md') {
 *     const markdown = await defaultRead()
 *     const html = marked(markdown)
 *     return `export default function MarkdownPage() {
 *       return <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />
 *     }`
 *   }
 *   return defaultRead()
 * }
 * ```
 */
export type FileReader = (
  context: FileReadContext,
  defaultRead: () => Promise<string>
) => string | Promise<string>

/**
 * 文件路由配置选项（与构建工具无关）
 *
 * 用于配置文件路由的核心行为。
 *
 * @example
 * ```typescript
 * // 基本使用
 * const options: FileRouterOptions = {
 *   pages: 'src/views',
 *   extensions: ['.tsx', '.ts', '.vue'],
 * }
 *
 * // 多个目录
 * const options: FileRouterOptions = {
 *   pages: ['src/pages', 'src/admin']
 * }
 *
 * // 多个目录，每个目录独立配置
 * const options: FileRouterOptions = {
 *   pages: [
 *     { dir: 'src/pages', exclude: ['components'] },
 *     { dir: 'src/admin', include: ['**\/*.tsx'] }
 *   ]
 * }
 * ```
 */
export interface FileRouterOptions {
  /**
   * 项目根目录
   *
   * 用于解析相对路径。
   *
   * @default process.cwd()
   */
  root?: string
  /**
   * 页面目录配置
   *
   * 支持四种配置方式：
   * 1. 字符串：单个页面目录路径
   * 2. 对象：单个页面目录配置，可以有独立的 include/exclude 规则
   * 3. 字符串数组：多个页面目录路径，使用全局 include/exclude 规则
   * 4. 对象数组：多个页面目录，每个目录可以有独立的 include/exclude 规则
   *
   * @default 'src/pages'
   */
  pages?: string | PageConfig | (PageConfig | string)[]
  /**
   * 路由前缀
   */
  prefix?: string
  /** 支持的文件扩展名，默认为 ['.tsx', '.jsx'] */
  extensions?: string[]
  /**
   * 要包含的文件/目录 glob 模式列表，默认匹配所有文件
   */
  include?: string[]
  /**
   * 要排除的文件/目录 glob 模式列表
   */
  exclude?: string[]
  /**
   * 组件导入模式
   *
   * - `lazy`: 使用 lazy(() => import(...)) 懒加载组件（默认）
   * - `file`: 直接使用文件路径作为组件，由用户自行处理导入
   *
   * @default 'lazy'
   */
  importMode?: ImportMode
  /**
   * 路由扩展钩子
   */
  extendRoute?: ExtendRouteHook
  /**
   * 注入自定义导入语句
   */
  injectImports?: string[]
  /**
   * 路由命名策略
   *
   * @default 'kebab'
   */
  namingStrategy?: NamingStrategy
  /**
   * 自定义文件读取函数
   *
   * 用于读取和转换文件内容，支持异步操作。
   * 可用于将 Markdown 等非标准文件转换为组件代码。
   *
   * 当返回转换后的代码时，路由解析器将使用转换后的代码进行：
   * - 检测默认导出
   * - 解析 definePage 配置
   *
   * @example
   * ```typescript
   * // 支持 Markdown 文件
   * {
   *   extensions: ['.tsx', '.md'],
   *   fileReader: async (context, defaultRead) => {
   *     if (context.extension === '.md') {
   *       const content = await defaultRead()
   *       const html = marked(content)
   *       return `export default function Page() {
   *         return <div className="prose" dangerouslySetInnerHTML={{__html: ${JSON.stringify(html)}}} />
   *       }`
   *     }
   *     return defaultRead()
   *   }
   * }
   * ```
   */
  fileReader?: FileReader
}
