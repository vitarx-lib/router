/**
 * @fileoverview 文件过滤工具模块
 *
 * 提供基于 glob 模式的文件包含/排除过滤功能。
 * 从 scanPages.ts 中提取，消除重复代码。
 */
import micromatch from 'micromatch'
import path from 'node:path'
import { normalizePathSeparator } from '../utils/index.js'

export interface FilterOptions {
  dir: string
  include: readonly string[]
  exclude: readonly string[]
}

/**
 * 检查文件是否为页面文件（单目录版本）
 *
 * 支持 glob 模式匹配包含和排除规则。
 *
 * @param file - 文件路径
 * @param options - 页面目录配置
 * @returns 如果是有效的页面文件返回 true
 */
export function isPageFile(file: string, options: FilterOptions): boolean {
  const { dir, include, exclude } = options
  if (!file.startsWith(dir)) return false
  const relativePath = path.relative(dir, file)
  const normalizedPath = normalizePathSeparator(relativePath)
  if (include.length === 0) return true
  return micromatch.isMatch(normalizedPath, include, { dot: true, noext: true, ignore: exclude })
}

/**
 * 检查文件是否为页面文件（多目录版本）
 *
 * 遍历所有页面目录配置，检查文件是否属于任一目录。
 *
 * @param file - 文件路径
 * @param pages - 页面目录配置列表
 * @returns 如果是有效的页面文件返回 true
 */
export function isPageFileInDirs(
  file: string,
  pages: readonly FilterOptions[]
): FilterOptions | false {
  for (const page of pages) {
    if (isPageFile(file, page)) return page
  }
  return false
}
