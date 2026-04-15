import type { CodeTransformHook, ExtendRouteHook } from './hooks.js'

/**
 * 自定义导入模式函数的上下文
 */
export interface ImportModeContext {
  /**
   * 组件文件路径（已 JSON.stringify）
   */
  importPath: string
  /**
   * 组件文件原始路径
   */
  filePath: string
  /**
   * 添加导入语句
   * 用于向生成的代码顶部添加 import 语句
   */
  addImport: (statement: string) => void
}

/**
 * 自定义导入模式函数
 *
 * @param context - 导入上下文
 * @returns 组件表达式代码
 *
 * @example
 * ```ts
 * // 自定义导入模式：使用 Vitarx.lazy
 * (context) => {
 *   context.addImport(`import { lazy } from 'vitarx'`)
 *   return `lazy(() => import(${context.importPath}))`
 * }
 * ```
 */
export type ImportModeFunction = (context: ImportModeContext) => string

/**
 * 组件导入模式。
 *
 * - 'lazy': 生成懒加载表达式 `lazy(() => import(path))`
 * - 'sync': 同步加载组件，生成 `import` 语句
 * - 函数: 自定义导入逻辑
 */
export type ImportMode = 'lazy' | 'sync' | ImportModeFunction
/**
 * 生成路径的策略。
 */
export type PathStrategy = 'kebab' | 'lowercase' | 'raw'

export type PageSource = string | PageDirOptions
/**
 * 路径解析结果
 */
export type PathParseResult =
  | string
  | {
      /** 解析后的路径 */
      routePath: string
      /** 视图名称 */
      viewName?: string
    }
/**
 * 路径解析器
 *
 * @param basename - 文件名称（不包含扩展名)
 * @param filePath - 完整的文件路径
 * @returns {PathParseResult} 路径解析结果包含路径和视图名称
 */
export type PathParser = (basename: string, filePath: string) => PathParseResult
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
   * - 'kebab': 转换为 kebab-case
   * - 'lowercase': 转换为 lowercase
   * - 'raw': 不转换
   *
   * @values 'kebab' | 'lowercase' | 'raw'
   * @default 'kebab'
   */
  pathStrategy?: PathStrategy
  /**
   * 组件导入模式
   *
   * - 'lazy': 生成懒加载表达式 `lazy(() => import(path))`
   * - 'sync': 同步加载组件，生成 `import` 语句
   * - 函数: 自定义导入逻辑
   *
   * @example
   * ```ts
   * // 使用预设模式
   * importMode: 'lazy'
   *
   * // 使用自定义函数
   * importMode: (context) => {
   *   context.addImport(`import { lazy } from 'vitarx'`)
   *   return `lazy(() => import(${context.importPath}))`
   * }
   * ```
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
  /**
   * 路径解析器
   *
   * @param basename - 文件名称（不包含扩展名）或目录名称
   * @param filePath - 完整的文件路径
   * @returns {PathParseResult} 返回字符串path，或包含path和viewName的对象
   */
  pathParser?: PathParser
}
