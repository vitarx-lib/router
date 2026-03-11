/**
 * @fileoverview 路由代码生成模块
 *
 * 负责将解析后的页面信息转换为可执行的路由配置代码。
 * 生成的代码使用 vitarx 的 lazy 函数实现组件懒加载。
 */
import type {
  ExtendRouteHook,
  ImportMode,
  ParsedPage,
  RedirectConfig,
  ResolvedRoute
} from './types.js'

/**
 * 路由生成选项
 */
export interface GenerateRoutesOptions {
  /**
   * 组件导入模式
   * - `lazy`: 使用 lazy(() => import(...)) 懒加载组件
   * - `file`: 直接使用文件路径作为组件
   */
  importMode?: ImportMode
  /**
   * 路由扩展钩子
   * 在生成每个路由配置时调用，允许开发者自定义扩展路由配置
   */
  extendRoute?: ExtendRouteHook
  /**
   * 自定义导入语句
   * 允许向虚拟模块注入自定义的导入语句
   */
  imports?: string[]
  /**
   * 是否将路由名称和路径转换为小写
   * @default true
   */
  lowercase?: boolean
}

/**
 * 生成路由配置代码
 *
 * 将页面列表转换为完整的路由配置模块代码。
 * 生成的代码包含：
 * - vitarx 的 lazy 函数导入（当 importMode 为 'lazy' 时）
 * - 默认导出的路由数组
 * - 每个路由的 name、path、component 和可选的 meta、children
 *
 * @param pages - 解析后的页面列表
 * @param options - 路由生成选项
 * @returns Promise 包含可执行路由配置代码字符串
 *
 * @example
 * ```typescript
 * const code = await generateRoutes([
 *   { path: '/', name: 'home', filePath: '/src/pages/index.tsx', ... }
 * ])
 *
 * // 生成的代码（lazy 模式）：
 * // import { lazy } from 'vitarx'
 * //
 * // export default [
 * //   {
 * //     name: 'home',
 * //     path: '/',
 * //     component: lazy(() => import('/src/pages/index.tsx'))
 * //   }
 * // ]
 *
 * // 生成的代码（file 模式）：
 * // export default [
 * //   {
 * //     name: 'home',
 * //     path: '/',
 * //     component: '/src/pages/index.tsx'
 * //   }
 * // ]
 * ```
 */
export async function generateRoutes(
  pages: ParsedPage[],
  options: GenerateRoutesOptions = {}
): Promise<string> {
  const routes = await buildResolvedRoutes(pages, options)
  return generateRoutesCode(routes, options.importMode, options.imports)
}

/**
 * 构建解析后的路由配置列表
 */
async function buildResolvedRoutes(
  pages: ParsedPage[],
  options: GenerateRoutesOptions
): Promise<ResolvedRoute[]> {
  const routes: ResolvedRoute[] = []
  for (const page of pages) {
    const route = await buildResolvedRoute(page, options)
    routes.push(route)
  }
  return routes
}

/**
 * 构建单个路由配置
 */
async function buildResolvedRoute(
  page: ParsedPage,
  options: GenerateRoutesOptions
): Promise<ResolvedRoute> {
  const { importMode = 'lazy', extendRoute, lowercase = true } = options
  const component = importMode === 'file' ? page.filePath : `lazy(() => import('${page.filePath}'))`

  const route: ResolvedRoute = {
    path: lowercase ? page.path.toLowerCase() : page.path,
    name: lowercase ? page.name.toLowerCase() : page.name,
    component
  }
  if (page.meta && Object.keys(page.meta).length > 0) {
    route.meta = page.meta
  }
  if (page.pattern && Object.keys(page.pattern).length > 0) {
    route.pattern = page.pattern
  }
  if (page.redirect !== undefined) {
    route.redirect = formatRedirect(page.redirect, lowercase)
  }
  if (page.children.length > 0) {
    route.children = await buildResolvedRoutes(page.children, options)
  }
  if (extendRoute) {
    const result = await extendRoute(route)
    if (result) return result
  }
  return route
}

/**
 * 格式化重定向配置为代码字符串
 */
function formatRedirect(redirect: string | RedirectConfig, lowercase: boolean = true): string {
  if (typeof redirect === 'string') {
    return `'${lowercase ? redirect.toLowerCase() : redirect}'`
  }
  // 对象形式
  const parts: string[] = [`index: '${lowercase ? redirect.index.toLowerCase() : redirect.index}'`]
  if (redirect.query) {
    parts.push(`query: ${JSON.stringify(redirect.query)}`)
  }
  if (redirect.params) {
    parts.push(`params: ${JSON.stringify(redirect.params)}`)
  }
  return `{ ${parts.join(', ')} }`
}

/**
 * 生成路由代码字符串
 */
function generateRoutesCode(
  routes: ResolvedRoute[],
  importMode: ImportMode = 'lazy',
  customImports?: string[],
  indent: string = '  '
): string {
  const lines: string[] = []
  if (importMode === 'lazy') {
    lines.push(`import { lazy } from 'vitarx'`)
  }
  if (customImports && customImports.length > 0) {
    for (const imp of customImports) {
      lines.push(imp)
    }
  }
  if (importMode === 'lazy' || (customImports && customImports.length > 0)) {
    lines.push('')
  }
  lines.push('export default [')
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    lines.push(...generateRouteCode(route, indent, i === routes.length - 1, importMode))
  }
  lines.push(']')
  return lines.join('\n')
}

/**
 * 生成单个路由的代码
 */
function generateRouteCode(
  route: ResolvedRoute,
  indent: string,
  isLast: boolean,
  importMode: ImportMode
): string[] {
  const lines: string[] = []
  const comma = isLast ? '' : ','
  lines.push(`${indent}{`)
  lines.push(`${indent}  name: '${route.name}',`)
  lines.push(`${indent}  path: '${route.path}',`)
  if (importMode === 'file') {
    lines.push(`${indent}  component: '${route.component}'`)
  } else {
    lines.push(`${indent}  component: ${route.component}`)
  }
  if (route.meta) {
    lines.push(`${indent}  meta: ${JSON.stringify(route.meta)}`)
  }
  if (route.pattern && Object.keys(route.pattern).length > 0) {
    lines.push(`${indent}  pattern: ${generatePatternCode(route.pattern)}`)
  }
  if (route.redirect !== undefined) {
    lines.push(`${indent}  redirect: ${route.redirect}`)
  }
  if (route.children && route.children.length > 0) {
    lines.push(`${indent}  children: [`)
    for (let i = 0; i < route.children.length; i++) {
      const child = route.children[i]
      lines.push(
        ...generateRouteCode(child, indent + '    ', i === route.children!.length - 1, importMode)
      )
    }
    lines.push(`${indent}  ]`)
  }
  lines.push(`${indent}}${comma}`)
  return lines
}

/**
 * 生成 pattern 对象的代码
 */
function generatePatternCode(pattern: Record<string, RegExp>): string {
  const entries = Object.entries(pattern).map(([key, regex]) => {
    return `    ${key}: ${regex.toString()}`
  })
  return `{\n${entries.join(',\n')}\n  }`
}

/**
 * 生成路由配置 JSON 对象
 */
export async function generateRoutesJSON(
  pages: ParsedPage[],
  options: GenerateRoutesOptions = {}
): Promise<ResolvedRoute[]> {
  return buildResolvedRoutes(pages, options)
}
