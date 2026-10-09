/**
 * @fileoverview 文件过滤工具模块
 *
 * 提供基于 glob 模式的文件/目录包含排除过滤功能。
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
  const normalizedPath = normalizePathSeparator(path.relative(dir, file))
  if (include.length === 0) return true
  return micromatch.isMatch(normalizedPath, include, { dot: true, noext: true, ignore: exclude })
}

/**
 * 检查目录是否被 exclude 规则命中
 *
 * include 只约束文件（目录名没有扩展名，用文件名类 glob 匹配必然落空），
 * exclude 则同时约束目录：命中的目录连同整棵子树都不参与路由。缺了这层
 * 判断，目录下的页面文件、布局、配置文件仍会被逐一处理（布局/配置文件
 * 按文件名判定，先于 include/exclude，排除规则拦不住）。
 *
 * 匹配口径与 isPageFile 一致（相对基准目录），故「任意层级同名目录」的
 * 排除规则（如 components 目录）对目录自身同样命中；框架默认的
 * node_modules / dist 排除规则由此才真正生效。
 *
 * @param dir - 目录绝对路径
 * @param options - 页面目录配置（以 dir 字段为匹配基准）
 * @returns 是否应连同子树一起跳过
 */
export function isExcludedDir(dir: string, options: FilterOptions): boolean {
  const { dir: baseDir, exclude } = options
  if (exclude.length === 0) return false
  if (!dir.startsWith(baseDir)) return false
  // 基准目录自身（相对路径为空）不参与匹配，避免通配规则把页面根排除
  const normalizedPath = normalizePathSeparator(path.relative(baseDir, dir))
  if (normalizedPath === '') return false
  return micromatch.isMatch(normalizedPath, exclude, { dot: true, noext: true })
}

/**
 * 检查目录自身或其任一祖先是否被 exclude 命中
 *
 * 全量扫描在下钻时对每级目录调用 isExcludedDir，命中即剪枝整棵子树；
 * 增量更新（addPage）只拿到文件路径，无法复用下钻过程，需沿
 * 「基准目录 → 目标目录」逐级检查祖先链——否则形如 `components`
 * （精确目录名，无尾随 /**）的规则拦不住 `components/sub/` 内
 * 新增的文件，dev 增量结果将与全量扫描不一致（幽灵路由）。
 *
 * @param dir - 目标目录绝对路径
 * @param options - 页面目录配置（以 dir 字段为匹配基准）
 * @returns 目标目录或其任一祖先被排除时返回 true
 */
export function isInExcludedDir(dir: string, options: FilterOptions): boolean {
  const { dir: baseDir } = options
  if (!dir.startsWith(baseDir)) return false
  const relative = normalizePathSeparator(path.relative(baseDir, dir))
  if (relative === '') return false
  // 逐级截取祖先（a/b/c → a、a/b、a/b/c），拼接回绝对路径后复用 isExcludedDir，
  // 保证匹配口径（基准目录、micromatch 选项）与全量扫描完全一致
  const segments = relative.split('/')
  for (let depth = 1; depth <= segments.length; depth++) {
    const ancestor = normalizePathSeparator(path.join(baseDir, ...segments.slice(0, depth)))
    if (isExcludedDir(ancestor, options)) return true
  }
  return false
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
