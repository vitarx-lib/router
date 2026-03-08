/**
 * @fileoverview 类型定义模块
 *
 * 定义文件路由功能所需的所有 TypeScript 类型接口。
 * 这些类型用于描述页面配置、解析结果、路由生成等各个环节的数据结构。
 */
import type { RouteMetaData } from '../../core/index.js'

/**
 * 页面配置选项
 *
 * 用于 definePage 宏函数，允许开发者在页面组件中自定义路由配置。
 *
 * @example
 * ```tsx
 * import { definePage } from 'vitarx-router/auto-routes'
 *
 * definePage({
 *   name: 'user-detail',
 *   meta: { title: '用户详情', requiresAuth: true }
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
  /** 路由元数据，可存储标题、权限等自定义信息 */
  meta?: RouteMetaData
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
  /** 父级路径 */
  parentPath: string
}

/**
 * 解析后的路由配置
 *
 * 用于代码生成阶段的中间数据结构，表示一个完整的路由记录。
 */
export interface ResolvedRoute {
  /** 路由路径 */
  path: string
  /** 路由名称 */
  name: string
  /** 组件导入表达式 */
  component: string
  /** 路由元数据 */
  meta?: RouteMetaData
  /** 子路由列表 */
  children?: ResolvedRoute[]
}

/**
 * 页面目录配置项
 *
 * 用于配置多个页面目录时，可以为每个目录指定独立的包含/排除规则。
 *
 * @example
 * ```typescript
 * const pagesDirs: PagesDirConfig[] = [
 *   { dir: 'src/pages', exclude: ['components'] },
 *   { dir: 'src/admin', include: ['**\/*.tsx'] }
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
  include: string[]
  /** 要排除的文件/目录 glob 模式列表 */
  exclude: string[]
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
}

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
  pagesDir?: string | string[] | PagesDirConfig[]
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
  /** 类型声明文件路径，设为 false 可禁用生成 */
  dts?: string | false
  /** 路由块解析语言（保留用于未来扩展） */
  routeBlockLang?: string
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
