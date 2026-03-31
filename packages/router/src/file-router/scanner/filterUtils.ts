/**
 * @fileoverview 文件过滤工具模块
 *
 * 提供基于 glob 模式的文件包含/排除过滤功能。
 * 从 scanPages.ts 中提取，消除重复代码。
 */
import micromatch from 'micromatch'
import path from 'node:path'
import type { ResolvedPageConfig } from '../config/index.js'
import { normalizePathSeparator } from '../utils/index.js'

/**
 * 匹配 glob 模式
 *
 * 统一处理 include 和 exclude 的模式匹配逻辑。
 *
 * @param normalizedPath - 已规范化的相对路径
 * @param patterns - glob 模式数组
 * @param isDirectory - 是否为目录
 * @returns {boolean} - 是否匹配任一模式
 */
function matchGlobPatterns(
  normalizedPath: string,
  patterns: string[],
  isDirectory: boolean
): boolean {
  for (const pattern of patterns) {
    if (isDirectory) {
      if (matchDirectoryPattern(normalizedPath, pattern)) {
        return true
      }
    } else {
      if (micromatch.isMatch(normalizedPath, pattern, { dot: true })) {
        return true
      }
    }
  }
  return false
}

/**
 * 匹配目录模式
 *
 * 处理目录特有的 glob 匹配逻辑。
 *
 * @param normalizedPath - 已规范化的相对路径
 * @param pattern - glob 模式
 * @returns 是否匹配
 */
function matchDirectoryPattern(normalizedPath: string, pattern: string): boolean {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3)
    return normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')
  }

  if (pattern === '**' || pattern === '**/*') {
    return true
  }

  if (micromatch.isMatch(normalizedPath, pattern, { dot: true })) {
    return true
  }

  const patternParts = pattern.split('/')
  return patternParts.length > 1 && normalizedPath === patternParts[0]
}

/**
 * 匹配目录排除模式
 *
 * @param normalizedPath - 已规范化的相对路径
 * @param exclude - 排除 glob 模式列表
 * @returns 是否应该排除
 */
function matchDirectoryExcludePatterns(normalizedPath: string, exclude: string[]): boolean {
  for (const pattern of exclude) {
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3)
      if (normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')) {
        return true
      }
    } else if (pattern === '**' || pattern === '**/*') {
      return true
    } else if (pattern.includes('/')) {
      const patternParts = pattern.split('/')
      if (patternParts[0].includes('*') && normalizedPath === patternParts[0]) {
        return true
      }
    } else {
      if (micromatch.isMatch(normalizedPath, pattern, { dot: true })) {
        return true
      }
    }
  }
  return false
}

/**
 * 检查文件是否应该被包含
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录绝对路径
 * @param include - 包含 glob 模式列表
 * @param isDirectory - 是否为目录
 * @returns 是否应该包含
 */
function shouldInclude(
  filePath: string,
  pagesDir: string,
  include: string[],
  isDirectory: boolean = false
): boolean {
  if (include.length === 0) {
    return true
  }

  const relativePath = path.relative(pagesDir, filePath)
  const normalizedPath = normalizePathSeparator(relativePath)

  return matchGlobPatterns(normalizedPath, include, isDirectory)
}

/**
 * 检查文件是否应该被排除
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录绝对路径
 * @param exclude - 排除 glob 模式列表
 * @param isDirectory - 是否为目录
 * @returns 是否应该排除
 */
function shouldExclude(
  filePath: string,
  pagesDir: string,
  exclude: string[],
  isDirectory: boolean = false
): boolean {
  if (exclude.length === 0) {
    return false
  }

  const relativePath = path.relative(pagesDir, filePath)
  const normalizedPath = normalizePathSeparator(relativePath)

  if (isDirectory) {
    return matchDirectoryExcludePatterns(normalizedPath, exclude)
  }

  return micromatch.isMatch(normalizedPath, exclude, { dot: true })
}

/**
 * 检查文件是否应该被包含
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录绝对路径
 * @param include - 包含 glob 模式列表
 * @param exclude - 排除 glob 模式列表
 * @param isDirectory - 是否为目录
 */
export function shouldProcessFile(
  filePath: string,
  pagesDir: string,
  include: string[],
  exclude: string[],
  isDirectory: boolean
): boolean {
  return (
    shouldInclude(filePath, pagesDir, include, isDirectory) &&
    !shouldExclude(filePath, pagesDir, exclude, isDirectory)
  )
}

/**
 * 检查文件是否为页面文件（单目录版本）
 *
 * 支持 glob 模式匹配包含和排除规则。
 *
 * @param file - 文件路径
 * @param absPath - 页面目录绝对路径
 * @param include - 包含 glob 模式列表
 * @param exclude - 排除 glob 模式列表
 * @param extensions - 支持的文件扩展名列表
 * @returns 如果是有效的页面文件返回 true
 */
export function isPageFile(
  file: string,
  absPath: string,
  include: string[],
  exclude: string[],
  extensions: string[]
): boolean {
  if (!file.startsWith(absPath)) {
    return false
  }

  const ext = path.extname(file)
  if (!extensions.includes(ext)) {
    return false
  }

  const relativePath = path.relative(absPath, file)
  const normalizedPath = normalizePathSeparator(relativePath)

  if (
    include.length > 0 &&
    !micromatch.isMatch(normalizedPath, include, { basename: true, dot: true })
  ) {
    return false
  }

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
  pagesDirs: ResolvedPageConfig[],
  extensions: string[]
): boolean {
  for (const dirConfig of pagesDirs) {
    if (isPageFile(file, dirConfig.dir, dirConfig.include, dirConfig.exclude, extensions))
      return true
  }
  return false
}
