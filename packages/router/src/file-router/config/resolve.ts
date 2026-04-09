/**
 * @fileoverview 配置处理工具模块
 *
 * 提供页面目录配置的处理和文件检查功能。
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */
import { accessSync, constants } from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_CONFIG_FILE,
  DEFAULT_DTS_FILE,
  DEFAULT_EXCLUDE,
  DEFAULT_INCLUDE,
  DEFAULT_LAYOUT_FILE,
  DEFAULT_PAGES_DIR
} from '../constants.js'
import type {
  CodeTransformHook,
  ExtendRouteHook,
  FileRouterOptions,
  ImportMode,
  PageDirOptions,
  PageSource,
  PathStrategy
} from '../types/index.js'

export type PageDirConfig = Required<PageDirOptions>

/**
 * 规范化后的配置
 */
export interface ResolvedConfig {
  root: string
  pages: readonly PageDirConfig[]
  pathStrategy: PathStrategy
  importMode: ImportMode
  injectImports: readonly string[]
  dts: false | string
  layoutFileName: string
  configFileName: string
  transform?: CodeTransformHook
  extendRoute?: ExtendRouteHook
}

const DEFAULT_PAGE_CONFIG: Omit<Required<PageDirOptions>, 'dir'> = {
  exclude: DEFAULT_EXCLUDE,
  include: DEFAULT_INCLUDE,
  prefix: '/',
  group: false
}

/**
 * 将 pages 配置规范化为 PageConfig 数组
 *
 * 支持四种输入格式：
 * 1. 字符串：单个目录路径
 * 2. 对象：单个目录配置
 * 3. 字符串数组：多个目录路径
 * 4. 对象数组：每个目录独立配置
 *
 * @param pages - 用户配置的 pages
 * @param root - 项目根目录路径（用于解析相对路径）
 * @returns - 规范化后的目录配置数组
 */
function resolvePageConfigs(
  pages: PageSource | readonly PageSource[],
  root: string
): PageDirConfig[] {
  const list: readonly (PageDirConfig | string)[] = Array.isArray(pages) ? pages : [pages]
  return list.map(page => {
    const config = typeof page === 'string' ? { dir: page } : page
    const resolved = {
      ...DEFAULT_PAGE_CONFIG,
      ...config,
      dir: path.isAbsolute(config.dir) ? config.dir : path.resolve(root, config.dir)
    }
    if (resolved.prefix !== '/' && !resolved.prefix.startsWith('/')) {
      resolved.prefix = '/' + resolved.prefix
    }
    try {
      accessSync(resolved.dir, constants.R_OK | constants.W_OK)
    } catch (error) {
      throw new Error(
        `File router: Pages directory "${resolved.dir}" does not exist or is not accessible`
      )
    }
    return resolved
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
    dts = false,
    root = process.cwd(),
    pages = DEFAULT_PAGES_DIR,
    importMode = 'lazy',
    injectImports = [],
    pathStrategy = 'kebab',
    layoutFileName = DEFAULT_LAYOUT_FILE,
    configFileName = DEFAULT_CONFIG_FILE,
    transform,
    extendRoute
  } = options
  const resolvedPages = resolvePageConfigs(pages, root)
  return {
    dts: typeof dts === 'string' ? dts : dts ? DEFAULT_DTS_FILE : false,
    root,
    pages: resolvedPages,
    importMode,
    injectImports,
    pathStrategy,
    layoutFileName,
    configFileName,
    transform,
    extendRoute
  }
}
