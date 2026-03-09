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
 * 2. 子路由使用相对路径
 * 3. 有 index 子路由时自动添加 redirect
 */
export function buildRouteTree(pages: ParsedPage[]): ParsedPage[] {
  const root: ParsedPage[] = []
  const pathMap = new Map<string, ParsedPage>()
  const layoutFileMap = new Map<string, ParsedPage>()

  // 分离布局文件和普通页面
  for (const page of pages) {
    if (page.isLayoutFile) {
      // 布局文件：key 为目录路径
      const dirPath = page.path
      layoutFileMap.set(dirPath, { ...page, children: [] })
    } else {
      pathMap.set(page.path, { ...page, children: [] })
    }
  }

  // 处理普通页面，建立父子关系
  for (const page of pathMap.values()) {
    const pathParts = page.path.split('/').filter(Boolean)

    // 根路由或一级路由
    if (pathParts.length <= 1) {
      // 检查是否有对应的布局文件
      const layoutFile = layoutFileMap.get(page.path)
      if (layoutFile) {
        // 有布局文件，将当前页面作为子路由
        layoutFile.children.push(page)
        // 如果是 index 页面，添加 redirect
        if (page.isIndex) {
          layoutFile.redirect = `${page.path}/index`
        }
        // 添加到根列表（如果还没有）
        if (!root.find(r => r.path === layoutFile.path)) {
          root.push(layoutFile)
        }
      } else {
        root.push(page)
      }
      continue
    }

    // 查找父路由路径
    const parentPath = '/' + pathParts.slice(0, -1).join('/')

    // 检查父路径是否有布局文件
    const layoutFile = layoutFileMap.get(parentPath)
    if (layoutFile) {
      // 有布局文件，作为其子路由
      layoutFile.children.push(page)
      if (!root.find(r => r.path === layoutFile.path)) {
        root.push(layoutFile)
      }
      continue
    }

    // 检查父路径是否有普通页面
    const parent = pathMap.get(parentPath)
    if (parent) {
      parent.children.push(page)
    } else {
      // 未找到父路由，作为根路由
      root.push(page)
    }
  }

  // 处理没有子路由的布局文件（无效布局）
  for (const layoutFile of layoutFileMap.values()) {
    if (layoutFile.children.length === 0 && !root.find(r => r.path === layoutFile.path)) {
      // 布局文件没有子路由，作为普通路由处理
      root.push(layoutFile)
    }
  }

  // 处理子路由的路径（转换为相对路径）和 redirect
  return processRoutes(root)
}

/**
 * 处理路由：转换子路由路径为相对路径，添加 redirect
 */
function processRoutes(routes: ParsedPage[]): ParsedPage[] {
  return sortRoutes(routes).map(route => {
    const processed: ParsedPage = { ...route, children: [] }

    // 处理子路由
    if (route.children.length > 0) {
      // 转换子路由路径为相对路径
      processed.children = route.children.map(child => {
        const childPathParts = child.path.split('/').filter(Boolean)
        const relativePath = childPathParts[childPathParts.length - 1] || ''

        // index 文件的 path 为 'index'
        const newChild: ParsedPage = {
          ...child,
          path: child.isIndex ? 'index' : relativePath,
          children: []
        }

        // 递归处理嵌套子路由
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
