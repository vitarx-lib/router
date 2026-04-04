/**
 * @fileoverview 页面扫描模块
 *
 * 负责扫描指定目录下的页面文件，并构建路由树结构。
 * 支持 _layout.jsx 布局文件、嵌套路由、glob 包含/排除规则。
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */
import fs from 'node:fs'
import path from 'node:path'
import type { ResolvedPageConfig } from '../config/index.js'
import { LAYOUT_FILE_PREFIX } from '../constants.js'
import { parsePageFile } from '../parser/index.js'
import type { NamingStrategy, ParsedPage } from '../types.js'
import { warn } from '../utils/logger.js'
import { shouldProcessFile } from './filterUtils.js'

/**
 * 页面扫描选项
 *
 * 配置 scanPages 函数的扫描行为。
 */
export interface ScanOptions {
  /**
   * 页面配置
   */
  page: ResolvedPageConfig
  /** 要处理的文件扩展名列表 */
  extensions: string[]
  /**
   * 路由命名策略
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认）
   * - `lowercase`: 简单转换为小写
   * - `none`: 保持原始命名
   * @default 'kebab'
   */
  namingStrategy: NamingStrategy
}

/**
 * 多目录扫描选项
 *
 * 用于扫描多个页面目录，每个目录可以有独立的包含/排除规则。
 */
export interface MultiScanOptions {
  /** 页面目录配置列表 */
  pages: ResolvedPageConfig[]
  /** 要处理的文件扩展名列表 */
  extensions: string[]
  /**
   * 路由命名策略
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认）
   * - `lowercase`: 简单转换为小写
   * - `none`: 保持原始命名
   */
  namingStrategy: NamingStrategy
}

/**
 * 聚合命名视图
 *
 * 将同一路径下的命名视图文件合并到主页面配置中。
 *
 * @param pages - 页面列表
 * @returns 聚合后的页面列表
 */
function aggregateNamedViews(pages: ParsedPage[]): ParsedPage[] {
  // 按路径分组页面
  const pagesByPath = new Map<string, ParsedPage[]>()

  for (const page of pages) {
    if (!pagesByPath.has(page.path)) {
      pagesByPath.set(page.path, [])
    }
    pagesByPath.get(page.path)!.push(page)
  }

  const aggregatedPages: ParsedPage[] = []

  for (const [path, pathPages] of pagesByPath) {
    // 分离默认视图和命名视图
    const defaultPages = pathPages.filter(p => p.viewName === null || p.viewName === 'default')
    const namedViews = pathPages.filter(p => p.viewName !== null && p.viewName !== 'default')

    // 检查是否只有命名视图而没有默认视图
    if (defaultPages.length === 0 && namedViews.length > 0) {
      const namedViewFiles = namedViews.map(p => p.filePath).join(', ')
      const firstNamedView = namedViews[0]
      const baseName =
        firstNamedView.filePath.split('/').pop()?.split('@')[0].split('.')[0] || 'index'
      throw new Error(
        `[file-router] 命名视图错误: 路径 "${path}" 只有命名视图文件 (${namedViewFiles})，` +
          `缺少默认视图文件 (${baseName}.tsx 或 ${baseName}@default.tsx)。\n` +
          `修复方案: 添加 ${baseName}.tsx 或 ${baseName}@default.tsx 文件。`
      )
    }

    // 如果没有命名视图，直接添加所有页面
    if (namedViews.length === 0) {
      aggregatedPages.push(...pathPages)
      continue
    }

    // 以第一个默认视图为基础，添加命名视图
    const basePage = { ...defaultPages[0], children: defaultPages[0].children || [] }

    basePage.namedViews = {}
    namedViews.forEach(page => {
      basePage.namedViews![page.viewName!] = page.filePath
    })

    aggregatedPages.push(basePage)
  }

  return aggregatedPages
}

/**
 * 解析布局文件名
 *
 * 支持两种格式：
 * - `_layout.jsx` - 默认布局
 * - `_layout.name.jsx` - 命名布局
 *
 * @param baseName - 文件名
 * @returns 布局名称，null 表示不是布局文件
 */
function isLayoutFile(baseName: string): boolean {
  if (baseName === LAYOUT_FILE_PREFIX) return true
  return baseName.startsWith(LAYOUT_FILE_PREFIX + '.')
}

/**
 * 扫描单个目录
 *
 * @param dir - 目录路径
 * @param pageDir - 页面根目录
 * @param parentPath - 父级路径
 * @param extensions - 文件扩展名
 * @param include - 包含模式
 * @param exclude - 排除模式
 * @param namingStrategy - 命名策略
 * @param pathPrefix - 路径前缀
 * @param pages - 页面收集器
 */
