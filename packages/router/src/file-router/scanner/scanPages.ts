/**
 * @fileoverview 页面扫描模块
 *
 * 负责扫描指定目录下的页面文件，并构建路由树结构。
 * 支持 _layout.jsx 布局文件、嵌套路由、glob 包含/排除规则。
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ResolvedPageConfig } from '../config/index.js'
import { LAYOUT_FILE_PREFIX } from '../constants.js'
import { parsePageFile } from '../parser/index.js'
import type { FileReader, NamingStrategy, ParsedPage } from '../types.js'
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
  /**
   * 路由命名策略
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认）
   * - `lowercase`: 简单转换为小写
   * - `none`: 保持原始命名
   * @default 'kebab'
   */
  namingStrategy: NamingStrategy
  /**
   * 自定义文件读取函数
   */
  fileReader?: FileReader
}

/**
 * 多目录扫描选项
 *
 * 用于扫描多个页面目录，每个目录可以有独立的包含/排除规则。
 */
export interface MultiScanOptions {
  /** 页面目录配置列表 */
  pages: ResolvedPageConfig[]
  /**
   * 路由命名策略
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认）
   * - `lowercase`: 简单转换为小写
   * - `none`: 保持原始命名
   */
  namingStrategy: NamingStrategy
  /**
   * 自定义文件读取函数
   */
  fileReader?: FileReader
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
  const pagesByPath = new Map<string, ParsedPage[]>()

  for (const page of pages) {
    if (!pagesByPath.has(page.path)) {
      pagesByPath.set(page.path, [])
    }
    pagesByPath.get(page.path)!.push(page)
  }

  const aggregatedPages: ParsedPage[] = []

  for (const [path, pathPages] of pagesByPath) {
    const defaultPages = pathPages.filter(p => p.viewName === null || p.viewName === 'default')
    const namedViews = pathPages.filter(p => p.viewName !== null && p.viewName !== 'default')

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

    if (namedViews.length === 0) {
      aggregatedPages.push(...pathPages)
      continue
    }

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
 * 目录项信息
 */
interface DirEntry {
  name: string
  isDir: boolean
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
 * @param fileReader - 自定义文件读取函数
 * @param pages - 页面收集器
 */
async function scanDirectory(
  dir: string,
  pageDir: string,
  parentPath: string,
  extensions: string[],
  include: string[],
  exclude: string[],
  namingStrategy: NamingStrategy,
  pathPrefix: string,
  fileReader: FileReader | undefined,
  pages: ParsedPage[]
): Promise<void> {
  let entries: DirEntry[]

  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true })
    entries = dirents.map(entry => ({
      name: entry.name,
      isDir: entry.isDirectory()
    }))
  } catch {
    return
  }

  const directories: DirEntry[] = []
  const files: DirEntry[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (!shouldProcessFile(fullPath, pageDir, include, exclude, entry.isDir)) {
      continue
    }

    if (entry.isDir) {
      directories.push(entry)
    } else {
      files.push(entry)
    }
  }

  const dirNames = new Set(directories.map(d => d.name))
  const fileBaseNames = new Map<string, { entry: DirEntry; ext: string }>()

  for (const file of files) {
    const ext = path.extname(file.name)
    if (!extensions.includes(ext)) continue

    const baseName = path.basename(file.name, ext)
    const existing = fileBaseNames.get(baseName)

    if (existing) {
      warn(
        `同名文件冲突: "${baseName}"`,
        `存在多个扩展名版本 (${existing.ext} 和 ${ext})，将忽略 "${file.name}"`
      )
      continue
    }

    fileBaseNames.set(baseName, { entry: file, ext })
  }

  for (const [baseName] of fileBaseNames) {
    if (isLayoutFile(baseName)) continue

    if (dirNames.has(baseName)) {
      const filePath = path.join(dir, baseName)
      throw new Error(
        `[file-router] 不允许同名文件和目录同时存在: "${filePath}" 和 "${filePath}/" 目录。\n` +
          `如需定义布局路由，请在 "${filePath}/" 目录下创建 "_layout.jsx" 文件。`
      )
    }
  }

  for (const [baseName, { entry }] of fileBaseNames) {
    const filePath = path.join(dir, entry.name)

    if (isLayoutFile(baseName)) {
      const parsed = await parsePageFile(
        filePath,
        pageDir,
        parentPath,
        namingStrategy,
        pathPrefix,
        true,
        fileReader
      )
      if (parsed) {
        parsed.isLayoutFile = true
        parsed.path = parentPath ? `/${parentPath}` : '/'
        pages.push(parsed)
      }
      continue
    }

    const parsed = await parsePageFile(
      filePath,
      pageDir,
      parentPath,
      namingStrategy,
      pathPrefix,
      false,
      fileReader
    )
    if (parsed) {
      pages.push(parsed)
    }
  }

  for (const directory of directories) {
    const dirPath = path.join(dir, directory.name)
    const newParentPath = parentPath ? `${parentPath}/${directory.name}` : directory.name
    await scanDirectory(
      dirPath,
      pageDir,
      newParentPath,
      extensions,
      include,
      exclude,
      namingStrategy,
      pathPrefix,
      fileReader,
      pages
    )
  }
}

/**
 * 检查目录是否存在
 *
 * @param dir - 目录路径
 * @returns 是否存在
 */
async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir)
    return stat.isDirectory()
  } catch {
    return false
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
async function scanPages(options: ScanOptions): Promise<ParsedPage[]> {
  if (!(await directoryExists(options.page.dir))) return []
  const { namingStrategy, page, fileReader } = options
  const { include, exclude, prefix, dir, extensions } = page

  const pages: ParsedPage[] = []

  await scanDirectory(
    dir,
    dir,
    '',
    extensions,
    include,
    exclude || [],
    namingStrategy,
    prefix,
    fileReader,
    pages
  )

  return aggregateNamedViews(pages)
}

/**
 * 扫描多个页面目录
 *
 * @param options - 多目录扫描选项
 * @returns 合并后的页面列表
 */
export async function scanMultiplePages(options: MultiScanOptions): Promise<ParsedPage[]> {
  const { pages, namingStrategy, fileReader } = options
  const allPages: ParsedPage[] = []

  for (const dirConfig of pages) {
    const pages = await scanPages({
      page: dirConfig,
      namingStrategy,
      fileReader
    })

    allPages.push(...pages)
  }

  return allPages
}
