/**
 * @fileoverview 页面扫描模块
 *
 * 负责扫描指定目录下的页面文件，并构建路由树结构。
 * 支持递归扫描、glob 包含/排除规则和嵌套路由。
 */
import micromatch from 'micromatch'
import fs from 'node:fs'
import path from 'node:path'
import { parsePageFile } from './parsePage.js'
import type { MultiScanOptions, ParsedPage, ScanOptions } from './types.js'

/** 默认的包含模式，匹配所有文件 */
const DEFAULT_INCLUDE = ['**/*']

/**
 * 扫描页面目录
 *
 * 递归扫描指定目录下的所有页面文件，返回解析后的页面信息列表。
 *
 * @param options - 扫描配置选项
 * @param options.pagesDir - 页面目录的绝对路径
 * @param options.extensions - 要处理的文件扩展名列表
 * @param options.include - 要包含的文件/目录 glob 模式列表，默认匹配所有文件
 * @param options.exclude - 要排除的文件/目录 glob 模式列表
 * @returns 解析后的页面信息数组
 *
 * @example
 * ```typescript
 * const pages = scanPages({
 *   pagesDir: '/project/src/pages',
 *   extensions: ['.tsx', '.ts'],
 *   include: ['**\/*.tsx'],
 *   exclude: ['components', '__tests__']
 * })
 * ```
 */
export function scanPages(options: ScanOptions): ParsedPage[] {
  const { pagesDir, extensions, include = DEFAULT_INCLUDE, exclude } = options

  // 目录不存在时返回空数组
  if (!fs.existsSync(pagesDir)) {
    return []
  }

  const pages: ParsedPage[] = []

  /**
   * 递归扫描目录
   *
   * @param dir - 当前扫描的目录路径
   * @param parentPath - 父级路径（用于构建嵌套路由）
   */
  function scanDirectory(dir: string, parentPath: string = ''): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    // 分离目录和文件，便于后续处理
    const directories: fs.Dirent[] = []
    const files: fs.Dirent[] = []

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const isDir = entry.isDirectory()

      // 检查是否匹配包含模式
      if (!isIncluded(fullPath, pagesDir, include, isDir)) {
        continue
      }

      // 检查是否匹配排除模式
      if (isExcluded(fullPath, pagesDir, exclude, isDir)) {
        continue
      }

      if (isDir) {
        directories.push(entry)
      } else if (entry.isFile()) {
        files.push(entry)
      }
    }

    // 先处理当前目录下的文件
    for (const file of files) {
      const filePath = path.join(dir, file.name)
      const ext = path.extname(file.name)

      // 只处理指定扩展名的文件
      if (!extensions.includes(ext)) {
        continue
      }

      const parsed = parsePageFile(filePath, pagesDir, parentPath)
      if (parsed) {
        pages.push(parsed)
      }
    }

    // 再递归处理子目录
    for (const directory of directories) {
      const dirPath = path.join(dir, directory.name)
      // 构建新的父路径，用于子页面的 parentPath 属性
      const newParentPath = parentPath ? `${parentPath}/${directory.name}` : directory.name
      scanDirectory(dirPath, newParentPath)
    }
  }

  scanDirectory(pagesDir)
  return pages
}

/**
 * 扫描多个页面目录
 *
 * 递归扫描多个指定目录下的所有页面文件，返回合并后的页面信息列表。
 * 每个目录可以有独立的 include/exclude 规则。
 *
 * @param options - 多目录扫描配置选项
 * @param options.pagesDirs - 页面目录配置列表
 * @param options.extensions - 要处理的文件扩展名列表
 * @returns 解析后的页面信息数组
 *
 * @example
 * ```typescript
 * const pages = scanMultiplePages({
 *   pagesDirs: [
 *     { dir: '/project/src/pages', exclude: ['components'] },
 *     { dir: '/project/src/admin', include: ['**\/*.tsx'] }
 *   ],
 *   extensions: ['.tsx', '.ts']
 * })
 * ```
 */
