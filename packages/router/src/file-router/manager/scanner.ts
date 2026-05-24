/**
 * @fileoverview 路由扫描器
 *
 * 负责递归扫描文件系统目录，构建路由节点树（ScanNode[]）。
 * 扫描过程将文件分为四类（页面、布局、配置、忽略），
 * 并调用对应的处理器生成路由节点或注册辅助文件。
 *
 * 扫描器与构建工具无关，可在 Vite、Webpack、Rollup 或 Node.js 脚本中复用。
 */
import { existsSync, readdirSync } from 'node:fs'
import nodePath from 'node:path'
import { type ResolvedConfig } from '../config/index.js'
import { type ProcessorContext, type ScanDirConfig, parseGroupResult, processConfigFile, processLayoutFile, processPageFile } from './file-processor.js'
import { resolveFile } from './file-classifier.js'
import type { ScanNode } from '../types/index.js'
import { normalizePathSeparator, warn } from '../utils/index.js'

/**
 * 扫描所有页面目录，构建路由节点树
 *
 * 遍历配置中的每个页面目录，根据 group 配置决定扫描策略：
 * - group=true：创建分组路由节点，子路由嵌套在其 children 中
 * - group=false：子路由直接平铺到顶层列表
 *
 * @param context - 文件处理上下文
 * @returns 顶层路由节点数组
 */
export function scanPages(context: ProcessorContext): ScanNode[] {
  const pages: ScanNode[] = []
  for (const page of context.config.pages) {
    if (!existsSync(page.dir)) {
      warn(`Directory ${page.dir} does not exist, please check your configuration.`)
      continue
    }
    // 分组路由：创建包装节点，子路由嵌套在 children 中
    if (page.group && page.prefix) {
      const route: ScanNode = {
        isGroup: true,
        filePath: page.dir,
        path: context.applyPathStrategy(page.prefix)
      }
      route.children = scanPageDir({ ...page, prefix: '' }, route, context)
      // 空目录不生成路由节点
      if (route.children.size > 0) {
        pages.push(route)
        context.fileMap.set(route.filePath, route)
      }
      continue
    }
    // 非分组路由：子路由直接平铺
    const children = scanPageDir(page, undefined, context)
    pages.push(...children.values())
  }
  return pages
}

/**
 * 扫描单个目录下的文件和子目录
 *
 * 遍历目录中的每个条目，根据类型（文件/目录）分发处理。
 * 使用 pageMapping 合并同路径的命名视图文件到同一个路由节点。
 *
 * @param page - 目录扫描配置
 * @param parent - 父路由节点，目录级文件的副作用（布局、配置）将注册到此节点
 * @param context - 文件处理上下文
 * @returns 子路由节点集合
 */
function scanPageDir(
  page: ScanDirConfig,
  parent: ScanNode | undefined,
  context: ProcessorContext
): Set<ScanNode> {
  const entries = readdirSync(page.dir, { withFileTypes: true })
  // 直接子路由映射，键为解析后的路径（不含 @视图命名），用于合并命名视图
  const pageMapping = new Map<string, ScanNode>()
  const children: Set<ScanNode> = new Set()

  for (const dirent of entries) {
    const filePath = normalizePathSeparator(nodePath.resolve(dirent.parentPath, dirent.name))
    let route: ScanNode | null = null

    if (dirent.isDirectory()) {
      route = processDirEntry(filePath, dirent.name, page, parent, context)
    } else {
      route = processFileEntry(filePath, page, pageMapping, parent, context)
    }

    if (route) {
      children.add(route)
      context.fileMap.set(filePath, route)
    }
  }
  return children
}

/**
 * 处理目录条目
 *
 * 解析目录名（可能经过 groupParser 转换），创建分组路由节点，
 * 然后递归扫描子目录。空目录不生成路由节点。
 *
 * @param filePath - 目录绝对路径
 * @param fileName - 目录名
 * @param page - 所属页面目录配置
 * @param parent - 父路由节点
 * @param context - 文件处理上下文
 * @returns 分组路由节点，空目录返回 null
 */
function processDirEntry(
  filePath: string,
  fileName: string,
  page: ScanDirConfig,
  parent: ScanNode | undefined,
  context: ProcessorContext
): ScanNode | null {
  const { routePath, options } = parseGroupResult(fileName, filePath, context.config.groupParser)
  // 顶层路由拼接 prefix，嵌套路由不需要
  const pathPrefix = parent ? '' : page.prefix
  const route: ScanNode = {
    isGroup: true,
    parent,
    filePath,
    path: context.applyPathStrategy(pathPrefix + routePath)
  }
  if (options) route.options = options
  route.children = scanPageDir({ ...page, dir: filePath, prefix: '' }, route, context)
  return route.children.size > 0 ? route : null
}

/**
 * 处理文件条目
 *
 * 根据文件类型分发到对应的处理器：
 * - ignore：跳过
 * - config：解析 definePage 宏，合并到父路由选项
 * - layout：注册布局组件到父路由
 * - page：创建或合并路由节点
 *
 * @param filePath - 文件绝对路径
 * @param page - 所属页面目录配置
 * @param pageMapping - 同路径路由映射，用于命名视图合并
 * @param parent - 父路由节点
 * @param context - 文件处理上下文
 * @returns 新创建的路由节点；布局/配置文件返回 null（副作用已执行）
 */
function processFileEntry(
  filePath: string,
  page: ScanDirConfig,
  pageMapping: Map<string, ScanNode>,
  parent: ScanNode | undefined,
  context: ProcessorContext
): ScanNode | null {
  const { fileInfo, fileType } = resolveFile(filePath, page, context.config)
  switch (fileType) {
    case 'ignore':
      return null
    case 'config':
      processConfigFile(filePath, parent, context)
      return null
    case 'layout':
      processLayoutFile(filePath, fileInfo, parent, context)
      return null
    case 'page':
      return processPageFile(
        { filePath, fileInfo, page, pageMapping, parent },
        context
      )
  }
}
