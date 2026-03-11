/**
 * @fileoverview 页面扫描模块
 *
 * 负责扫描指定目录下的页面文件，并构建路由树结构。
 * 支持同名文件+目录组合（布局路由）、嵌套路由、glob 包含/排除规则。
 */
import micromatch from 'micromatch'
import fs from 'node:fs'
import path from 'node:path'
import { warn } from './logger.js'
import { parsePageFile } from './parsePage.js'
import type { MultiScanOptions, ParsedPage, ScanOptions } from './types.js'

const DEFAULT_INCLUDE = ['**/*']

/**
 * 扫描页面目录
 *
 * 核心流程：
 * 1. 递归扫描目录，收集文件和子目录
 * 2. 检测同名文件+目录组合（布局路由）
 * 3. 解析每个文件为 ParsedPage
 * 4. 聚合命名视图
 */
export function scanPages(options: ScanOptions): ParsedPage[] {
  const { pagesDir, extensions, include = DEFAULT_INCLUDE, exclude } = options

  if (!fs.existsSync(pagesDir)) {
    return []
  }

  const pages: ParsedPage[] = []

  /**
   * 递归扫描目录
   *
   * 核心逻辑：
   * 1. 分离文件和目录
   * 2. 检测同名文件+目录组合（如 admin.tsx + admin/）
   * 3. 解析文件为路由页面
   * 4. 递归处理子目录
   */
  function scanDirectory(dir: string, parentPath: string = ''): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    // 步骤1：分离文件和目录，同时过滤
    const directories: fs.Dirent[] = []
    const files: fs.Dirent[] = []

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const isDir = entry.isDirectory()

      // 应用 include/exclude 过滤规则
      if (!isIncluded(fullPath, pagesDir, include, isDir)) {
        continue
      }

      if (isExcluded(fullPath, pagesDir, exclude, isDir)) {
        continue
      }

      if (isDir) {
        directories.push(entry)
      } else if (entry.isFile()) {
        files.push(entry)
      }
    }

    // 步骤2：检测同名文件+目录组合
    // 例如：admin.tsx + admin/ → admin.tsx 作为布局组件
    const dirNames = new Set(directories.map(d => d.name))
    const fileBaseNames = new Map<string, { entry: fs.Dirent; ext: string }>()

    // 收集文件的基础名（不含扩展名）
    for (const file of files) {
      const ext = path.extname(file.name)
      if (!extensions.includes(ext)) continue

      const baseName = path.basename(file.name, ext)
      const existing = fileBaseNames.get(baseName)

      // 检测同名不同扩展名冲突（如 index.tsx 和 index.jsx）
      if (existing) {
        warn(
          `检测到同名文件冲突: "${baseName}" 存在多个扩展名版本 ` +
            `(${existing.ext} 和 ${ext})，将忽略 "${file.name}"`
        )
        continue
      }

      fileBaseNames.set(baseName, { entry: file, ext })
    }

    // 步骤3：处理文件
    for (const [baseName, { entry }] of fileBaseNames) {
      const filePath = path.join(dir, entry.name)
      const hasSameNameDir = dirNames.has(baseName)

      // 同名文件+目录：标记为布局文件
      if (hasSameNameDir) {
        warn(`检测到同名文件+目录: "${baseName}"，` + `"${entry.name}" 将作为布局组件`)
      }

      const parsed = parsePageFile(filePath, pagesDir, parentPath)
      if (parsed) {
        if (hasSameNameDir) {
          parsed.isLayoutFile = true
        }
        pages.push(parsed)
      }
    }

    // 步骤4：递归处理子目录
    for (const directory of directories) {
      const dirPath = path.join(dir, directory.name)
      const newParentPath = parentPath ? `${parentPath}/${directory.name}` : directory.name
      scanDirectory(dirPath, newParentPath)
    }
  }

  scanDirectory(pagesDir)

  // 聚合命名视图：将同一路径的不同视图文件聚合为一个路由
  return aggregateNamedViews(pages)
}

