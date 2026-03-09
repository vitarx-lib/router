/**
 * @fileoverview 配置处理工具模块
 *
 * 提供页面目录配置的处理和文件检查功能。
 */
import micromatch from 'micromatch'
import path from 'node:path'
import type { ResolvedConfig } from 'vite'
import { DEFAULT_DTS_FILE, DEFAULT_EXTENSIONS, DEFAULT_PAGES_DIR } from './constants.js'
import type { ExtendRouteHook, ImportMode, PagesDirConfig, VitePluginRouterOptions } from './types.js'

/**
 * 规范化后的插件配置
 */
export interface NormalizedConfig {
  /** 规范化后的目录配置数组 */
  pagesDirs: PagesDirConfig[]
  /** 文件扩展名列表 */
  extensions: string[]
  /** 类型声明文件路径或 false */
  dts: string | false
  /** 组件导入模式 */
  importMode: ImportMode
  /** 路由扩展钩子 */
  extendRoute?: ExtendRouteHook
  /** 自定义导入语句 */
  imports?: string[]
}

/**
 * 规范化插件配置
 *
 * 将用户提供的配置转换为内部统一格式。
 *
 * @param options - 用户提供的配置选项
 * @returns 规范化后的配置对象
 */
export function normalizeConfig(options: VitePluginRouterOptions): NormalizedConfig {
  const {
    pagesDir = DEFAULT_PAGES_DIR,
    extensions,
    include = [],
    exclude = [],
    dts,
    importMode = 'lazy',
    extendRoute,
    imports
  } = options

  const pagesDirs = normalizePagesDirs(pagesDir, include, exclude)

  return {
    pagesDirs,
    extensions: extensions || DEFAULT_EXTENSIONS,
    dts: dts ?? DEFAULT_DTS_FILE,
    importMode,
    extendRoute,
    imports
  }
}

/**
 * 将 pagesDir 配置规范化为 PagesDirConfig 数组
 *
 * 支持三种输入格式：
 * 1. 字符串：单个目录路径
 * 2. 字符串数组：多个目录路径
 * 3. 对象数组：每个目录独立配置
 *
 * @param pagesDir - 用户配置的 pagesDir
 * @param include - 全局 include 规则
 * @param exclude - 全局 exclude 规则
 * @returns 规范化后的目录配置数组
 */
export function normalizePagesDirs(
  pagesDir: string | string[] | PagesDirConfig[],
  include: string[],
  exclude: string[]
): PagesDirConfig[] {
  // 字符串：单个目录
  if (typeof pagesDir === 'string') {
    return [{ dir: pagesDir, include, exclude }]
  }

  // 数组类型
  if (Array.isArray(pagesDir)) {
    // 检查是否为字符串数组
    if (pagesDir.length === 0 || typeof pagesDir[0] === 'string') {
      // 字符串数组：多个目录，使用全局 include/exclude
      return (pagesDir as string[]).map(dir => ({ dir, include, exclude }))
    }

    // 对象数组：每个目录独立配置
    return (pagesDir as PagesDirConfig[]).map(item => ({
      dir: item.dir,
      include: item.include || include,
      exclude: item.exclude || exclude
    }))
  }

  return [{ dir: DEFAULT_PAGES_DIR, include, exclude }]
}

/**
 * 获取所有页面目录的绝对路径配置
 *
 * @param pagesDirs - 规范化后的目录配置
 * @param viteConfig - Vite 配置对象
 * @returns 包含绝对路径的目录配置数组
 */
export function getAbsolutePagesDirs(
  pagesDirs: PagesDirConfig[],
  viteConfig: ResolvedConfig | null
): PagesDirConfig[] {
  if (!viteConfig) return pagesDirs

  return pagesDirs.map(dirConfig => ({
    dir: path.isAbsolute(dirConfig.dir)
      ? dirConfig.dir
      : path.resolve(viteConfig.root, dirConfig.dir),
    include: dirConfig.include,
    exclude: dirConfig.exclude
  }))
}

/**
 * 检查文件是否为页面文件（单目录版本）
 *
 * 支持 glob 模式匹配包含和排除规则。
 *
 * @param file - 文件路径
 * @param pagesDir - 页面目录路径
 * @param extensions - 支持的文件扩展名列表
 * @param include - 包含 glob 模式列表
 * @param exclude - 排除 glob 模式列表
 * @returns 如果是有效的页面文件返回 true
 */
export function isPageFile(
  file: string,
  pagesDir: string,
  extensions: string[],
  include: string[],
  exclude: string[]
): boolean {
  // 检查文件是否在页面目录内
  if (!file.startsWith(pagesDir)) {
    return false
  }

  // 检查文件扩展名
  const ext = path.extname(file)
  if (!extensions.includes(ext)) {
    return false
  }

  // 获取相对路径
  const relativePath = path.relative(pagesDir, file)
  const normalizedPath = relativePath.replace(/\\/g, '/')

  // 检查是否匹配包含模式
  if (
    include.length > 0 &&
    !micromatch.isMatch(normalizedPath, include, { basename: true, dot: true })
  ) {
    return false
  }

  // 检查是否匹配排除模式
  return !(
    exclude.length > 0 &&
    micromatch.isMatch(normalizedPath, exclude, {
      basename: true,
      dot: true
    })
  )
}

/**
 * 检查文件是否为页面文件（多目录版本）
 *
 * 遍历所有页面目录配置，检查文件是否属于任一目录。
 *
 * @param file - 文件路径
 * @param pagesDirs - 页面目录配置列表
 * @param extensions - 支持的文件扩展名列表
 * @returns 如果是有效的页面文件返回 true
 */
export function isPageFileInDirs(
  file: string,
  pagesDirs: PagesDirConfig[],
  extensions: string[]
): boolean {
  for (const dirConfig of pagesDirs) {
    const dirPath = dirConfig.dir
    const include = dirConfig.include || []
    const exclude = dirConfig.exclude || []

    if (isPageFile(file, dirPath, extensions, include, exclude)) {
      return true
    }
  }
  return false
}
