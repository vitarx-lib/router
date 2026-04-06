/**
 * @fileoverview 配置处理工具模块
 *
 * 提供页面目录配置的处理和文件检查功能。
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */
import path from 'node:path'
import { DEFAULT_EXTENSIONS, DEFAULT_INCLUDE, DEFAULT_PAGES_DIR } from '../constants.js'
import type {
  BasePageConfig,
  ExtendRouteHook,
  FileReader,
  FileRouterOptions,
  ImportMode,
  NamingStrategy,
  PageConfig
} from '../types.js'

export interface ResolvedPageConfig extends Required<PageConfig> {}
/**
 * 规范化后的配置
 */
export interface ResolvedConfig {
  /** 项目根目录路径 */
  root: string
  /**
   * 页面目录配置
   *
   * 支持三种配置方式：
   * 1. 字符串：单个页面目录路径
   * 2. 字符串数组：多个页面目录路径，使用全局 include/exclude 规则
   * 3. 对象数组：多个页面目录，每个目录可以有独立的 include/exclude 规则
   *
   * @default 'src/pages'
   */
  pages: ResolvedPageConfig[]
  /**
   * 组件导入模式
   *
   * - `lazy`: 使用 lazy(() => import(...)) 懒加载组件（默认）
   * - `file`: 直接使用文件路径作为组件，由用户自行处理导入
   *
   * @default 'lazy'
   */
  importMode: ImportMode
  /**
   * 路由扩展钩子
   */
  extendRoute?: ExtendRouteHook
  /**
   * 自定义导入语句
   */
  injectImports: string[]
  /**
   * 路由命名策略
   * @default 'kebab'
   */
  namingStrategy: NamingStrategy
  /**
   * 自定义文件读取函数
   */
  fileReader?: FileReader
}

/**
 * 将 pages 配置规范化为 ResolvedPageConfig 数组
 *
 * 支持四种输入格式：
 * 1. 字符串：单个目录路径
 * 2. 对象：单个目录配置
 * 3. 字符串数组：多个目录路径
 * 4. 对象数组：每个目录独立配置
 *
 * @param pages - 用户配置的 pages
 * @param baseConfig - 基础配置
 * @param root - 项目根目录路径（用于解析相对路径）
 * @returns - 规范化后的目录配置数组
 */
function resolvePageConfigs(
  pages: string | PageConfig | (PageConfig | string)[],
  baseConfig: Required<BasePageConfig>,
  root: string
): ResolvedPageConfig[] {
  const list = Array.isArray(pages) ? pages : [pages]
  return list.map(page => {
    const config = typeof page === 'string' ? { dir: page } : page
    const resolvedConfig = {
      ...baseConfig,
      ...config,
      dir: path.isAbsolute(config.dir) ? config.dir : path.resolve(root, config.dir)
    }
    resolvedConfig.prefix =
      resolvedConfig.prefix === '/' ? '/' : resolvedConfig.prefix.replace(/\/+$/, '')
    return resolvedConfig
  })
}

/**
 * 规范化文件路由配置
 *
 * 将用户提供的配置转换为内部统一格式。
 *
 * @param options - 用户提供的配置选项
 * @returns - 规范化后的配置对象
 */
export function resolveConfig(options: FileRouterOptions): ResolvedConfig {
  const {
    root = process.cwd(),
    pages = DEFAULT_PAGES_DIR,
    extensions = DEFAULT_EXTENSIONS,
    include = DEFAULT_INCLUDE,
    exclude = [],
    importMode = 'lazy',
    extendRoute,
    injectImports = [],
    namingStrategy = 'kebab',
    prefix = '/',
    fileReader
  } = options
  const basePageConfig: Required<BasePageConfig> = {
    include,
    exclude,
    prefix,
    extensions
  }
  const pagesDirs = resolvePageConfigs(pages, basePageConfig, root)
  return {
    root,
    pages: pagesDirs,
    importMode,
    extendRoute,
    injectImports: injectImports,
    namingStrategy,
    fileReader
  }
}
