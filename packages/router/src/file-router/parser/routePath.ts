/**
 * @fileoverview 路由路径计算辅助函数
 *
 * 从文件路径计算最终生成的路由 fullPath，
 * 支持已跟踪（在路由树中）和未跟踪（尚未扫描）两种场景。
 */
import nodePath from 'node:path'
import { type PageDirConfig } from '../config/resolve.js'
import type { GroupParser, PageParser, PathStrategy, ScanNode } from '../types/index.js'
import { parseGroupResult } from '../utils/groupParser.js'
import { applyPathStrategy } from '../utils/pathStrategy.js'
import { normalizeRoutePath, resolvePathVariable } from '../utils/pathUtils.js'
import { isPageFileInDirs } from './filterUtils.js'
import { type FileInfo, parsePageFile } from './parsePage.js'

interface RouteFullPathContext {
  fileMap: Map<string, ScanNode>
  pages: readonly PageDirConfig[]
  pageParser?: PageParser
  groupParser?: GroupParser
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
  const { fileMap, pages, pageParser, groupParser, pathStrategy } = context

  // 场景一：文件已在路由树中，直接沿 parent 链计算 fullPath
  const node = fileMap.get(filePath)
  if (node) {
    return computeNodeFullPath(node)
  }

  // 场景二：文件尚未被扫描跟踪，需要从文件路径手动计算
  const page = isPageFileInDirs(filePath, pages) as PageDirConfig | false
  if (!page) return null

  // 解析文件名得到路径段（index 文件不产生路径段）
  const parsed = parsePageFile(filePath, pageParser, fileInfo)
  const pathSegment = parsed.path === 'index' ? '' : parsed.path
  const segments: string[] = pathSegment ? [pathSegment] : []

  // 从文件所在目录向上遍历至 pages.dir 根目录，逐级收集路径段
  let dirPath = nodePath.dirname(filePath)
  while (dirPath.length > page.dir.length) {
    const dirNode = fileMap.get(dirPath)
    if (dirNode) {
      // 目录已在路由树中，直接复用其 fullPath 作为前缀，无需继续向上遍历
      const parentFullPath = computeNodeFullPath(dirNode)
      segments.unshift(parentFullPath)
      return normalizeRoutePath(applyFullPathStrategy(segments.join('/'), pathStrategy))
    }
    // 目录未被跟踪，通过 groupParser 解析目录名（如 "1.user" → "user"），再作为路径段
    const dirName = nodePath.basename(dirPath)
    const { routePath: parsedDirName } = parseGroupResult(dirName, dirPath, groupParser)
    segments.unshift(parsedDirName)
    dirPath = nodePath.dirname(dirPath)
  }

  // 顶层路由拼接 prefix
  if (page.prefix) segments.unshift(page.prefix)
  // 统一应用路径策略（命名转换 + 动态参数转换）并规范化
  return normalizeRoutePath(applyFullPathStrategy(segments.join('/'), pathStrategy))
}
