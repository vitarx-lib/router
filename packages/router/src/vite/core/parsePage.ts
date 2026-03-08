/**
 * @fileoverview 页面解析模块
 *
 * 负责解析页面文件路径，提取路由信息，包括：
 * - 路由路径转换
 * - 动态参数识别
 * - definePage 宏解析（使用 Babel AST 解析）
 */
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import type * as BabelTypes from '@babel/types'
import type { PageOptions, ParsedPage } from './types.js'

/** 动态参数匹配正则，如 [id]、[slug] */
const DYNAMIC_PARAM_REGEX = /^\[(.+)]$/

/** definePage 的导入来源 */
const DEFINE_PAGE_SOURCES = ['vitarx-router/auto-routes']

/**
 * 解析页面文件
 *
 * 根据文件路径解析出路由配置信息，包括路径、名称、参数等。
 *
 * 文件命名约定：
 * - `index.tsx` → 索引路由，路径为目录路径
 * - `[id].tsx` → 动态路由，路径包含参数 `{id}`
 * - `about.tsx` → 静态路由，路径为 `/about`
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录绝对路径
 * @param parentPath - 父级路径（用于嵌套路由）
 * @returns 解析后的页面信息，解析失败返回 null
 *
 * @example
 * ```typescript
 * // 解析索引文件
 * parsePageFile('/src/pages/index.tsx', '/src/pages', '')
 * // => { path: '/', name: '', isIndex: true, ... }
 *
 * // 解析动态路由文件
 * parsePageFile('/src/pages/user/[id].tsx', '/src/pages', 'user')
 * // => { path: '/user/{id}', name: 'user-id', params: ['id'], ... }
 * ```
 */
export function parsePageFile(
  filePath: string,
  pagesDir: string,
  parentPath: string
): ParsedPage | null {
  const fileName = path.basename(filePath)
  const ext = path.extname(fileName)
  const baseName = fileName.slice(0, -ext.length)

  const relativePath = path.relative(pagesDir, filePath)
  const dirPath = path.dirname(relativePath)

  const isIndex = baseName === 'index'

  // 解析文件名，提取路由名称和动态参数
  const { name: routeName, params, isDynamic } = parseFileName(baseName)

  // 构建路由路径
  let routePath: string
  if (isIndex) {
    // 索引文件：路径为目录路径
    if (dirPath === '.') {
      routePath = '/'
    } else {
      routePath = '/' + dirPath.replace(/\\/g, '/')
    }
  } else {
    // 非索引文件：路径为目录路径 + 文件名
    if (dirPath === '.') {
      routePath = '/' + routeName
    } else {
      routePath = '/' + dirPath.replace(/\\/g, '/') + '/' + routeName
    }
  }

  // 生成路由名称（用于编程式导航）
  const name = generateRouteName(relativePath, baseName)

  // 解析 definePage 宏配置
  const pageOptions = parseDefinePage(filePath)

  return {
    path: routePath,
    filePath,
    name: pageOptions?.name || name,
    params,
    isIndex,
    isDynamic,
    children: [],
    meta: pageOptions?.meta,
    customName: pageOptions?.name,
    parentPath
  }
}

/**
 * 解析文件名
 *
 * 识别文件名中的动态参数，如 `[id]` 会被解析为参数 `id`。
 *
 * @param fileName - 文件名（不含扩展名）
 * @returns 包含路由名称、参数列表和是否动态路由的对象
 */
function parseFileName(fileName: string): {
  name: string
  params: string[]
  isDynamic: boolean
} {
  const params: string[] = []
  let isDynamic = false

  const dynamicMatch = fileName.match(DYNAMIC_PARAM_REGEX)

  if (dynamicMatch) {
    isDynamic = true
    const paramName = dynamicMatch[1]
    params.push(paramName)
    // 将 [id] 转换为 {id} 格式
    return { name: `{${paramName}}`, params, isDynamic }
  }

  return { name: fileName, params, isDynamic }
}

/**
 * 生成路由名称
 *
 * 根据文件相对路径生成唯一的路由名称。
 * 命名规则：目录名用 "-" 连接，动态参数使用参数名。
 *
 * @param relativePath - 相对于 pages 目录的路径
 * @param baseName - 文件名（不含扩展名）
 * @returns 路由名称
 *
 * @example
 * ```typescript
 * generateRouteName('index.tsx', 'index')        // => ''
 * generateRouteName('user/index.tsx', 'index')   // => 'user'
 * generateRouteName('user/[id].tsx', '[id]')     // => 'user-id'
 * generateRouteName('user/settings.tsx', 'settings') // => 'user-settings'
 * ```
 */