export function scanMultiplePages(options: MultiScanOptions): ParsedPage[] {
  const { pagesDirs, extensions } = options
  const allPages: ParsedPage[] = []

  for (const dirConfig of pagesDirs) {
    const dirPath = typeof dirConfig === 'string' ? dirConfig : dirConfig.dir
    const include =
      typeof dirConfig === 'object' && dirConfig.include ? dirConfig.include : DEFAULT_INCLUDE
    const exclude = typeof dirConfig === 'object' && dirConfig.exclude ? dirConfig.exclude : []

    const pages = scanPages({
      pagesDir: dirPath,
      extensions,
      include,
      exclude
    })

    allPages.push(...pages)
  }

  return allPages
}

/**
 * 检查路径是否匹配包含模式
 *
 * @param filePath - 要检查的文件绝对路径
 * @param pagesDir - 页面目录的绝对路径
 * @param include - 包含 glob 模式列表
 * @param isDirectory - 是否为目录
 * @returns 如果路径匹配任一包含模式则返回 true
 */
function isIncluded(
  filePath: string,
  pagesDir: string,
  include: string[],
  isDirectory: boolean = false
): boolean {
  if (include.length === 0) {
    return true
  }

  // 获取相对于 pagesDir 的相对路径
  const relativePath = path.relative(pagesDir, filePath)
  const normalizedPath = relativePath.replace(/\\/g, '/')

  // 对于目录，需要额外检查模式是否匹配目录前缀
  // 例如 admin/** 应该匹配 admin 目录
  if (isDirectory) {
    for (const pattern of include) {
      // 检查模式是否以 /** 结尾，如果是则检查目录前缀
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3)
        if (normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')) {
          return true
        }
      } else if (pattern === '**' || pattern === '**/*') {
        // ** 或 **/* 匹配所有目录
        return true
      } else {
        // 检查模式是否匹配目录名
        if (micromatch.isMatch(normalizedPath, pattern, { dot: true })) {
          return true
        }
        // 检查目录是否是模式的父目录
        // 例如模式为 admin/index.tsx，admin 目录应该被包含
        const patternParts = pattern.split('/')
        if (patternParts.length > 1 && normalizedPath === patternParts[0]) {
          return true
        }
      }
    }
    return false
  }

  // 对于文件，不使用 basename 选项，因为这会导致 admin/** 无法匹配 admin/index.tsx
  return micromatch.isMatch(normalizedPath, include, {
    dot: true
  })
}

/**
 * 检查路径是否应该被排除
 *
 * 支持 glob 模式匹配，使用 micromatch 库实现。
 *
 * 支持的 glob 模式：
 * - `*` - 匹配任意字符（不包括路径分隔符）
 * - `**` - 匹配任意字符（包括路径分隔符）
 * - `?` - 匹配单个字符
 * - `[abc]` - 匹配指定字符集中的任意一个字符
 * - `{a,b}` - 匹配指定的任意一个模式
 *
 * @param filePath - 要检查的文件绝对路径
 * @param pagesDir - 页面目录的绝对路径
 * @param exclude - 排除 glob 模式列表
 * @param isDirectory - 是否为目录
 * @returns 如果路径匹配任一排除模式则返回 true
 *
 * @example
 * ```typescript
 * // 匹配 admin 目录下的所有文件
 * isExcluded('/src/pages/admin/index.tsx', '/src/pages', ['admin'])
 * // => true
 *
 * // 匹配 components 目录下的所有文件
 * isExcluded('/src/pages/components/Button.tsx', '/src/pages', ['components'])
 * // => true
 *
 * // 匹配所有测试文件
 * isExcluded('/src/pages/user.test.tsx', '/src/pages', ['*.test.tsx'])
 * // => true
 * ```
 */
