import type { CodeTransformHook, ExtendRouteHook } from './hooks.js'

/**
 * 组件导入模式。
 *
 * - 'lazy': 生成懒加载表达式
 * - 'sync': 同步加载组件
 */
export type ImportMode = 'lazy' | 'sync'
/**
 * 生成路径的策略。
 */
export type PathStrategy = 'kebab' | 'lowercase' | 'raw'

export type PageSource = string | PageDirOptions

/**
 * 页面目录选项
 */
export interface PageDirOptions {
  /**
   * 页面目录
   */
  dir: string
  /**
   * 包含规则
   *
   * @default ['**\/*.{jsx,tsx}']
   */
  include?: readonly string[]
  /**
   * 排除规则
   *
   * @default ['**\/node_modules\/**', '**\/dist\/**', '**\/.*']
   */
  exclude?: readonly string[]
  /**
   * 路径前缀（当 group=true 时）
   * 或字符串前缀（当 group=false 时）
   */
  prefix?: string
  /**
   * 是否作为路由分组
   */
  group?: boolean
}

/**
 * 文件路由配置
 */
export interface FileRouterOptions {
  /**
   * 项目根目录
   *
   * @default process.cwd()
   */
  root?: string
  /**
   * 页面来源配置
   *
   * @default 'src/pages'
   */
  pages?: PageSource | readonly PageSource[]
  /**
   * 路径转换策略
   *
   * @default 'kebab'
   */
  pathStrategy?: PathStrategy
  /**
   * 组件导入模式
   *
   * @default 'lazy'
   */
  importMode?: ImportMode
  /**
   * 注入在路由虚拟模块顶部的导入语句
   *
   * @example
   * ```js
   * {
   *   injectImports: ['import { lazy } from "vitarx"']
   * }
   * ```
   */
  injectImports?: readonly string[]
  /**
   * 是否生成 dts 文件
   *
   * - `true`: 生成 dts 文件，文件名为 `router.d.ts`
   * - `false`: 不生成 dts 文件
   * - `string`: 生成 dts 文件，支持绝对路径和相对路径（相对于root）如：`'typed-router.d.ts'`
   *
   * @default false
   */
  dts?: boolean | string
  /**
   * 布局文件名
   *
   * @default '_layout'
   */
  layoutFileName?: string
  /**
   * 分组配置文件名
   *
   * @default '_config'
   */
  configFileName?: string
  /**
   * 代码转换
   *
   * 通常用于转换 markdown 文件内容为 `EsModule`。
   *
   * @example
   * ```js
   * {
   *   transform(content, file) {
   *     const { ext, name } = path.parse(file)
   *     if (ext === '.md') {
   *       const html = markdownToHtml(content)
   *       return `export default function ${name}() { return ${html} }`
   *     }
   *     return content
   *   }
   * }
   * ```
   */
  transform?: CodeTransformHook
  /**
   * 扩展路由
   *
   * @example
   * ```js
   * {
   *   extendRoute(route) {
   *      route.meta ??= { auth: true }
   *   }
   * }
   * ```
   */
  extendRoute?: ExtendRouteHook
}