function generateRouteName(relativePath: string, baseName: string): string {
  const dirPath = path.dirname(relativePath)
  const segments: string[] = []

  // 添加目录路径段
  if (dirPath !== '.') {
    segments.push(...dirPath.replace(/\\/g, '/').split('/'))
  }

  // 添加文件名段（索引文件不添加）
  if (baseName !== 'index') {
    const dynamicMatch = baseName.match(DYNAMIC_PARAM_REGEX)
    if (dynamicMatch) {
      // 动态参数使用参数名
      segments.push(dynamicMatch[1])
    } else {
      segments.push(baseName)
    }
  }

  return segments.join('-')
}

/**
 * 解析 definePage 宏配置
 *
 * 使用 Babel AST 解析器从页面文件内容中提取 definePage 宏的配置信息。
 * 支持解析 name 和 meta 属性，能够正确处理各种复杂的 JavaScript 表达式。
 *
 * 特性：
 * - 自动检测 definePage 的导入别名
 * - 检测多个 definePage 调用并发出警告
 * - 检测未导入就使用 definePage 的情况
 *
 * @param filePath - 页面文件路径
 * @returns 解析出的页面配置，解析失败返回 null
 *
 * @example
 * ```typescript
 * // 页面文件内容：
 * // import { definePage } from 'vitarx-router/auto-routes'
 * // definePage({ name: 'user-detail', meta: { title: '用户详情' } })
 *
 * parseDefinePage('/src/pages/user/[id].tsx')
 * // => { name: 'user-detail', meta: { title: '用户详情' } }
 * ```
 */
export function parseDefinePage(filePath: string): PageOptions | null {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  // 快速检查是否包含 definePage 相关内容，避免不必要的 AST 解析
  if (!content.includes('definePage') && !DEFINE_PAGE_SOURCES.some(src => content.includes(src))) {
    return null
  }

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'topLevelAwait',
        'classProperties',
        'objectRestSpread',
        'dynamicImport'
      ]
    })

    // 用于存储导入的 definePage 的本地名称（可能是别名）
    let definePageLocalName: string | null = null
    // 用于存储所有找到的 definePage 配置
    const pageOptionsList: PageOptions[] = []
    // 用于存储警告信息
    const warnings: string[] = []

    traverse(ast, {
      // 首先处理导入语句，确定 definePage 的本地名称
      ImportDeclaration(nodePath) {
        const { node } = nodePath

        // 检查是否是从有效来源导入
        if (!DEFINE_PAGE_SOURCES.includes(node.source.value)) {
          return
        }

        // 查找 definePage 的导入
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier') {
            const importedName =
              specifier.imported.type === 'Identifier'
                ? specifier.imported.name
                : specifier.imported.value

            if (importedName === 'definePage') {
              // 记录本地名称（可能是别名）
              definePageLocalName = specifier.local.name
            }
          } else if (specifier.type === 'ImportDefaultSpecifier') {
            // 如果是默认导入，也检查是否是 definePage
            if (specifier.local.name === 'definePage') {
              definePageLocalName = 'definePage'
            }
          }
        }
      },

      // 然后处理函数调用
      CallExpression(nodePath) {
        const { node } = nodePath

        // 检查是否是 definePage 调用
        if (node.callee.type === 'Identifier' && node.callee.name === 'definePage') {
          // 检查是否已导入
          if (!definePageLocalName) {
            warnings.push(
              `[vitarx-router] 警告: ${filePath}\n` +
                `  definePage 未从 'vitarx-router/auto-routes' 导入，请确保添加导入语句。`
            )
          } else if (definePageLocalName !== 'definePage') {
            // 如果使用了别名但调用的是原始名称
            warnings.push(
              `[vitarx-router] 警告: ${filePath}\n` +
                `  definePage 已导入为 '${definePageLocalName}'，但代码中使用的是 'definePage'。`
            )
          }

          // 提取配置
          if (node.arguments.length > 0) {
            const arg = node.arguments[0]
            if (arg.type === 'ObjectExpression') {
              pageOptionsList.push(extractOptionsFromObject(arg))
            }
          }
        }

        // 检查是否使用了别名调用
        if (
          definePageLocalName &&
          definePageLocalName !== 'definePage' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === definePageLocalName
        ) {
          // 提取配置
          if (node.arguments.length > 0) {
            const arg = node.arguments[0]
            if (arg.type === 'ObjectExpression') {
              pageOptionsList.push(extractOptionsFromObject(arg))
            }
          }
        }
      }
    })

    // 输出警告
    for (const warning of warnings) {
      console.warn(warning)
    }

    // 检查是否有多个 definePage 调用
    if (pageOptionsList.length > 1) {
      console.warn(
        `[vitarx-router] 警告: ${filePath}\n` +
          `  检测到 ${pageOptionsList.length} 个 definePage 调用，将合并配置。建议只使用一个 definePage。`
      )
    }

    // 合并多个配置（后面的覆盖前面的）
    if (pageOptionsList.length === 0) {
      return null
    }

    return pageOptionsList.reduce(
      (merged, options) => ({
        ...merged,
        ...options,
        meta: {
          ...merged.meta,
          ...options.meta
        }
      }),
      {} as PageOptions
    )
  } catch (error) {
    // AST 解析失败时返回 null
    console.warn(`[vitarx-router] 解析 definePage 失败: ${filePath}`, error)
    return null
  }
}

