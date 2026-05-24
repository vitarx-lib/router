/**
 * @fileoverview 路由增量更新器
 *
 * 负责在开发模式下对路由树进行增量操作（添加、移除、更新），
 * 避免每次文件变化都重新扫描整个目录树。
 *
 * 增量更新是 HMR（热模块替换）的基础：
 * 文件监听器检测到变化后调用对应的更新方法，
 * 仅修改受影响的路由节点，保持其余路由不变。
 */
import nodePath from 'node:path'
import { type PageDirConfig } from '../config/index.js'
import { type ProcessorContext, type ScanDirConfig, processConfigFile, processLayoutFile, processPageFile } from './file-processor.js'
import { resolveFile } from './file-classifier.js'
import { isEqualPageOptions, parseDefinePage } from '../macros/index.js'
import { checkDefaultExport, isPageFileInDirs } from '../parser/index.js'
import { parsePageFile } from '../parser/parsePage.js'
import type { ScanNode } from '../types/index.js'

/**
 * 增量更新上下文
 *
 * 在 ProcessorContext 基础上扩展了可变的节点树引用，
 * 使更新器能够直接修改路由树结构。
 */
export interface UpdaterContext extends ProcessorContext {
  /** 顶层路由节点数组（可变引用） */
  nodeTree: ScanNode[]
}

/**
 * 添加页面文件到路由树
 *
 * 根据文件类型直接调用对应处理器，避免重复类型判断和文件解析。
 * 对于页面文件，还会检查是否已存在同路径路由（命名视图合并场景）。
 *
 * @param filePath - 新增文件绝对路径
 * @param context - 增量更新上下文
 * @returns 是否创建了新的路由节点
 */
export function addPage(filePath: string, context: UpdaterContext): boolean {
  const page = isPageFileInDirs(filePath, context.config.pages) as PageDirConfig | false
  if (!page) return false

  const dirPath = nodePath.dirname(filePath)
  const parent = context.fileMap.get(dirPath)
  const prefix = parent ? '' : page.prefix
  const { fileInfo, fileType } = resolveFile(filePath, page, context.config)
  const pageConfig: ScanDirConfig = {
    dir: dirPath,
    include: page.include,
    exclude: page.exclude,
    prefix
  }

  switch (fileType) {
    case 'ignore':
      return false
    case 'config':
      processConfigFile(filePath, parent, context)
      return false
    case 'layout':
      processLayoutFile(filePath, fileInfo, parent, context)
      return false
    case 'page': {
      const parsed = parsePageFile(filePath, context.config.pageParser, fileInfo)
      const pageMapping = new Map<string, ScanNode>()
      // 检查是否已存在同路径路由，以便合并命名视图
      const sameRoute = findSameRoute(parsed.path, prefix, parent, context)
      if (sameRoute) {
        pageMapping.set(parsed.path, sameRoute)
      }
      const route = processPageFile(
        { filePath, fileInfo, page: pageConfig, pageMapping, parent, precomputedParsed: parsed },
        context
      )
      if (route) {
        context.fileMap.set(filePath, route)
        // 将新路由添加到父级的 children 或顶层 nodeTree
        if (parent) {
          parent.children ??= new Set()
          parent.children.add(route)
        } else {
          context.nodeTree.push(route)
        }
        return true
      }
      return false
    }
  }
}

/**
 * 移除辅助文件（布局/配置文件）对路由的贡献
 *
 * 布局和配置文件在 fileMap 中映射到其父路由节点（而非自身），
 * 因此删除时不能移除整个路由，仅需清除该文件对父路由的副作用：
 * - 布局文件：从 components 中移除对应视图组件
 * - 配置文件：清除 dirConfigFile 引用
 *
 * @param filePath - 辅助文件绝对路径
 * @param route - 辅助文件映射到的父路由节点
 * @param fileMap - 文件映射表
 * @returns 是否成功移除
 */
export function removeAuxiliaryFile(
  filePath: string,
  route: ScanNode,
  fileMap: Map<string, ScanNode>
): boolean {
  // 从 components 中移除布局组件
  if (route.components) {
    for (const [viewName, componentPath] of Object.entries(route.components)) {
      if (componentPath === filePath) {
        delete route.components[viewName]
        break
      }
    }
    // components 为空时清理整个字段
    if (Object.keys(route.components).length === 0) {
      delete route.components
    }
  }
  // 从 dirConfigFile 中移除配置文件引用
  if (route.dirConfigFile === filePath) {
    delete route.dirConfigFile
  }
  // 移除辅助文件自身的映射
  fileMap.delete(filePath)
  return true
}

