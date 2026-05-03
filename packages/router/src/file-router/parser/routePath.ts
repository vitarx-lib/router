/**
 * @fileoverview 路由路径计算辅助函数
 *
 * 从文件路径计算最终生成的路由 fullPath，
 * 支持已跟踪（在路由树中）和未跟踪（尚未扫描）两种场景。
 */
import nodePath from 'node:path'
import { type PageDirConfig } from '../config/resolve.js'
import type { PageParser, PathStrategy, ScanNode } from '../types/index.js'
import { applyPathStrategy } from '../utils/pathStrategy.js'
import { normalizeRoutePath, resolvePathVariable } from '../utils/pathUtils.js'
import { isPageFileInDirs } from './filterUtils.js'
import { type FileInfo, parsePageFile } from './parsePage.js'

interface RouteFullPathContext {
  fileMap: Map<string, ScanNode>
  pages: readonly PageDirConfig[]
  pageParser?: PageParser
  pathStrategy: PathStrategy
}

/**
 * 应用路径策略（命名转换 + 动态参数转换）
 *
 * @param path - 路径
 * @param strategy - 路径策略
 * @returns 转换后的路径
 */
function applyFullPathStrategy(path: string, strategy: PathStrategy): string {
  return resolvePathVariable(applyPathStrategy(path, strategy))
}

/**
 * 从节点树计算完整路由路径
 *
 * 沿 parent 链向上拼接所有节点的 path，与生成阶段 fullPath 的计算逻辑一致。
 *
 * @param node - 路由节点
 * @returns 完整路由路径
 */
function computeNodeFullPath(node: ScanNode): string {
  const segments: string[] = []
  let current: ScanNode | undefined = node
  while (current) {
    segments.unshift(current.path)
    current = current.parent
  }
  return normalizeRoutePath(segments.join('/'))
}

/**
 * 计算文件的完整路由路径
 *
 * 判断文件是否为页面文件，如果是则计算其最终生成的路由 fullPath。
 * 非页面文件（布局文件、配置文件等）返回 null。
 *
 * @param filePath - 文件绝对路径
 * @param fileInfo - 文件信息
 * @param context - 路由计算上下文
 * @returns 完整路由路径，非页面文件返回 null
 */
export function computeRouteFullPath(
  filePath: string,
  fileInfo: FileInfo,
  context: RouteFullPathContext
): string | null {
  const { fileMap, pages, pageParser, pathStrategy } = context

  const node = fileMap.get(filePath)
  if (node) {
    return computeNodeFullPath(node)
  }

  const page = isPageFileInDirs(filePath, pages) as PageDirConfig | false
  if (!page) return null

  const parsed = parsePageFile(filePath, pageParser, fileInfo)
  const pathSegment =
    parsed.path === 'index' ? '' : applyFullPathStrategy(parsed.path, pathStrategy)
  const segments: string[] = pathSegment ? [pathSegment] : []

  let dirPath = nodePath.dirname(filePath)
  while (dirPath.length > page.dir.length) {
    const dirNode = fileMap.get(dirPath)
    if (dirNode) {
      const parentFullPath = computeNodeFullPath(dirNode)
      return normalizeRoutePath(parentFullPath + '/' + segments.join('/'))
    }
    segments.unshift(applyFullPathStrategy(nodePath.basename(dirPath), pathStrategy))
    dirPath = nodePath.dirname(dirPath)
  }

  const prefix = page.prefix ? applyFullPathStrategy(page.prefix, pathStrategy) : ''
  return normalizeRoutePath(prefix + '/' + segments.join('/'))
}
