/**
 * @fileoverview 路由树构建模块
 *
 * 负责将扫描后的页面列表构建成层级路由树结构。
 * 支持布局路由、嵌套路由、命名视图等特性。
 */
import type { ParsedPage } from '../types.js'

/**
 * 分组页面数据
 */
interface GroupedPages {
  /** 布局文件映射（路径 -> 页面） */
  layoutFiles: Map<string, ParsedPage>
  /** 普通页面列表 */
  normalPages: ParsedPage[]
}

/**
 * 按目录分组的页面数据
 */
interface PagesByDirectory {
  /** 目录路径 -> 页面列表 */
  map: Map<string, ParsedPage[]>
  /** 需要创建的目录路由路径集合 */
  routesToCreate: Set<string>
}

/**
 * 分组布局文件和普通页面
 *
 * @param pages - 页面列表
 * @returns 分组结果
 */
function groupPagesByType(pages: ParsedPage[]): GroupedPages {
  const layoutFiles = new Map<string, ParsedPage>()
  const normalPages: ParsedPage[] = []

  for (const page of pages) {
    if (page.isLayoutFile) {
      layoutFiles.set(page.path, { ...page, children: [] })
    } else {
      normalPages.push({ ...page, children: [] })
    }
  }

  return { layoutFiles, normalPages }
}

/**
 * 按目录分组页面
 *
 * @param normalPages - 普通页面列表
 * @param layoutFiles - 布局文件映射
 * @returns 按目录分组的结果
 */
function groupPagesByDirectory(
  normalPages: ParsedPage[],
  layoutFiles: Map<string, ParsedPage>
): PagesByDirectory {
  const pagesByDir = new Map<string, ParsedPage[]>()

  for (const page of normalPages) {
    const dirPath = determineDirectoryPath(page)
    if (!pagesByDir.has(dirPath)) {
      pagesByDir.set(dirPath, [])
    }
    pagesByDir.get(dirPath)!.push(page)
  }

  const routesToCreate = determineDirectoryRoutes(pagesByDir, layoutFiles)

  return { map: pagesByDir, routesToCreate }
}

/**
 * 确定页面所属的目录路径
 *
 * @param page - 页面信息
 * @returns 目录路径
 */
function determineDirectoryPath(page: ParsedPage): string {
  const pathParts = page.path.split('/').filter(Boolean)

  if (page.isIndex) {
    return page.path
  }

  if (page.parentPath === '' || page.parentPath === '/') {
    return '/'
  }

  if (pathParts.length <= 1) {
    return '/'
  }

  return '/' + pathParts.slice(0, -1).join('/')
}

/**
 * 确定需要创建的目录路由
 *
 * @param pagesByDir - 按目录分组的页面
 * @param layoutFiles - 布局文件映射
 * @returns 需要创建的目录路由路径集合
 */
function determineDirectoryRoutes(
  pagesByDir: Map<string, ParsedPage[]>,
  layoutFiles: Map<string, ParsedPage>
): Set<string> {
  const routesToCreate = new Set<string>()

  for (const [dirPath, dirPages] of pagesByDir) {
    if (dirPath === '/') continue

    if (dirPages.length > 1) {
      routesToCreate.add(dirPath)
    } else if (dirPages.length === 1 && layoutFiles.has(dirPath)) {
      routesToCreate.add(dirPath)
    }
  }

  return routesToCreate
}

/**
 * 收集所有需要处理的目录路径
 *
 * @param routesToCreate - 需要创建的目录路由
 * @returns 所有目录路径集合
 */
function collectAllDirectoryPaths(routesToCreate: Set<string>): Set<string> {
  const allDirPaths = new Set<string>()

  for (const dirPath of routesToCreate) {
    allDirPaths.add(dirPath)
    const pathParts = dirPath.split('/').filter(Boolean)

    for (let i = 1; i < pathParts.length; i++) {
      const parentPath = '/' + pathParts.slice(0, i).join('/')
      if (routesToCreate.has(parentPath)) {
        allDirPaths.add(parentPath)
      }
    }
  }

  return allDirPaths
}

/**
 * 构建目录路由
 *
 * @param allDirPaths - 所有目录路径
 * @param pagesByDir - 按目录分组的页面
 * @param layoutFiles - 布局文件映射
 * @returns 目录路由映射
 */
function buildDirectoryRoutes(
  allDirPaths: Set<string>,
  pagesByDir: Map<string, ParsedPage[]>,
  layoutFiles: Map<string, ParsedPage>
): Map<string, ParsedPage> {
  const dirRoutes = new Map<string, ParsedPage>()

  for (const dirPath of allDirPaths) {
    const pathParts = dirPath.split('/').filter(Boolean)
    const dirName = pathParts[pathParts.length - 1] || ''

    const layoutFile = layoutFiles.get(dirPath)
    const dirPages = pagesByDir.get(dirPath) || []

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

    for (const page of dirPages) {
      dirRoute.children.push(createChildRoute(page))
    }

    dirRoutes.set(dirPath, dirRoute)
  }

  return dirRoutes
}

