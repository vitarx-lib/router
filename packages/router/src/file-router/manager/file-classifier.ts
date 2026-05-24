/**
 * @fileoverview 文件分类器
 *
 * 负责判断文件在路由系统中的角色：页面、布局、配置或忽略。
 * 作为文件处理流程的前置步骤，为后续的扫描和增量更新提供统一的分类入口。
 */
import { type PageDirConfig, type ResolvedConfig } from '../config/index.js'
import { type FilterOptions, isPageFile, isPageFileInDirs } from '../parser/index.js'
import { type FileInfo, extractFileInfo } from '../parser/parsePage.js'

/**
 * 文件在路由系统中的角色类型
 *
 * - page: 页面文件，生成路由节点
 * - layout: 布局文件（如 _layout.tsx），注册到父路由的 components
 * - config: 配置文件（如 _config.ts），解析 definePage 宏合并到父路由选项
 * - ignore: 不参与路由的文件，跳过处理
 */
export type FileType = 'layout' | 'config' | 'page' | 'ignore'

/**
 * 文件解析结果
 *
 * 将文件信息提取与类型判定合并为一次操作的结果，
 * 避免调用方分别调用 extractFileInfo 和 getPageType。
 */
export interface ResolvedFile {
  /** 文件结构化信息（文件名、路由名、视图名） */
  fileInfo: FileInfo
  /** 文件在路由系统中的角色 */
  fileType: FileType
}

/**
 * 解析文件信息与类型
 *
 * 统一入口，将文件信息提取与类型判定合并执行，
 * 避免多处重复调用 extractFileInfo + getPageType。
 *
 * @param filePath - 文件绝对路径
 * @param page - 文件所属的页面目录配置
 * @param config - 已解析的文件路由配置
 * @returns 文件信息与类型
 */
export function resolveFile(
  filePath: string,
  page: Omit<PageDirConfig, 'group'>,
  config: ResolvedConfig
): ResolvedFile {
  const fileInfo = extractFileInfo(filePath)
  const fileType = getPageType(filePath, fileInfo.rawName, config, page)
  return { fileInfo, fileType }
}

/**
 * 判定文件在路由系统中的角色
 *
 * 判定优先级：布局文件 > 配置文件 > 页面文件 > 忽略。
 * 布局和配置文件通过文件名匹配，页面文件通过 glob 规则匹配。
 *
 * @param file - 文件绝对路径
 * @param rawName - 文件名（不含扩展名和 @视图命名）
 * @param config - 已解析的文件路由配置
 * @param pages - 可选的过滤配置，覆盖 config.pages
 * @returns 文件类型
 */
export function getPageType(
  file: string,
  rawName: string,
  config: ResolvedConfig,
  pages?: FilterOptions | readonly FilterOptions[]
): FileType {
  if (rawName === config.layoutFileName) {
    return 'layout'
  }
  if (rawName === config.configFileName && (file.endsWith('.ts') || file.endsWith('.js'))) {
    return 'config'
  }
  if (checkIsPageFile(file, config, pages)) {
    return 'page'
  }
  return 'ignore'
}

/**
 * 检查文件是否为页面文件
 *
 * 支持两种过滤模式：
 * 1. 提供自定义 filter 时，按 filter 规则匹配
 * 2. 未提供 filter 时，使用 config.pages 中的目录配置匹配
 *
 * @param file - 文件绝对路径
 * @param config - 已解析的文件路由配置
 * @param filter - 可选的过滤配置，覆盖 config.pages
 * @returns 是否为页面文件
 */
export function checkIsPageFile(
  file: string,
  config: ResolvedConfig,
  filter?: FilterOptions | readonly FilterOptions[]
): boolean {
  if (filter) {
    if (Array.isArray(filter)) {
      return !!isPageFileInDirs(file, filter)
    }
    return isPageFile(file, filter as FilterOptions)
  }
  return !!isPageFileInDirs(file, config.pages)
}