function scanDirectory(
  dir: string,
  pageDir: string,
  parentPath: string,
  extensions: string[],
  include: string[],
  exclude: string[],
  namingStrategy: NamingStrategy,
  pathPrefix: string,
  pages: ParsedPage[]
): void {
  // 读取目录内容
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  const directories: fs.Dirent[] = []
  const files: fs.Dirent[] = []

  // 分类目录和文件
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const isDir = entry.isDirectory()

    // 检查是否应该处理该文件/目录
    if (!shouldProcessFile(fullPath, pageDir, include, exclude, isDir)) {
      continue
    }

    if (isDir) {
      directories.push(entry)
    } else if (entry.isFile()) {
      files.push(entry)
    }
  }

  // 收集目录名和文件名（用于检测同名冲突）
  const dirNames = new Set(directories.map(d => d.name))
  const fileBaseNames = new Map<string, { entry: fs.Dirent; ext: string }>()

  // 处理文件，检查扩展名和同名冲突
  for (const file of files) {
    const ext = path.extname(file.name)
    if (!extensions.includes(ext)) continue

    const baseName = path.basename(file.name, ext)
    const existing = fileBaseNames.get(baseName)

    // 处理同名文件冲突（不同扩展名）
    if (existing) {
      warn(
        `同名文件冲突: "${baseName}"`,
        `存在多个扩展名版本 (${existing.ext} 和 ${ext})，将忽略 "${file.name}"`
      )
      continue
    }

    fileBaseNames.set(baseName, { entry: file, ext })
  }

  // 检查同名文件+目录冲突
  for (const [baseName] of fileBaseNames) {
    // 跳过布局文件
    if (baseName.startsWith(LAYOUT_FILE_PREFIX)) continue

    if (dirNames.has(baseName)) {
      const filePath = path.join(dir, baseName)
      throw new Error(
        `[file-router] 不允许同名文件和目录同时存在: "${filePath}" 和 "${filePath}/" 目录。\n` +
          `如需定义布局路由，请在 "${filePath}/" 目录下创建 "_layout.jsx" 文件。`
      )
    }
  }

  // 解析文件并处理布局文件
  for (const [baseName, { entry }] of fileBaseNames) {
    const filePath = path.join(dir, entry.name)

    // 检查是否为布局文件
    if (isLayoutFile(baseName)) {
      // 布局文件：路径为当前目录路径
      const parsed = parsePageFile(filePath, pageDir, parentPath, namingStrategy, pathPrefix, true)
      if (parsed) {
        parsed.isLayoutFile = true
        parsed.path = parentPath ? `/${parentPath}` : '/'
        pages.push(parsed)
      }
      continue
    }

    // 解析普通页面文件
    const parsed = parsePageFile(filePath, pageDir, parentPath, namingStrategy, pathPrefix)
    if (parsed) {
      pages.push(parsed)
    }
  }

  // 递归扫描子目录
  for (const directory of directories) {
    const dirPath = path.join(dir, directory.name)
    const newParentPath = parentPath ? `${parentPath}/${directory.name}` : directory.name
    scanDirectory(
      dirPath,
      pageDir,
      newParentPath,
      extensions,
      include,
      exclude,
      namingStrategy,
      pathPrefix,
      pages
    )
  }
}

/**
 * 扫描页面目录
 *
 * 核心流程：
 * 1. 递归扫描目录，收集文件和子目录
 * 2. 检测同名文件+目录组合（布局路由）
 * 3. 解析每个文件为 ParsedPage
 * 4. 聚合命名视图
 *
 * @param options - 扫描选项
 * @returns - 解析后的页面列表
 */
function scanPages(options: ScanOptions): ParsedPage[] {
  // 检查目录是否存在
  if (!fs.existsSync(options.page.dir)) return []
  const { extensions, namingStrategy, page } = options
  const { include, exclude, prefix, dir } = page

  const pages: ParsedPage[] = []

  // 扫描目录并收集页面
  scanDirectory(dir, dir, '', extensions, include, exclude || [], namingStrategy, prefix, pages)

  // 聚合命名视图
  return aggregateNamedViews(pages)
}

/**
 * 扫描多个页面目录
 *
 * @param options - 多目录扫描选项
 * @returns 合并后的页面列表
 */
export function scanMultiplePages(options: MultiScanOptions): ParsedPage[] {
  const { pages, extensions, namingStrategy = 'kebab' } = options
  const allPages: ParsedPage[] = []

  // 扫描每个页面目录
  for (const dirConfig of pages) {
    const pages = scanPages({
      page: dirConfig,
      extensions,
      namingStrategy
    })

    allPages.push(...pages)
  }

  return allPages
}
