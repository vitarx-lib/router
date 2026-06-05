/**
 * @fileoverview 文件处理器
 *
 * 负责处理不同类型的路由文件（配置文件、布局文件、页面文件），
 * 以及解析分组目录的自定义路径和选项。
 *
 * 每个处理器专注于单一文件类型的处理逻辑，
 * 被扫描器和增量更新器共同调用。
 */
import { type PageDirConfig, type ResolvedConfig } from '../config/index.js'
import { mergePageOptions, parseDefinePage } from '../macros/index.js'
import { checkDefaultExport } from '../parser/index.js'
import { type FileInfo, parsePageFile } from '../parser/parsePage.js'
import type { PageParseResult, ScanNode } from '../types/index.js'

/**
 * 扫描阶段的目录配置
 *
 * 从 PageDirConfig 中移除 group 字段，因为分组信息在扫描入口处已处理，
 * 递归扫描子目录时不再需要。
 */
export type ScanDirConfig = Omit<PageDirConfig, 'group'>

/**
 * 文件处理上下文
 *
 * 封装文件处理所需的共享状态和操作，
 * 避免在每个处理函数中重复传递 config、fileMap 等参数。
 */
export interface ProcessorContext {
  /** 已解析的文件路由配置 */
  readonly config: ResolvedConfig
  /** 文件路径到路由节点的映射表 */
  readonly fileMap: Map<string, ScanNode>
  /** 读取文件内容（支持 transform 钩子） */
  readFile: (file: string) => string
  /** 应用路径策略（命名转换 + 动态参数转换） */
  applyPathStrategy: (path: string) => string
}

/**
 * 处理分组配置文件
 *
 * 解析 definePage 宏并合并到父路由选项中。
 * 配置文件（如 _config.ts）不生成独立路由节点，
 * 而是将选项注入到所属目录对应的父路由节点。
 *
 * @param filePath - 配置文件绝对路径
 * @param parent - 父路由节点，配置选项将合并到此节点
 * @param context - 文件处理上下文
 */
export function processConfigFile(
  filePath: string,
  parent: ScanNode | undefined,
  context: ProcessorContext
): void {
  if (!parent) return
  const content = context.readFile(filePath)
  const pageOptions = parseDefinePage(content, filePath)
  if (pageOptions) {
    parent.options = mergePageOptions(parent.options, pageOptions)
    parent.dirConfigFile = filePath
    context.fileMap.set(filePath, parent)
  }
}

/**
 * 处理分组布局文件
 *
 * 将布局组件注册到父路由的 components 中。
 * 布局文件（如 _layout.tsx）必须包含默认导出才会被注册，
 * 同时在 fileMap 中建立布局文件到父路由的映射。
 *
 * @param filePath - 布局文件绝对路径
 * @param fileInfo - 文件结构化信息
 * @param parent - 父路由节点，布局组件将注册到此节点
 * @param context - 文件处理上下文
 */
export function processLayoutFile(
  filePath: string,
  fileInfo: FileInfo,
  parent: ScanNode | undefined,
  context: ProcessorContext
): void {
  if (!parent) return
  const content = context.readFile(filePath)
  // 布局文件必须包含默认导出才有效
  if (checkDefaultExport(content, filePath)) {
    parent.components ??= {}
    parent.components[fileInfo.viewName ?? 'default'] = filePath
  }
  // 无论是否有默认导出，都在 fileMap 中建立映射，
  // 以便增量更新时能通过文件路径找到父路由
  context.fileMap.set(filePath, parent)
}

/**
 * 处理页面文件的参数
 *
 * 将 processPageFile 的多个参数封装为对象，
 * 避免参数过多导致调用困难。
 */
export interface ProcessPageFileParams {
  /** 页面文件绝对路径 */
  filePath: string
  /** 文件结构化信息 */
  fileInfo: FileInfo
  /** 文件所属的页面目录配置 */
  page: ScanDirConfig
  /** 同路径路由映射，用于合并命名视图到同一路由节点 */
  pageMapping: Map<string, ScanNode>
  /** 父路由节点 */
  parent?: ScanNode
  /** 预计算的解析结果，避免重复调用 parsePageFile */
  precomputedParsed?: PageParseResult
}

/**
 * 处理页面文件
 *
 * 解析路由路径、视图命名和页面选项，创建或合并路由节点。
 *
 * 合并逻辑：当同一路径下存在多个视图文件（如 index.tsx 和 index@sidebar.tsx）时，
 * 通过 pageMapping 将它们合并到同一个路由节点的 components 中，
 * 而非创建多个路由节点。
 *
 * 过滤逻辑：页面文件必须满足以下条件之一才会生成路由：
 * 1. 包含默认导出（作为渲染组件）
 * 2. 配置了重定向（redirect）
 * 两者都不满足的文件将被忽略。
 *
 * @param params - 处理参数
 * @param context - 文件处理上下文
 * @returns 新创建的路由节点；合并到已有路由时返回 null
 */
export function processPageFile(
  params: ProcessPageFileParams,
  context: ProcessorContext
): ScanNode | null {
  const { filePath, fileInfo, page, pageMapping, parent, precomputedParsed } = params
  const parsed = precomputedParsed ?? parsePageFile(filePath, context.config.pageParser, fileInfo)
  const viewName = parsed.viewName ?? 'default'
  const content = context.readFile(filePath)

  // 尝试合并到同路径的已有路由节点（命名视图场景）
  const sameRoute = pageMapping.get(parsed.path)
  if (sameRoute) {
    // 命名视图文件也需要默认导出
    if (!checkDefaultExport(content, filePath)) return null
    sameRoute.components![viewName] = filePath
    context.fileMap.set(filePath, sameRoute)
    return null
  }

  // 解析 definePage 宏选项并与文件名解析选项合并
  const definePageOptions = parseDefinePage(content, filePath)
  const pageOptions = mergePageOptions(parsed.options, definePageOptions)

  // 无默认导出且无重定向的文件不生成路由
  if (!pageOptions.redirect && !checkDefaultExport(content, filePath)) return null

  // 计算最终路由路径：顶层路由拼接 prefix，index 文件不生成路径段
  const finalPath = context.applyPathStrategy(
    (parent ? '' : page.prefix) + (parsed.path === 'index' ? '' : parsed.path)
  )

  const route: ScanNode = {
    isGroup: false,
    parent,
    filePath,
    path: finalPath,
    components: {
      [viewName]: filePath
    }
  }
  if (Object.keys(pageOptions).length) route.options = pageOptions

  // 注册到 pageMapping 以便后续同名文件合并
  pageMapping.set(parsed.path, route)
  return route
}

// parseGroupResult 已移至 utils/groupParser.ts，此处重新导出以保持向后兼容
export { parseGroupResult } from '../utils/groupParser.js'