function isExcluded(
  filePath: string,
  pagesDir: string,
  exclude: string[],
  isDirectory: boolean = false
): boolean {
  if (exclude.length === 0) {
    return false
  }

  // 获取相对于 pagesDir 的相对路径，用于 glob 匹配
  const relativePath = path.relative(pagesDir, filePath)

  // 使用 micromatch 进行 glob 匹配
  // 匹配时使用相对路径，支持正斜杠
  const normalizedPath = relativePath.replace(/\\/g, '/')

  // 对于目录，需要额外检查模式是否匹配目录前缀
  // 例如 components/** 应该排除 components 目录
  if (isDirectory) {
    for (const pattern of exclude) {
      // 检查模式是否以 /** 结尾，如果是则检查目录前缀
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3)
        if (normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')) {
          return true
        }
      } else if (pattern === '**' || pattern === '**/*') {
        // ** 或 **/* 排除所有目录
        return true
      } else if (pattern.includes('/')) {
        // 模式包含路径分隔符，检查目录是否是模式的父目录
        // 但只有当模式以通配符开头时才排除目录
        // 例如 components/** 排除 components 目录
        // 但 admin/users.tsx 不应该排除 admin 目录
        const patternParts = pattern.split('/')
        if (patternParts[0].includes('*') && normalizedPath === patternParts[0]) {
          return true
        }
      } else {
        // 简单模式，检查是否匹配目录名
        if (micromatch.isMatch(normalizedPath, pattern, { dot: true })) {
          return true
        }
      }
    }
    return false
  }

  // 对于文件，不使用 basename 选项，因为这会导致 components/** 无法匹配 components/Button.tsx
  return micromatch.isMatch(normalizedPath, exclude, {
    dot: true
  })
}

/**
 * 构建路由树
 *
 * 将扁平的页面列表转换为树形结构，建立父子路由关系。
 *
 * 算法说明：
 * 1. 使用路径映射表快速查找父路由
 * 2. 根据路径层级关系确定父子关系
 * 3. 对路由进行排序（索引路由优先，静态路由优先于动态路由）
 *
 * @param pages - 解析后的页面列表
 * @returns 树形结构的路由列表
 *
 * @example
 * ```typescript
 * // 输入：扁平列表
 * const pages = [
 *   { path: '/', name: 'home' },
 *   { path: '/user', name: 'user' },
 *   { path: '/user/{id}', name: 'user-id' }
 * ]
 *
 * // 输出：树形结构
 * const tree = buildRouteTree(pages)
 * // tree[0] = { path: '/' }
 * // tree[1] = { path: '/user', children: [{ path: '/user/{id}' }] }
 * ```
 */
export function buildRouteTree(pages: ParsedPage[]): ParsedPage[] {
  const root: ParsedPage[] = []
  const pathMap = new Map<string, ParsedPage>()

  // 构建路径映射表，并初始化 children 数组
  for (const page of pages) {
    pathMap.set(page.path, { ...page, children: [] })
  }

  // 遍历所有页面，建立父子关系
  for (const page of pathMap.values()) {
    const pathParts = page.path.split('/').filter(Boolean)

    // 根路由或一级非索引路由直接添加到根列表
    if (pathParts.length === 0 || (pathParts.length === 1 && !page.isIndex)) {
      root.push(page)
      continue
    }

    // 一级索引路由也添加到根列表
    if (page.isIndex && pathParts.length === 1) {
      root.push(page)
      continue
    }

    // 查找父路由：父路径是当前路径去掉最后一段
    const parentPath = '/' + pathParts.slice(0, -1).join('/')
    const parent = pathMap.get(parentPath)

    if (parent) {
      // 找到父路由，添加为子路由
      parent.children.push(page)
    } else {
      // 未找到父路由，作为根路由处理
      root.push(page)
    }
  }

  return sortRoutes(root)
}

/**
 * 对路由列表进行排序
 *
 * 排序规则：
 * 1. 索引路由（index.tsx）优先
 * 2. 静态路由优先于动态路由
 * 3. 按路径字母顺序排序
 *
 * @param routes - 要排序的路由列表
 * @returns 排序后的路由列表
 */
function sortRoutes(routes: ParsedPage[]): ParsedPage[] {
  return routes
    .sort((a, b) => {
      // 索引路由优先
      if (a.isIndex && !b.isIndex) return -1
      if (!a.isIndex && b.isIndex) return 1

      // 静态路由优先于动态路由
      if (a.isDynamic && !b.isDynamic) return 1
      if (!a.isDynamic && b.isDynamic) return -1

      // 按路径字母顺序排序
      return a.path.localeCompare(b.path)
    })
    .map(route => ({
      ...route,
      children: sortRoutes(route.children)
    }))
}