/**
 * 从 Babel ObjectExpression 节点提取配置选项
 *
 * @param node - Babel ObjectExpression 节点
 * @returns 页面配置选项
 */
function extractOptionsFromObject(node: BabelTypes.ObjectExpression): PageOptions {
  const result: PageOptions = {}

  for (const property of node.properties) {
    if (property.type !== 'ObjectProperty') continue

    const key = property.key
    if (key.type !== 'Identifier') continue

    const keyName = key.name

    if (keyName === 'name') {
      // 提取 name 属性
      const value = extractLiteralValue(property.value)
      if (typeof value === 'string') {
        result.name = value
      }
    } else if (keyName === 'meta') {
      // 提取 meta 属性
      if (property.value.type === 'ObjectExpression') {
        result.meta = extractMetaFromObject(property.value)
      }
    }
  }

  return result
}

/**
 * 从 Babel ObjectExpression 节点提取 meta 对象
 *
 * @param node - Babel ObjectExpression 节点
 * @returns 元数据对象
 */
function extractMetaFromObject(
  node: BabelTypes.ObjectExpression
): Record<string, string | boolean | number> {
  const meta: Record<string, string | boolean | number> = {}

  for (const property of node.properties) {
    if (property.type !== 'ObjectProperty') continue

    const key = property.key
    if (key.type !== 'Identifier') continue

    const value = extractLiteralValue(property.value)
    if (value !== null) {
      meta[key.name] = value as string | boolean | number
    }
  }

  return meta
}

/**
 * 从 Babel 节点提取字面量值
 *
 * 支持提取字符串、布尔值和数字类型的字面量。
 *
 * @param node - Babel 节点
 * @returns 字面量值，无法提取时返回 null
 */
function extractLiteralValue(node: BabelTypes.Node): string | boolean | number | null {
  switch (node.type) {
    case 'StringLiteral':
      return node.value
    case 'BooleanLiteral':
      return node.value
    case 'NumericLiteral':
      return node.value
    case 'TemplateLiteral':
      // 简单模板字面量（无插值）
      if (node.expressions.length === 0 && node.quasis.length === 1) {
        return node.quasis[0].value.cooked || node.quasis[0].value.raw
      }
      return null
    default:
      return null
  }
}

/**
 * 从路由路径中提取动态参数名称
 *
 * @param routePath - 路由路径，如 '/user/{id}'
 * @returns 参数名称数组
 *
 * @example
 * ```typescript
 * extractParamsFromPath('/user')           // => []
 * extractParamsFromPath('/user/{id}')      // => ['id']
 * extractParamsFromPath('/post/{category}/{slug}') // => ['category', 'slug']
 * ```
 */
export function extractParamsFromPath(routePath: string): string[] {
  const params: string[] = []
  const paramRegex = /\{(\w+)}/g
  let match

  while ((match = paramRegex.exec(routePath)) !== null) {
    params.push(match[1])
  }

  return params
}