/**
 * 创建子路由
 *
 * @param page - 页面信息
 * @returns 子路由配置
 */
function createChildRoute(page: ParsedPage): ParsedPage {
  const pathParts = page.path.split('/').filter(Boolean)
  const relativePath = pathParts[pathParts.length - 1] || ''

  const childRoute: ParsedPage = {
    ...page,
    path: page.isIndex ? '' : relativePath,
    children: []
  }

  if (page.isIndex && page.name) {
    childRoute.name = `${page.name}-index`
  }

  return childRoute
}

/**
 * 组装最终路由树
 *
 * @param pagesByDir - 按目录分组的页面
 * @param dirRoutes - 目录路由映射
 * @param routesToCreate - 需要创建的目录路由
 * @param layoutFiles - 布局文件映射
 * @returns 路由树根节点列表
 */
function assembleRouteTree(
  pagesByDir: Map<string, ParsedPage[]>,
  dirRoutes: Map<string, ParsedPage>,
  routesToCreate: Set<string>,
  layoutFiles: Map<string, ParsedPage>
): ParsedPage[] {
  const root: ParsedPage[] = []

  const rootPages = pagesByDir.get('/') || []
  for (const page of rootPages) {
    root.push({ ...page, children: [] })
  }

  for (const [dirPath, dirPages] of pagesByDir) {
    if (dirPath === '/') continue
    if (routesToCreate.has(dirPath)) continue

    if (dirPages.length === 1) {
      const page = dirPages[0]
      root.push({ ...page, children: [] })
    }
  }

  for (const [dirPath, dirRoute] of dirRoutes) {
    const pathParts = dirPath.split('/').filter(Boolean)

    if (pathParts.length === 1) {
      root.push(dirRoute)
    } else {
      const parentDirPath = '/' + pathParts.slice(0, -1).join('/')
      const parentRoute = dirRoutes.get(parentDirPath)

      if (parentRoute) {
        const relativePath = pathParts[pathParts.length - 1]
        parentRoute.children.push({
          ...dirRoute,
          path: relativePath
        })
      } else {
        root.push(dirRoute)
      }
    }
  }

  for (const layoutFile of layoutFiles.values()) {
    if (!dirRoutes.has(layoutFile.path)) {
      root.push(layoutFile)
    }
  }

  return root
}

/**
 * 处理路由的子路由
 *
 * @param routes - 路由列表
 * @returns 处理后的路由列表
 */
function processRouteChildren(routes: ParsedPage[]): ParsedPage[] {
  return sortRoutes(routes).map(route => {
    const processed: ParsedPage = { ...route, children: [] }

    if (route.children.length > 0) {
      processed.children = route.children.map(child => {
        const newChild: ParsedPage = {
          ...child,
          children: []
        }
        if (child.children.length > 0) {
          newChild.children = processRouteChildren(child.children)
        }
        return newChild
      })
    }

    return processed
  })
}

/**
 * 排序路由
 *
 * 排序规则：
 * 1. 索引路由优先
 * 2. 静态路由优先于动态路由
 * 3. 按路径字母顺序排序
 *
 * @param routes - 路由列表
 * @returns 排序后的路由列表
 */
function sortRoutes(routes: ParsedPage[]): ParsedPage[] {
  return routes
    .sort((a, b) => {
      if (a.isIndex && !b.isIndex) return -1
      if (!a.isIndex && b.isIndex) return 1

      if (a.isDynamic && !b.isDynamic) return 1
      if (!a.isDynamic && b.isDynamic) return -1

      return a.path.localeCompare(b.path)
    })
    .map(route => ({
      ...route,
      children: sortRoutes(route.children)
    }))
}

/**
 * 构建路由树
 *
 * 核心规则：
 * 1. 同名文件+目录组合：文件作为布局组件，目录内文件作为子路由
 * 2. 目录下的所有文件（包括 index）都作为子路由
 * 3. 子路由使用相对路径
 * 4. 有 index 子路由时自动添加 redirect
 * 5. 只有 index 文件的目录不创建目录路由
 *
 * @param pages - 解析后的页面列表
 * @returns 路由树根节点列表
 */
export function buildRouteTree(pages: ParsedPage[]): ParsedPage[] {
  const { layoutFiles, normalPages } = groupPagesByType(pages)
  const { map: pagesByDir, routesToCreate } = groupPagesByDirectory(normalPages, layoutFiles)
  const allDirPaths = collectAllDirectoryPaths(routesToCreate)
  const dirRoutes = buildDirectoryRoutes(allDirPaths, pagesByDir, layoutFiles)
  const root = assembleRouteTree(pagesByDir, dirRoutes, routesToCreate, layoutFiles)

  return processRouteChildren(root)
}