/**
 * 扫描多个页面目录
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
 * 特殊处理目录匹配：
 * - 以 glob 双星号结尾的模式匹配该目录及其所有子目录
 * - 全局匹配模式可以匹配所有路径
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

  const relativePath = path.relative(pagesDir, filePath)
  const normalizedPath = relativePath.replace(/\\/g, '/')

  // 目录需要特殊处理
  if (isDirectory) {
    for (const pattern of include) {
      // 处理 'xxx/**' 模式：匹配 xxx 目录及其子目录
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3)
        if (normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')) {
          return true
        }
      } else if (pattern === '**' || pattern === '**/*') {
        // 匹配所有
        return true
      } else {
        // 使用 micromatch 进行 glob 匹配
        if (micromatch.isMatch(normalizedPath, pattern, { dot: true })) {
          return true
        }
        // 处理多段模式：如果路径是模式的第一段，也认为匹配
        const patternParts = pattern.split('/')
        if (patternParts.length > 1 && normalizedPath === patternParts[0]) {
          return true
        }
      }
    }
    return false
  }

  return micromatch.isMatch(normalizedPath, include, { dot: true })
}

/**
 * 检查路径是否应该被排除
 *
 * 排除逻辑与包含类似，但语义相反
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

  const relativePath = path.relative(pagesDir, filePath)
  const normalizedPath = relativePath.replace(/\\/g, '/')

  if (isDirectory) {
    for (const pattern of exclude) {
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3)
        if (normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')) {
          return true
        }
      } else if (pattern === '**' || pattern === '**/*') {
        return true
      } else if (pattern.includes('/')) {
        const patternParts = pattern.split('/')
        if (patternParts[0].includes('*') && normalizedPath === patternParts[0]) {
          return true
        }
      } else {
        if (micromatch.isMatch(normalizedPath, pattern, { dot: true })) {
          return true
        }
      }
    }
    return false
  }

  return micromatch.isMatch(normalizedPath, exclude, { dot: true })
}

/**
 * 构建路由树
 *
 * 核心规则：
 * 1. 同名文件+目录组合：文件作为布局组件，目录内文件作为子路由
 *    例如：admin.tsx + admin/ → admin.tsx 是布局，admin/ 内的文件是子路由
 *
 * 2. 目录下的所有文件（包括 index）都作为子路由
 *    例如：users/index.tsx + users/profile.tsx → 都是 /users 的子路由
 *
 * 3. 子路由使用相对路径
 *    例如：users/index.tsx → path: 'index'（相对于父路由 /users）
 *
 * 4. 有 index 子路由时自动添加 redirect
 *    例如：/users 自动重定向到 /users/index
 *
 * 5. 只有 index 文件的目录不创建目录路由
 *    例如：settings/index.tsx → 直接作为 /settings 路由
 */
