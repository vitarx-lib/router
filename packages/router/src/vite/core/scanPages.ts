/**
 * @fileoverview 页面扫描模块
 *
 * 负责扫描指定目录下的页面文件，并构建路由树结构。
 * 支持递归扫描、排除规则和嵌套路由。
 */
import fs from 'node:fs'
import path from 'node:path'
import type { ScanOptions, ParsedPage } from './types.js'
import { parsePageFile } from './parsePage.js'

/**
 * 扫描页面目录
 *
 * 递归扫描指定目录下的所有页面文件，返回解析后的页面信息列表。
 *
 * @param options - 扫描配置选项
 * @param options.pagesDir - 页面目录的绝对路径
 * @param options.extensions - 要处理的文件扩展名列表
 * @param options.exclude - 要排除的文件/目录模式列表
 * @returns 解析后的页面信息数组
 *
 * @example
 * ```typescript
 * const pages = scanPages({
 *   pagesDir: '/project/src/pages',
 *   extensions: ['.tsx', '.ts'],
 *   exclude: ['components', '__tests__']
 * })
 * ```
 */
export function scanPages(options: ScanOptions): ParsedPage[] {
  const { pagesDir, extensions, exclude } = options

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

      // 跳过被排除的文件/目录
      if (isExcluded(fullPath, exclude)) {
        continue
      }

      if (entry.isDirectory()) {
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
 * 检查路径是否应该被排除
 *
 * @param filePath - 要检查的文件路径
 * @param exclude - 排除模式列表
 * @returns 如果路径匹配任一排除模式则返回 true
 */
function isExcluded(filePath: string, exclude: string[]): boolean {
  for (const pattern of exclude) {
    if (filePath.includes(pattern)) {
      return true
    }
  }
  return false
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
 *   { path: '/', name: 'home', ... },
 *   { path: '/user', name: 'user', ... },
 *   { path: '/user/{id}', name: 'user-id', ... }
 * ]
 *
 * // 输出：树形结构
 * const tree = buildRouteTree(pages)
 * // tree[0] = { path: '/', ... }
 * // tree[1] = { path: '/user', children: [{ path: '/user/{id}', ... }] }
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