/**
 * 移除指定的文件或目录
 *
 * 从路由树和文件映射表中移除指定路径对应的路由节点。
 * 处理三种场景：
 * 1. 辅助文件（布局/配置）：仅移除其对父路由的贡献
 * 2. 分组目录：递归移除所有子路由
 * 3. 页面文件：移除路由节点及其关联的组件映射
 *
 * @param filePath - 文件/目录绝对路径
 * @param context - 增量更新上下文
 * @returns 存在则移除并返回 true，不存在返回 false
 */
export function removePage(filePath: string, context: UpdaterContext): boolean {
  const route = context.fileMap.get(filePath)
  if (!route) return false

  // 当 filePath 与 route.filePath 不同时，说明该文件是布局/配置文件，
  // 映射到了父路由节点，此时仅移除辅助文件的贡献，不移除整个路由
  if (route.filePath !== filePath) {
    return removeAuxiliaryFile(filePath, route, context.fileMap)
  }

  // 移除组件映射（包含页面文件自身以及命名视图文件）
  if (route.components) {
    Object.values(route.components).forEach(file => {
      context.fileMap.delete(file)
    })
  }
  // 移除配置文件映射
  if (route.dirConfigFile) {
    context.fileMap.delete(route.dirConfigFile)
  }
  // 移除路由自身的映射
  context.fileMap.delete(route.filePath)
  // 递归移除子路由
  if (route.children) {
    route.children.forEach(child => {
      removePage(child.filePath, context)
    })
  }
  // 从父级或顶层 nodeTree 移除
  if (route.parent) {
    route.parent.children?.delete(route)
  } else {
    const index = context.nodeTree.indexOf(route)
    if (index > -1) {
      context.nodeTree.splice(index, 1)
    }
  }
  return true
}

/**
 * 更新文件
 *
 * 当文件内容发生变化时，重新解析并更新路由选项。
 * 处理逻辑：
 * 1. 文件已在路由树中：比较 definePage 选项是否变化
 *    - 失去默认导出且无重定向：移除路由
 *    - 选项变化：更新路由选项
 *    - 选项不变：无操作
 * 2. 文件不在路由树中：自动添加
 *
 * @param filePath - 文件绝对路径
 * @param context - 增量更新上下文
 * @returns 是否更新了路由
 */
export function updatePage(filePath: string, context: UpdaterContext): boolean {
  const route = context.fileMap.get(filePath)
  if (route) {
    const content = context.readFile(filePath)
    const newOptions = parseDefinePage(content, filePath)
    // 不具备默认导出且无重定向的文件应从路由树中移除
    if (!newOptions?.redirect && !checkDefaultExport(content, filePath)) {
      removePage(filePath, context)
      return true
    }
    // 选项未变化，无需更新
    if (isEqualPageOptions(route.options, newOptions)) {
      return false
    }
    // 更新路由选项
    if (newOptions) {
      route.options = newOptions
    } else {
      delete route.options
    }
    return true
  }
  // 文件不在路由树中，尝试添加
  return addPage(filePath, context)
}

/**
 * 在已有路由树中查找同路径路由
 *
 * 用于 addPage 场景：新增文件时需要检查是否已存在同路径的路由节点，
 * 以便将命名视图合并到已有路由而非创建重复路由。
 *
 * @param pathKey - 解析后的路由路径（不含 prefix）
 * @param prefix - 路径前缀
 * @param parent - 父节点，为空时搜索顶层 nodeTree
 * @param context - 增量更新上下文
 * @returns 同路径的路由节点，未找到返回 null
 */
export function findSameRoute(
  pathKey: string,
  prefix: string,
  parent: ScanNode | undefined,
  context: UpdaterContext
): ScanNode | null {
  const newRoutePath = context.applyPathStrategy(prefix + pathKey)
  const pages = parent ? parent.children! : context.nodeTree
  for (const route of pages) {
    if (route.path === newRoutePath) return route
  }
  return null
}