export function buildRouteTree(pages: ParsedPage[]): ParsedPage[] {
  // 步骤1：分离布局文件和普通页面
  // 布局文件：与目录同名的文件（如 admin.tsx 对应 admin/ 目录）
  const layoutFiles = new Map<string, ParsedPage>()
  const normalPages: ParsedPage[] = []

  for (const page of pages) {
    if (page.isLayoutFile) {
      layoutFiles.set(page.path, { ...page, children: [] })
    } else {
      normalPages.push({ ...page, children: [] })
    }
  }

  // 步骤2：按目录路径分组，确定哪些是目录路由
  // 关键逻辑：index 文件属于它自己路径对应的目录
  // 例如：users/index.tsx 属于 /users 目录
  //       users/profile.tsx 属于 /users 目录（父目录）
  const pagesByDir = new Map<string, ParsedPage[]>()

  for (const page of normalPages) {
    const pathParts = page.path.split('/').filter(Boolean)

    let dirPath: string
    if (page.isIndex) {
      // index 文件属于它自己路径对应的目录
      dirPath = page.path
    } else {
      // 非 index 文件属于父目录
      if (page.parentPath === '' || page.parentPath === '/') {
        dirPath = '/'
      } else if (pathParts.length === 0) {
        dirPath = '/'
      } else if (pathParts.length === 1) {
        dirPath = '/'
      } else {
        dirPath = '/' + pathParts.slice(0, -1).join('/')
      }
    }

    if (!pagesByDir.has(dirPath)) {
      pagesByDir.set(dirPath, [])
    }
    pagesByDir.get(dirPath)!.push(page)
  }

  // 步骤3：确定哪些目录需要创建目录路由
  // 规则：有多个子文件，或有布局文件
  // 注意：只有 index 文件时，直接使用 index 的组件，不创建 children
  const dirRoutesToCreate = new Set<string>()
  for (const [dirPath, dirPages] of pagesByDir) {
    if (dirPath === '/') continue // 根目录不需要创建目录路由
    if (dirPages.length > 1) {
      // 多个文件需要目录路由
      dirRoutesToCreate.add(dirPath)
    } else if (dirPages.length === 1) {
      if (layoutFiles.has(dirPath)) {
        // 有布局文件需要目录路由
        dirRoutesToCreate.add(dirPath)
      }
      // 只有 index 文件时，不创建目录路由，直接使用 index 作为路由
    }
  }

  // 步骤4：收集所有需要创建的目录路由（包括父目录）
  // 确保嵌套目录的层级关系正确
  const allDirPaths = new Set<string>()
  for (const dirPath of dirRoutesToCreate) {
    allDirPaths.add(dirPath)
    // 添加所有父目录路径（如果父目录也是目录路由）
    const pathParts = dirPath.split('/').filter(Boolean)
    for (let i = 1; i < pathParts.length; i++) {
      const parentPath = '/' + pathParts.slice(0, i).join('/')
      if (dirRoutesToCreate.has(parentPath)) {
        allDirPaths.add(parentPath)
      }
    }
  }

  // 步骤5：创建目录路由
  const dirRoutes = new Map<string, ParsedPage>()

  for (const dirPath of allDirPaths) {
    const pathParts = dirPath.split('/').filter(Boolean)
    const dirName = pathParts[pathParts.length - 1] || ''

    // 检查是否有布局文件
    const layoutFile = layoutFiles.get(dirPath)

    // 获取该目录下的直接子页面
    const dirPages = pagesByDir.get(dirPath) || []

    // 创建目录路由
    // 关键：如果没有布局文件，filePath 为空字符串
    // 后续生成代码时会跳过 component 属性
    const dirRoute: ParsedPage = layoutFile
      ? { ...layoutFile, children: [] }
      : {
          path: dirPath,
          name: dirName,
          filePath: '', // 无布局文件时为空
          params: [],
          isIndex: false,
          isDynamic: false,
          children: [],
          parentPath: pathParts.length > 1 ? '/' + pathParts.slice(0, -1).join('/') : ''
        }

    // 添加子路由
    for (const page of dirPages) {
      dirRoute.children.push(createChildRoute(page))
    }

    dirRoutes.set(dirPath, dirRoute)
  }

  // 步骤6：构建路由树层级关系
  const root: ParsedPage[] = []

  // 处理根目录下的文件
  const rootPages = pagesByDir.get('/') || []
  for (const page of rootPages) {
    root.push({ ...page, children: [] })
  }

  // 处理只有 index 文件的目录（直接作为路由，不创建 children）
  for (const [dirPath, dirPages] of pagesByDir) {
    if (dirPath === '/') continue
    if (dirRoutesToCreate.has(dirPath)) continue // 已经在目录路由中处理

    if (dirPages.length === 1 && dirPages[0].isIndex) {
      // 只有 index 文件，直接使用 index 作为路由
      const indexPage = dirPages[0]
      root.push({ ...indexPage, children: [] })
    }
  }

  // 处理目录路由
  for (const [dirPath, dirRoute] of dirRoutes) {
    const pathParts = dirPath.split('/').filter(Boolean)

    if (pathParts.length === 1) {
      // 一级目录路由，直接添加到根
      root.push(dirRoute)
    } else {
      // 多级嵌套，找到父目录
      const parentDirPath = '/' + pathParts.slice(0, -1).join('/')
      const parentRoute = dirRoutes.get(parentDirPath)

      if (parentRoute) {
        // 作为父目录的子路由，使用相对路径
        const relativePath = pathParts[pathParts.length - 1]
        parentRoute.children.push({
          ...dirRoute,
          path: relativePath
        })
      } else {
        // 没有父目录路由，添加到根
        root.push(dirRoute)
      }
    }
  }

  // 处理没有子路由的布局文件
  for (const layoutFile of layoutFiles.values()) {
    if (!dirRoutes.has(layoutFile.path)) {
      root.push(layoutFile)
    }
  }

  // 步骤7：添加 redirect 并排序
  return processRoutes(root)
}

