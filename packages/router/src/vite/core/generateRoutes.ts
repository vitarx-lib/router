/**
 * @fileoverview 路由代码生成模块
 *
 * 负责将解析后的页面信息转换为可执行的路由配置代码。
 * 生成的代码使用 vitarx 的 lazy 函数实现组件懒加载。
 */
import { applyNamingStrategyToName } from './namingStrategy.js'
import type {
  ExtendRouteHook,
  ImportMode,
  NamingStrategy,
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
   * 路由命名策略
   * - `kebab`: 将驼峰命名转换为 kebab-case（默认）
   * - `lowercase`: 简单转换为小写
   * - `none`: 保持原始命名
   * @default 'kebab'
   */
  namingStrategy?: NamingStrategy
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
 *
 * 核心逻辑：
 * 1. 创建基础路由对象（path）
 * 2. 如果有文件路径，生成组件导入表达式
 * 3. 处理命名视图（多个组件的情况）
 * 4. 添加可选的 meta、pattern、redirect、children
 * 5. 分组路由（有 children）不设置 name 属性
 */
async function buildResolvedRoute(
  page: ParsedPage,
  options: GenerateRoutesOptions
): Promise<ResolvedRoute> {
  const { extendRoute, namingStrategy = 'kebab' } = options

  // 步骤1：创建基础路由对象
  // 注意：component 是可选的，目录路由没有布局文件时不会有 component
  // path 已在 parsePageFile 中应用命名策略转换
  const route: ResolvedRoute = {
    path: page.path
  }

  // 步骤2：处理组件导入
  // 只有当 filePath 非空时才生成 component 属性
  // 目录路由（无布局文件）的 filePath 为空字符串
  // 注意：这里只存储文件路径，在代码生成阶段才根据 importMode 生成代码
  if (page.filePath && page.filePath.trim() !== '') {
    // 步骤2.1：处理命名视图（如 index@sidebar.tsx）
    // 命名视图存储为对象：{ default: '"/src/pages/index.tsx"', sidebar: '"/src/pages/index@sidebar.tsx"' }
    if (page.namedViews) {
      const components: Record<string, string> = {
        default: JSON.stringify(page.filePath)
      }
      // 添加其他命名视图
      for (const [viewName, viewPath] of Object.entries(page.namedViews)) {
        components[viewName] = JSON.stringify(viewPath)
      }
      route.component = components
    } else {
      // 步骤2.2：单一组件
      route.component = JSON.stringify(page.filePath)
    }
  }

  // 步骤3：添加可选属性
  if (page.meta && Object.keys(page.meta).length > 0) {
    route.meta = page.meta
  }
  if (page.pattern && Object.keys(page.pattern).length > 0) {
    route.pattern = page.pattern
  }
  if (page.redirect !== undefined) {
    route.redirect = formatRedirect(page.redirect, namingStrategy)
  }
  if (page.children.length > 0) {
    route.children = await buildResolvedRoutes(page.children, options)
  }

  // 步骤4：设置 name 属性
  // 分组路由（有 children）不设置 name，除非有 redirect
  if (page.children.length === 0 || page.redirect !== undefined) {
    route.name = page.name
  }

  // 步骤5：调用扩展钩子（允许用户自定义修改路由）
  if (extendRoute) {
    const result = await extendRoute(route)
    if (result) return result
  }
  return route
}

/**
 * 格式化重定向配置为代码字符串
 *
 * 支持两种格式：
 * 1. 字符串路径：'/dashboard'
 * 2. 对象形式：{ index: 'home', query: { from: 'old' }, params: { id: 1 } }
 */
function formatRedirect(
  redirect: string | RedirectConfig,
  namingStrategy: NamingStrategy = 'kebab'
): string {
  if (typeof redirect === 'string') return JSON.stringify(redirect)
  // 对象形式：构建导航配置对象
  const parts: string[] = [
    `index: ${JSON.stringify(applyNamingStrategyToName(redirect.index, namingStrategy))}`
  ]
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

  // 添加 lazy 导入（仅 lazy 模式需要）
  if (importMode === 'lazy') {
    lines.push(`import { lazy } from 'vitarx'`)
  }

  // 添加自定义导入语句
  if (customImports && customImports.length > 0) {
    for (const imp of customImports) {
      lines.push(imp)
    }
  }

  // 添加空行分隔
  if (importMode === 'lazy' || (customImports && customImports.length > 0)) {
    lines.push('')
  }

  // 生成路由数组
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
 *
 * 核心逻辑：
 * 1. 按固定顺序生成属性：name → path → component → meta → pattern → redirect → children
 * 2. 动态处理逗号分隔：每个属性生成后，为上一行添加逗号（如果还有后续属性）
 * 3. 递归处理子路由
 * 4. 分组路由（有 children）不生成 name 属性
 *
 * 示例输出：
 * {
 *   path: '/admin',
 *   component: lazy(() => import('/src/pages/admin.tsx')),
 *   redirect: '/admin/index',
 *   children: [...]
 * }
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

  // name 属性：分组路由（有 children 且无 redirect）不生成 name
  if (route.name !== undefined) {
    lines.push(`${indent}  name: ${JSON.stringify(route.name)},`)
  }
  lines.push(`${indent}  path: ${JSON.stringify(route.path)}`)

  // 关键：动态添加逗号
  // 每个可选属性生成前，先检查上一行是否需要逗号
  // 这样可以确保只有存在后续属性时才添加逗号
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
    lines.push(`${indent}  redirect: ${route.redirect}`)
  }
  if (route.children && route.children.length > 0) {
    lines[lines.length - 1] += ','
    lines.push(`${indent}  children: [`)
    // 递归生成子路由
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
 * 格式化组件表达式
 *
 * @param component - 组件文件路径或代码表达式（字符串或对象）
 * @param importMode - 导入模式
 * @returns 格式化后的代码字符串
 */
function formatComponent(
  component: string | Record<string, string>,
  importMode: ImportMode
): string {
  if (typeof component === 'string') {
    return importMode === 'file' ? component : `lazy(() => import(${component}))`
  }
  // 命名视图：生成 { default: lazy(...), sidebar: lazy(...) }
  const entries = Object.entries(component).map(([name, value]) => {
    // 检测是否已经是代码表达式
    const expr = importMode === 'file' ? value : `lazy(() => import(${value}))`
    return `${name}: ${expr}`
  })
  return `{ ${entries.join(', ')} }`
}

/**
 * 生成 pattern 对象的代码
 *
 * 将正则表达式对象转换为代码字符串
 * 示例：{ id: /^\d+$/ } → "{\n    id: /^\\d+$/\n  }"
 */
function generatePatternCode(pattern: Record<string, RegExp>): string {
  const entries = Object.entries(pattern).map(([key, regex]) => {
    return `    ${key}: ${regex.toString()}`
  })
  return `{\n${entries.join(',\n')}\n  }`
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
