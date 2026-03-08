/**
 * @fileoverview 路由代码生成模块
 *
 * 负责将解析后的页面信息转换为可执行的路由配置代码。
 * 生成的代码使用 vitarx 的 lazy 函数实现组件懒加载。
 */
import type { ParsedPage, ResolvedRoute } from './types.js'

/**
 * 生成路由配置代码
 *
 * 将页面列表转换为完整的路由配置模块代码。
 * 生成的代码包含：
 * - vitarx 的 lazy 函数导入
 * - 默认导出的路由数组
 * - 每个路由的 name、path、component 和可选的 meta、children
 *
 * @param pages - 解析后的页面列表
 * @returns 可执行的路由配置代码字符串
 *
 * @example
 * ```typescript
 * const code = generateRoutes([
 *   { path: '/', name: 'home', filePath: '/src/pages/index.tsx', ... }
 * ])
 *
 * // 生成的代码：
 * // import { lazy } from 'vitarx'
 * //
 * // export default [
 * //   {
 * //     name: 'home',
 * //     path: '/',
 * //     component: lazy(() => import('/src/pages/index.tsx'))
 * //   }
 * // ]
 * ```
 */
export function generateRoutes(pages: ParsedPage[]): string {
  const routes = buildResolvedRoutes(pages)
  return generateRoutesCode(routes)
}

/**
 * 构建解析后的路由配置列表
 *
 * 将 ParsedPage 列表转换为 ResolvedRoute 列表。
 *
 * @param pages - 页面列表
 * @returns 路由配置列表
 */
function buildResolvedRoutes(pages: ParsedPage[]): ResolvedRoute[] {
  return pages.map(page => buildResolvedRoute(page))
}

/**
 * 构建单个路由配置
 *
 * @param page - 页面信息
 * @returns 路由配置对象
 */
function buildResolvedRoute(page: ParsedPage): ResolvedRoute {
  const route: ResolvedRoute = {
    path: page.path,
    name: page.name,
    component: `lazy(() => import('${page.filePath}'))`
  }

  // 添加元数据（如果存在）
  if (page.meta && Object.keys(page.meta).length > 0) {
    route.meta = page.meta
  }

  // 添加 pattern（如果存在）
  if (page.pattern && Object.keys(page.pattern).length > 0) {
    route.pattern = page.pattern
  }

  // 递归处理子路由
  if (page.children.length > 0) {
    route.children = buildResolvedRoutes(page.children)
  }

  return route
}

/**
 * 生成路由代码字符串
 *
 * @param routes - 路由配置列表
 * @param indent - 缩进字符串
 * @returns 代码字符串
 */
function generateRoutesCode(routes: ResolvedRoute[], indent: string = '  '): string {
  const lines: string[] = []

  // 导入语句
  lines.push(`import { lazy } from 'vitarx'`)
  lines.push('')
  lines.push('export default [')

  // 生成每个路由的代码
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    lines.push(...generateRouteCode(route, indent, i === routes.length - 1))
  }

  lines.push(']')

  return lines.join('\n')
}

/**
 * 生成单个路由的代码
 *
 * @param route - 路由配置
 * @param indent - 缩进字符串
 * @param isLast - 是否为最后一个路由（用于决定是否添加逗号）
 * @returns 代码行数组
 */
function generateRouteCode(route: ResolvedRoute, indent: string, isLast: boolean): string[] {
  const lines: string[] = []
  const comma = isLast ? '' : ','

  lines.push(`${indent}{`)
  lines.push(`${indent}  name: '${route.name}',`)
  lines.push(`${indent}  path: '${route.path}',`)
  lines.push(`${indent}  component: ${route.component}`)

  // 添加元数据
  if (route.meta) {
    lines.push(`${indent}  meta: ${JSON.stringify(route.meta)}`)
  }

  // 添加 pattern（正则表达式需要特殊处理）
  if (route.pattern && Object.keys(route.pattern).length > 0) {
    lines.push(`${indent}  pattern: ${generatePatternCode(route.pattern)}`)
  }

  // 递归生成子路由
  if (route.children && route.children.length > 0) {
    lines.push(`${indent}  children: [`)
    for (let i = 0; i < route.children.length; i++) {
      const child = route.children[i]
      lines.push(...generateRouteCode(child, indent + '    ', i === route.children!.length - 1))
    }
    lines.push(`${indent}  ]`)
  }

  lines.push(`${indent}}${comma}`)

  return lines
}

/**
 * 生成 pattern 对象的代码
 *
 * 将 RegExp 对象转换为可执行的代码字符串。
 *
 * @param pattern - pattern 对象
 * @returns 代码字符串
 *
 * @example
 * ```typescript
 * generatePatternCode({ id: /^\d+$/ })
 * // => '{ id: /^\\d+$/ }'
 * ```
 */
function generatePatternCode(pattern: Record<string, RegExp>): string {
  const entries = Object.entries(pattern).map(([key, regex]) => {
    // 使用 regex.toString() 获取正则字面量字符串
    // 例如：/^\d+$/.toString() => "/^\\d+$/"
    return `    ${key}: ${regex.toString()}`
  })

  return `{\n${entries.join(',\n')}\n  }`
}

/**
 * 生成路由配置 JSON 对象
 *
 * 与 generateRoutes 类似，但返回的是对象而非代码字符串。
 * 主要用于测试和调试。
 *
 * @param pages - 解析后的页面列表
 * @returns 路由配置对象数组
 */
export function generateRoutesJSON(pages: ParsedPage[]): ResolvedRoute[] {
  return buildResolvedRoutes(pages)
}