/**
 * 创建子路由（转换路径为相对路径）
 *
 * 核心逻辑：
 * 1. 将绝对路径转换为相对路径
 *    例如：/users/index → 'index'
 *    例如：/users/profile → 'profile'
 *
 * 2. index 子路由的名称添加 '-index' 后缀
 *    例如：users/index.tsx → name: 'users-index'
 *    这样可以避免与父路由名称冲突
 */
function createChildRoute(page: ParsedPage): ParsedPage {
  const pathParts = page.path.split('/').filter(Boolean)
  const relativePath = pathParts[pathParts.length - 1] || ''

  const childRoute: ParsedPage = {
    ...page,
    path: page.isIndex ? 'index' : relativePath,
    children: []
  }

  // index 子路由添加 '-index' 后缀，避免名称冲突
  if (page.isIndex && page.name) {
    childRoute.name = `${page.name}-index`
  }

  return childRoute
}

/**
 * 处理路由：添加 redirect 并排序
 *
 * 核心逻辑：
 * 1. 递归处理子路由
 * 2. 如果有 index 子路由，自动添加 redirect
 *    例如：/users 有 index 子路由 → redirect: '/users/index'
 */
function processRoutes(routes: ParsedPage[]): ParsedPage[] {
  return sortRoutes(routes).map(route => {
    const processed: ParsedPage = { ...route, children: [] }

    // 处理子路由
    if (route.children.length > 0) {
      processed.children = route.children.map(child => {
        const newChild: ParsedPage = {
          ...child,
          children: []
        }
        if (child.children.length > 0) {
          newChild.children = processRoutes(child.children)
        }
        return newChild
      })

      // 检查是否有 index 子路由，自动添加 redirect
      const hasIndexChild = processed.children.some(c => c.path === 'index')
      if (hasIndexChild && !processed.redirect) {
        processed.redirect = `${route.path}/index`
      }
    }

    return processed
  })
}

/**
 * 聚合命名视图
 *
 * 将同一路径的不同命名视图文件聚合为一个路由，生成组件对象。
 *
 * 规则：
 * 1. index.tsx 和 index@default.tsx 都视为默认视图
 * 2. index@aux.tsx 视为 aux 命名视图
 * 3. 每个命名视图组必须有默认视图
 *
 * 示例：
 * - multi-view.tsx → 默认视图
 * - multi-view@sidebar.tsx → sidebar 命名视图
 * 聚合后生成：{ default: lazy(...), sidebar: lazy(...) }
 */
function aggregateNamedViews(pages: ParsedPage[]): ParsedPage[] {
  // 按路由路径分组
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

    // 检查是否有默认视图
    // 命名视图组必须有默认视图
    if (defaultPages.length === 0 && namedViews.length > 0) {
      const namedViewFiles = namedViews.map(p => p.filePath).join(', ')
      // 从第一个命名视图文件中提取基础名称
      const firstNamedView = namedViews[0]
      const baseName =
        firstNamedView.filePath.split('/').pop()?.split('@')[0].split('.')[0] || 'index'
      throw new Error(
        `[vitarx-router] 命名视图错误: 路径 "${path}" 只有命名视图文件 (${namedViewFiles})，` +
          `缺少默认视图文件 (${baseName}.tsx 或 ${baseName}@default.tsx)。\n` +
          `修复方案: 添加 ${baseName}.tsx 或 ${baseName}@default.tsx 文件。`
      )
    }

    // 如果没有命名视图，直接添加所有页面
    if (namedViews.length === 0) {
      aggregatedPages.push(...pathPages)
      continue
    }

    // 有命名视图，聚合处理
    // 使用第一个默认视图作为基础路由，保留原始的children数组
    const basePage = { ...defaultPages[0], children: defaultPages[0].children || [] }

    // 聚合命名视图到 namedViews 字段
    basePage.namedViews = {}
    namedViews.forEach(page => {
      basePage.namedViews![page.viewName!] = page.filePath
    })

    aggregatedPages.push(basePage)
  }

  return aggregatedPages
}

/**
 * 对路由列表进行排序
 *
 * 排序规则：
 * 1. 索引路由优先（index.tsx 排在前面）
 * 2. 静态路由优先于动态路由
 * 3. 按路径字母顺序排序
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
