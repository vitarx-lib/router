/**
 * @fileoverview 页面扫描模块
 *
 * 负责扫描指定目录下的页面文件，并构建路由树结构。
 * 支持同名文件+目录组合（布局路由）、嵌套路由、glob 包含/排除规则。
 */
import micromatch from 'micromatch'
import fs from 'node:fs'
import path from 'node:path'
import { parsePageFile } from './parsePage.js'
import type { MultiScanOptions, ParsedPage, ScanOptions } from './types.js'

const DEFAULT_INCLUDE = ['**/*']

/**
 * 扫描页面目录
 */
export function scanPages(options: ScanOptions): ParsedPage[] {
  const { pagesDir, extensions, include = DEFAULT_INCLUDE, exclude } = options

  if (!fs.existsSync(pagesDir)) {
    return []
  }

  const pages: ParsedPage[] = []

  function scanDirectory(dir: string, parentPath: string = ''): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    const directories: fs.Dirent[] = []
    const files: fs.Dirent[] = []

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const isDir = entry.isDirectory()

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

    // 检测同名文件+目录组合
    const dirNames = new Set(directories.map(d => d.name))
    const fileBaseNames = new Map<string, { entry: fs.Dirent; ext: string }>()

    // 收集文件的基础名（不含扩展名）
    for (const file of files) {
      const ext = path.extname(file.name)
      if (!extensions.includes(ext)) continue

      const baseName = path.basename(file.name, ext)
      const existing = fileBaseNames.get(baseName)

      // 检测同名不同扩展名冲突
      if (existing) {
        console.warn(
          `[vitarx-router] 检测到同名文件冲突: "${baseName}" 存在多个扩展名版本 ` +
            `(${existing.ext} 和 ${ext})，将忽略 "${file.name}"`
        )
        continue
      }

      fileBaseNames.set(baseName, { entry: file, ext })
    }

    // 处理文件
    for (const [baseName, { entry }] of fileBaseNames) {
      const filePath = path.join(dir, entry.name)
      const hasSameNameDir = dirNames.has(baseName)

      // 同名文件+目录：标记为布局文件
      if (hasSameNameDir) {
        console.warn(
          `[vitarx-router] 检测到同名文件+目录: "${baseName}"，` + `"${entry.name}" 将作为布局组件`
        )
      }

      const parsed = parsePageFile(filePath, pagesDir, parentPath)
      if (parsed) {
        if (hasSameNameDir) {
          parsed.isLayoutFile = true
        }
        pages.push(parsed)
      }
    }

    // 递归处理子目录
    for (const directory of directories) {
      const dirPath = path.join(dir, directory.name)
      const newParentPath = parentPath ? `${parentPath}/${directory.name}` : directory.name
      scanDirectory(dirPath, newParentPath)
    }
  }

  scanDirectory(pagesDir)
  return pages
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

  if (isDirectory) {
    for (const pattern of include) {
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3)
        if (normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')) {
          return true
        }
      } else if (pattern === '**' || pattern === '**/*') {
        return true
      } else {
        if (micromatch.isMatch(normalizedPath, pattern, { dot: true })) {
          return true
        }
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
 * 根据规则构建路由树结构：
 * 1. 同名文件+目录组合：文件作为布局组件，目录内文件作为子路由
 * 2. 目录下的所有文件（包括 index）都作为子路由
 * 3. 子路由使用相对路径
 * 4. 有 index 子路由时自动添加 redirect
 */
export function buildRouteTree(pages: ParsedPage[]): ParsedPage[] {
  // 分离布局文件和普通页面
  const layoutFiles = new Map<string, ParsedPage>()
  const normalPages: ParsedPage[] = []

  for (const page of pages) {
    if (page.isLayoutFile) {
      layoutFiles.set(page.path, { ...page, children: [] })
    } else {
      normalPages.push({ ...page, children: [] })
    }
  }

  // 按目录路径分组，确定哪些是目录路由
  const pagesByDir = new Map<string, ParsedPage[]>()

  for (const page of normalPages) {
    const pathParts = page.path.split('/').filter(Boolean)

    let dirPath: string
    if (page.isIndex) {
      // index 文件属于它自己路径对应的目录
      dirPath = page.path
    } else {
      // 非 index 文件属于父目录
      // 如果 parentPath 为空，说明在根目录
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

  // 确定哪些目录需要创建目录路由
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

  // 收集所有需要创建的目录路由（包括父目录）
  const allDirPaths = new Set<string>()
  for (const dirPath of dirRoutesToCreate) {
    allDirPaths.add(dirPath)
    // 添加所有父目录路径
    const pathParts = dirPath.split('/').filter(Boolean)
    for (let i = 1; i < pathParts.length; i++) {
      const parentPath = '/' + pathParts.slice(0, i).join('/')
      if (dirRoutesToCreate.has(parentPath)) {
        allDirPaths.add(parentPath)
      }
    }
  }

  // 创建目录路由
  const dirRoutes = new Map<string, ParsedPage>()

  for (const dirPath of allDirPaths) {
    const pathParts = dirPath.split('/').filter(Boolean)
    const dirName = pathParts[pathParts.length - 1] || ''

    // 检查是否有布局文件
    const layoutFile = layoutFiles.get(dirPath)

    // 获取该目录下的直接子页面
    const dirPages = pagesByDir.get(dirPath) || []

    // 创建目录路由
    const dirRoute: ParsedPage = layoutFile
      ? { ...layoutFile, children: [] }
      : {
          path: dirPath,
          name: dirName,
          filePath: '',
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

  // 构建路由树层级关系
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
      // 一级目录路由
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

  // 添加 redirect 并排序
  return processRoutes(root)
}

/**
 * 创建子路由（转换路径为相对路径）
 */
function createChildRoute(page: ParsedPage): ParsedPage {
  const pathParts = page.path.split('/').filter(Boolean)
  const relativePath = pathParts[pathParts.length - 1] || ''

  return {
    ...page,
    path: page.isIndex ? 'index' : relativePath,
    children: []
  }
}

/**
 * 处理路由：添加 redirect 并排序
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
 * 对路由列表进行排序
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
