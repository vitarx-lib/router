/**
 * @fileoverview 路由代码生成模块
 *
 * 负责将解析后的页面信息转换为可执行的路由配置代码。
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */

import { createHash } from 'node:crypto'
import type { ExtendRouteHook, ImportMode, ParsedNode, RouteNode } from '../types/index.js'
import { normalizeRoutePath } from '../utils/index.js'
import { generateDtsCode } from './generateTypes.js'

/**
 * 路由生成选项
 */
export interface GenerateRoutesOptions {
  /**
   * 是否生成类型代码
   */
  dts: boolean
  /**
   * 组件导入模式
   * - `lazy`: 使用 lazy(() => import(...)) 懒加载组件
   * - `file`: 直接使用文件路径作为组件
   */
  importMode: ImportMode
  /**
   * 路由扩展钩子
   * 在生成每个路由配置时调用，允许开发者自定义扩展路由配置
   */
  extendRoute?: ExtendRouteHook
  /**
   * 自定义导入语句
   * 允许向虚拟模块注入自定义的导入语句
   */
  imports?: readonly string[]
}
export interface GenerateResult {
  routes: RouteNode[]
  code: string
  dts: string
}

const IMPORT_QUOTE_REGEX = /from\s+(['"])([^'"]*)\1/g
const IMPORT_NORMALIZE_REGEX = /\s+/g

/**
 * 规范化导入语句
 *
 * @param statement
 */
function normalizeImportStatement(statement: string): string {
  let result = statement.trim()
  result = result.replace(IMPORT_QUOTE_REGEX, 'from "$2"')
  result = result.replace(IMPORT_NORMALIZE_REGEX, ' ')
  result = result.replace(/import\s*\{/g, 'import {')
  result = result.replace(/}\s*from/g, '} from')
  return result
}

/**
 * 根据绝对路径生成一个唯一的名称
 *
 * @param absolutePath
 */
export function pathToUniqueName(absolutePath: string): string {
  // md5 碰撞概率在现实场景中为 0，且生成速度极快
  const hash = createHash('md5').update(absolutePath).digest('hex')

  // 加上 '_' 前缀，因为 hash 结果可能是数字开头（如 '1a2b3c...'），
  // 数字开头的标识符在 JS 中不能直接作为变量名。
  return `_${hash}`
}

/**
 * 生成路由名称
 *
 * @returns 路由名称
 */
function generateRouteName(fullPath: string): string {
  return (
    fullPath
      // 1. 去除首尾斜杠
      .replace(/^\/+|\/+$/g, '')
      // 2. 直接删除花括号和问号（不替换为-，保护静态路径的连续中划线）
      .replace(/[{}?]/g, '')
      // 3. 仅将斜杠替换为中划线
      .replace(/\//g, '-')
  )
}

/**
 * 构建单个路由配置
 *
 * @param page - 页面信息
 * @param parent
 * @param extendRoute - 路由扩展钩子
 * @returns 解析后的路由配置
 */
function buildRouteNode(
  page: ParsedNode,
  extendRoute?: ExtendRouteHook,
  parent?: RouteNode
): RouteNode {
  // 创建基础路由配置
  const route: RouteNode = {
    path: page.path,
    fullPath: parent ? normalizeRoutePath(parent.fullPath + '/' + page.path) : page.path
  }

  // 处理组件配置
  if (page.components) {
    // 处理命名视图
    const components: Record<string, string> = {
      default: JSON.stringify(page.filePath)
    }
    for (const [viewName, viewPath] of Object.entries(page.components)) {
      components[viewName] = viewPath
    }
    route.component = components
  }

  // 处理路由配置
  if (page.options) {
    const { name, meta, pattern, redirect, alias } = page.options
    if (name?.trim()) {
      route.name = name
    }
    // 处理其他路由配置
    if (meta && Object.keys(meta).length > 0) {
      route.meta = { ...meta }
    }
    if (pattern && Object.keys(pattern).length > 0) {
      route.pattern = { ...pattern }
    }
    if (redirect !== undefined) {
      route.redirect = typeof redirect === 'object' ? { ...redirect } : redirect
    }
    if (alias !== undefined) {
      route.alias = Array.isArray(alias) ? Array.from(alias) : alias
    }
  }

  // 处理子路由
  if (page.children && page.children.size > 0) {
    // 递归处理子路由
    route.children = buildRoutes(page.children.values(), extendRoute, route)
  }

  // 应用路由扩展钩子
  if (extendRoute) extendRoute(route, page)
  // 动态路由不存在name时生成一个name
  if (!route.name && route.fullPath.includes('{')) {
    route.name = generateRouteName(route.fullPath)
  }
  return route
}

/**
 * 构建解析后的路由配置列表
 *
 * @param pages - 页面列表
 * @param extendRoute - 路由扩展钩子
 * @param parent - 父路由
 * @returns 路由配置列表
 */
export function buildRoutes(
  pages: Iterable<ParsedNode>,
  extendRoute?: ExtendRouteHook,
  parent?: RouteNode
): RouteNode[] {
  const routes: RouteNode[] = []
  for (const page of pages) {
    const route = buildRouteNode(page, extendRoute, parent)
    routes.push(route)
  }
  return routes
}

/**
 * 解析组件导入表达式
 *
 * @param file - 组件文件路径
 * @param importPath - JSON.stringify 后的文件路径
 * @param mode - 解析后的导入模式（'lazy' | 'sync' | 自定义表达式）
 * @param importLines - 导入语句集合
 * @returns 组件表达式代码
 */
function resolveComponentExpr(
  file: string,
  importPath: string,
  mode: 'lazy' | 'sync' | string,
  importLines: Set<string>
): string {
  if (mode === 'sync') {
    const expr = pathToUniqueName(file)
    importLines.add(normalizeImportStatement(`import ${expr} from ${importPath}`))
    return expr
  }
  if (mode === 'lazy') {
    importLines.add(normalizeImportStatement(`import { lazy } from 'vitarx'`))
    return `lazy(() => import(${importPath}))`
  }
  return mode
}

/**
 * 格式化组件表达式
 *
 * @param component - 组件路径或命名视图映射
 * @param importMode - 导入模式
 * @param importLines - 导入语句集合
 * @returns 格式化后的组件表达式代码
 */
function formatComponent(
  component: string | Record<string, string>,
  importMode: ImportMode,
  importLines: Set<string>
): string {
  const entries = Object.entries(component).map(([name, file]) => {
    const importPath = JSON.stringify(file)
    const mode =
      typeof importMode === 'function'
        ? importMode({
            importPath,
            filePath: file,
            addImport: statement => importLines.add(normalizeImportStatement(statement))
          })
        : importMode
    const expr = resolveComponentExpr(file, importPath, mode, importLines)
    return `${JSON.stringify(name)}: ${expr}`
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
 * @param importLines - 导入语句集合
 * @returns 代码行数组
 */
function generateRouteCode(
  route: RouteNode,
  indent: string,
  isLast: boolean,
  importMode: ImportMode,
  importLines: Set<string>
): string[] {
  const lines: string[] = []
  const comma = isLast ? '' : ','

  // 开始路由对象
  lines.push(`${indent}{`)

  // 添加路由名称
  if (route.name !== undefined) {
    lines.push(`${indent}  name: ${JSON.stringify(route.name)},`)
  }
  // 添加路由路径
  lines.push(`${indent}  path: ${JSON.stringify(route.path)}`)

  // 添加组件配置
  if (route.component) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  component: ${formatComponent(route.component, importMode, importLines)}`)
  }
  // 添加 meta 配置
  if (route.meta) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  meta: ${JSON.stringify(route.meta)}`)
  }
  // 添加 pattern 配置
  if (route.pattern && Object.keys(route.pattern).length > 0) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  pattern: ${generatePatternCode(route.pattern)}`)
  }
  // 添加重定向配置
  if (route.redirect !== undefined) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  redirect: ${JSON.stringify(route.redirect)}`)
  }
  // 添加别名配置
  if (route.alias !== undefined) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  alias: ${JSON.stringify(route.alias)}`)
  }
  // 添加子路由
  if (route.children && route.children.length > 0) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  children: [`)
    for (let i = 0; i < route.children.length; i++) {
      const child = route.children[i]
      // 递归生成子路由代码
      lines.push(
        ...generateRouteCode(
          child,
          indent + '    ',
          i === route.children!.length - 1,
          importMode,
          importLines
        )
      )
    }
    lines.push(`${indent}  ]`)
  }
  // 结束路由对象
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
 * @returns {string} 完整的路由模块代码
 */
export function generateRoutesCode(
  routes: RouteNode[],
  importMode: ImportMode = 'lazy',
  customImports?: readonly string[],
  indent: string = '  '
): string {
  const importLines: Set<string> = new Set<string>()
  const codeLines: string[] = []

  if (customImports && customImports.length > 0) {
    customImports.forEach(imp => importLines.add(normalizeImportStatement(imp)))
  }

  codeLines.push('export default [')
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    codeLines.push(
      ...generateRouteCode(route, indent, i === routes.length - 1, importMode, importLines)
    )
  }
  codeLines.push(']')

  const allImports = Array.from(importLines.values())
  if (allImports.length > 0) {
    allImports.push('')
  }
  return allImports.concat(codeLines).join('\n')
}

/**
 * 生成路由配置代码
 *
 * 将页面列表转换为完整的路由配置模块代码。
 *
 * @param pages - 解析后的页面列表
 * @param options - 路由生成选项
 * @returns { GenerateResult } 包含routes、code、dts的路由配置结果
 */
export function generateRoutes(
  pages: ParsedNode[],
  options: GenerateRoutesOptions
): GenerateResult {
  // 构建解析后的路由配置
  const routes = buildRoutes(pages, options.extendRoute)
  // 生成最终的路由代码
  const code = generateRoutesCode(routes, options.importMode, options.imports)
  const dts = options.dts ? generateDtsCode(routes) : ''
  return { routes, code, dts }
}
