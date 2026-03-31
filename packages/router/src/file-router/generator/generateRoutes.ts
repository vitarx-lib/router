/**
 * @fileoverview 路由代码生成模块
 *
 * 负责将解析后的页面信息转换为可执行的路由配置代码。
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */
import type {
  ExtendRouteHook,
  ImportMode,
  NamingStrategy,
  ParsedPage,
  ResolvedRoute
} from '../types.js'

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
   * 路由命名策略
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认）
   * - `lowercase`: 简单转换为小写
   * - `none`: 保持原始命名
   * @default 'kebab'
   */
  namingStrategy?: NamingStrategy
}
/**
 * 构建单个路由配置
 *
 * @param page - 页面信息
 * @param options - 生成选项
 * @returns 解析后的路由配置
 */
async function buildResolvedRoute(
  page: ParsedPage,
  options: GenerateRoutesOptions
): Promise<ResolvedRoute> {
  const { extendRoute } = options

  const route: ResolvedRoute = {
    path: page.path
  }

  if (page.filePath && page.filePath.trim() !== '') {
    if (page.namedViews) {
      const components: Record<string, string> = {
        default: JSON.stringify(page.filePath)
      }
      for (const [viewName, viewPath] of Object.entries(page.namedViews)) {
        components[viewName] = JSON.stringify(viewPath)
      }
      route.component = components
    } else {
      route.component = JSON.stringify(page.filePath)
    }
  }

  if (page.meta && Object.keys(page.meta).length > 0) {
    route.meta = page.meta
  }
  if (page.pattern && Object.keys(page.pattern).length > 0) {
    route.pattern = page.pattern
  }
  if (page.redirect !== undefined) {
    route.redirect = page.redirect
  }
  if (page.alias !== undefined) {
    route.alias = page.alias
  }
  if (page.children.length > 0) {
    route.children = await buildResolvedRoutes(page.children, options)
  }

  if (page.children.length === 0 || page.redirect !== undefined) {
    route.name = page.name
  }

  if (extendRoute) {
    const result = await extendRoute(route)
    if (result) return result
  }
  return route
}

/**
 * 构建解析后的路由配置列表
 *
 * @param pages - 页面列表
 * @param options - 生成选项
 * @returns 路由配置列表
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
 * 格式化组件表达式
 *
 * @param component - 组件路径或命名视图映射
 * @param importMode - 导入模式
 * @returns 格式化后的组件表达式代码
 */
function formatComponent(
  component: string | Record<string, string>,
  importMode: ImportMode
): string {
  if (typeof component === 'string') {
    return importMode === 'file' ? component : `lazy(() => import(${component}))`
  }
  const entries = Object.entries(component).map(([name, value]) => {
    const expr = importMode === 'file' ? value : `lazy(() => import(${value}))`
    return `${name}: ${expr}`
  })
  return `{ ${entries.join(', ')} }`
}

/**
 * 生成 pattern 对象的代码
 *
 * @param pattern - 正则表达式映射
 * @returns pattern 代码字符串
 */
function generatePatternCode(pattern: Record<string, RegExp>): string {
  const entries = Object.entries(pattern).map(([key, regex]) => {
    return `    ${key}: ${regex.toString()}`
  })
  return `{\n${entries.join(',\n')}\n  }`
}

/**
 * 生成单个路由的代码
 *
 * @param route - 路由配置
 * @param indent - 缩进字符串
 * @param isLast - 是否为最后一个元素
 * @param importMode - 导入模式
 * @returns 代码行数组
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

  if (route.name !== undefined) {
    lines.push(`${indent}  name: ${JSON.stringify(route.name)},`)
  }
  lines.push(`${indent}  path: ${JSON.stringify(route.path)}`)

  if (route.component) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  component: ${formatComponent(route.component, importMode)}`)
  }
  if (route.meta) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  meta: ${JSON.stringify(route.meta)}`)
  }
  if (route.pattern && Object.keys(route.pattern).length > 0) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  pattern: ${generatePatternCode(route.pattern)}`)
  }
  if (route.redirect !== undefined) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  redirect: ${JSON.stringify(route.redirect)}`)
  }
  if (route.alias !== undefined) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  alias: ${JSON.stringify(route.alias)}`)
  }
  if (route.children && route.children.length > 0) {
    lines[lines.length - 1] += ','
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
 * 生成路由代码字符串
 *
 * @param routes - 路由配置列表
 * @param importMode - 导入模式
 * @param customImports - 自定义导入语句
 * @param indent - 缩进字符串
 * @returns 完整的路由模块代码
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
 * 生成路由配置代码
 *
 * 将页面列表转换为完整的路由配置模块代码。
 *
 * @param pages - 解析后的页面列表
 * @param options - 路由生成选项
 * @returns Promise 包含可执行路由配置代码字符串
 */
export async function generateRoutes(
  pages: ParsedPage[],
  options: GenerateRoutesOptions = {}
): Promise<string> {
  const routes = await buildResolvedRoutes(pages, options)
  return generateRoutesCode(routes, options.importMode, options.imports)
}
