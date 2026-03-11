/**
 * @fileoverview 页面解析模块
 *
 * 负责解析页面文件路径，提取路由信息，包括：
 * - 路由路径转换
 * - 动态参数识别
 * - definePage 宏解析（使用 Babel AST 解析）
 * - default 导出函数组件检测
 */
import { parse } from '@babel/parser'
import type * as BabelTypes from '@babel/types'
import fs from 'node:fs'
import path from 'node:path'
import { babelTraverse } from './babelUtils.js'
import type { PageOptions, ParsedPage, RedirectConfig } from './types.js'

/** 动态参数匹配正则，如 [id]、[slug]、[param?] */
const DYNAMIC_PARAM_REGEX = /^\[(.+?)(\?)?]$/

/** definePage 的导入来源 */
const DEFINE_PAGE_SOURCES = ['vitarx-router/auto-routes']

/** 需要进行默认导出检测的文件扩展名 */
const CHECK_EXPORT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

/**
 * 默认导出检测结果
 */
interface DefaultExportCheckResult {
  /** 是否有默认导出 */
  hasDefaultExport: boolean
  /** 默认导出是否为函数或类 */
  isFunctionOrClass: boolean
  /** 导出名称（如果有） */
  exportName: string | null
  /** 警告信息 */
  warning: string | null
}

/**
 * 检测文件是否具有有效的默认导出函数组件
 *
 * 支持检测以下导出语法：
 * - `export default function Component() {}` - 命名函数声明
 * - `export default function() {}` - 匿名函数声明
 * - `export default () => {}` - 箭头函数
 * - `export default class Component {}` - 类声明（类组件）
 * - `const Component = () => {}; export default Component` - 先声明再导出
 * - `export { Component as default }` - 命名导出为 default
 *
 * @param filePath - 文件路径
 * @returns 检测结果
 */
function checkDefaultExport(filePath: string): DefaultExportCheckResult {
  if (!fs.existsSync(filePath)) {
    return {
      hasDefaultExport: false,
      isFunctionOrClass: false,
      exportName: null,
      warning: `文件不存在: ${filePath}`
    }
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  // 快速检查是否包含 export default 关键字
  if (!content.includes('export')) {
    return {
      hasDefaultExport: false,
      isFunctionOrClass: false,
      exportName: null,
      warning: `未检测到默认导出 (default export)，该文件将被跳过。请确保导出一个函数组件。`
    }
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

    // 存储命名导出的变量信息
    const namedExports = new Map<string, 'function' | 'class' | 'variable' | 'unknown'>()
    // 存储变量声明信息
    const variableDeclarations = new Map<string, 'function' | 'arrow' | 'class' | 'unknown'>()
    // 默认导出检测结果
    let hasDefaultExport = false
    let isFunctionOrClass = false
    let exportName: string | null = null

    babelTraverse(ast, {
      // 收集变量声明
      VariableDeclarator(nodePath) {
        const { node } = nodePath
        if (node.id.type === 'Identifier') {
          const name = node.id.name
          if (node.init) {
            if (node.init.type === 'ArrowFunctionExpression') {
              variableDeclarations.set(name, 'arrow')
            } else if (node.init.type === 'FunctionExpression') {
              variableDeclarations.set(name, 'function')
            } else if (node.init.type === 'ClassExpression') {
              variableDeclarations.set(name, 'class')
            } else {
              variableDeclarations.set(name, 'unknown')
            }
          }
        }
      },

      // 收集函数声明
      FunctionDeclaration(nodePath) {
        const { node } = nodePath
        if (node.id) {
          variableDeclarations.set(node.id.name, 'function')
        }
      },

      // 收集类声明
      ClassDeclaration(nodePath) {
        const { node } = nodePath
        if (node.id) {
          variableDeclarations.set(node.id.name, 'class')
        }
      },

      // 处理 export default 声明
      ExportDefaultDeclaration(nodePath) {
        const { node } = nodePath
        hasDefaultExport = true

        const declaration = node.declaration

        switch (declaration.type) {
          case 'FunctionDeclaration':
          case 'FunctionExpression':
            isFunctionOrClass = true
            exportName = declaration.id?.name || null
            break

          case 'ArrowFunctionExpression':
            isFunctionOrClass = true
            break

          case 'ClassDeclaration':
          case 'ClassExpression':
            isFunctionOrClass = true
            exportName = declaration.id?.name || null
            break

          case 'Identifier':
            // export default Component
            // 检查标识符是否指向函数或类
            exportName = declaration.name
            const varType = variableDeclarations.get(declaration.name)
            if (varType === 'function' || varType === 'arrow' || varType === 'class') {
              isFunctionOrClass = true
            }
            break

          default:
            // 其他情况（如对象、字面量等）
            break
        }
      },

      // 处理命名导出
      ExportNamedDeclaration(nodePath) {
        const { node } = nodePath

        if (node.declaration) {
          // export function Component() {}
          // export class Component {}
          // export const Component = () => {}
          if (node.declaration.type === 'FunctionDeclaration') {
            if (node.declaration.id) {
              namedExports.set(node.declaration.id.name, 'function')
            }
          } else if (node.declaration.type === 'ClassDeclaration') {
            if (node.declaration.id) {
              namedExports.set(node.declaration.id.name, 'class')
            }
          } else if (node.declaration.type === 'VariableDeclaration') {
            for (const decl of node.declaration.declarations) {
              if (decl.id.type === 'Identifier') {
                const name = decl.id.name
                if (decl.init) {
                  if (decl.init.type === 'ArrowFunctionExpression') {
                    namedExports.set(name, 'function')
                  } else if (decl.init.type === 'FunctionExpression') {
                    namedExports.set(name, 'function')
                  } else if (decl.init.type === 'ClassExpression') {
                    namedExports.set(name, 'class')
                  } else {
                    namedExports.set(name, 'unknown')
                  }
                }
              }
            }
          }
        }

        // export { Component as default }
        if (node.specifiers) {
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ExportSpecifier') {
              const exportedName =
                specifier.exported.type === 'Identifier'
                  ? specifier.exported.name
                  : specifier.exported.value

              if (exportedName === 'default') {
                hasDefaultExport = true
                exportName = specifier.local.name

                // 检查导出的变量是否为函数或类
                const varType = variableDeclarations.get(specifier.local.name)
                if (varType === 'function' || varType === 'arrow' || varType === 'class') {
                  isFunctionOrClass = true
                }
              }
            }
          }
        }
      }
    })

    // 构建警告信息
    let warning: string | null = null
    if (!hasDefaultExport) {
      warning = `未检测到默认导出 (default export)，该文件将被跳过。请确保导出一个函数组件。`
    } else if (!isFunctionOrClass) {
      warning = `默认导出不是函数或类，该文件将被跳过。请确保导出一个有效的 React 组件。`
    }

    return {
      hasDefaultExport,
      isFunctionOrClass,
      exportName,
      warning
    }
  } catch (error) {
    return {
      hasDefaultExport: false,
      isFunctionOrClass: false,
      exportName: null,
      warning: `解析文件失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 解析页面文件
 *
 * 根据文件路径解析出路由配置信息，包括路径、名称、参数等。
 * 会检测文件是否具有有效的默认导出函数组件，如果没有则跳过该文件。
 *
 * 文件命名约定：
 * - `index.tsx` → 索引路由，路径为目录路径
 * - `[id].tsx` → 动态路由，路径包含参数 `{id}`
 * - `about.tsx` → 静态路由，路径为 `/about`
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录绝对路径
 * @param parentPath - 父级路径（用于嵌套路由）
 * @returns 解析后的页面信息，解析失败或无有效导出返回 null
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

  // 解析命名视图：index@aux.tsx -> base: index, view: aux
  let viewName: string | null = null
  let baseWithoutView = baseName
  const viewSeparatorIndex = baseName.indexOf('@')
  if (viewSeparatorIndex > -1) {
    baseWithoutView = baseName.slice(0, viewSeparatorIndex)
    viewName = baseName.slice(viewSeparatorIndex + 1)
  }

  // 只对 js/ts/jsx/tsx 文件进行默认导出检测
  // 其他文件类型（如 .md）可能需要第三方插件转换，跳过检测
  if (CHECK_EXPORT_EXTENSIONS.includes(ext)) {
    const exportCheck = checkDefaultExport(filePath)

    if (exportCheck.warning) {
      console.warn(`[vitarx-router] 警告: ${filePath}\n  ${exportCheck.warning}`)
      return null
    }
  }

  const relativePath = path.relative(pagesDir, filePath)
  const dirPath = path.dirname(relativePath)

  const isIndex = baseWithoutView === 'index'

  // 解析文件名，提取路由名称和动态参数
  const { name: routeName, params, isDynamic } = parseFileName(baseWithoutView)

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
  const name = generateRouteName(relativePath, baseWithoutView)

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
    pattern: pageOptions?.pattern,
    customName: pageOptions?.name,
    parentPath,
    redirect: pageOptions?.redirect,
    viewName
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
    const isOptional = !!dynamicMatch[2]
    params.push(paramName)
    // 将 [id] 转换为 {id} 格式，[param?] 转换为 {param?} 格式
    return { name: `{${paramName}${isOptional ? '?' : ''}}`, params, isDynamic }
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

  // 添加文件名段（根目录的 index 文件添加为 'index'）
  if (baseName !== 'index' || dirPath === '.') {
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

    babelTraverse(ast, {
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
        },
        pattern: {
          ...merged.pattern,
          ...options.pattern
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
      const value = extractLiteralValue(property.value)
      if (typeof value === 'string') {
        result.name = value
      }
    } else if (keyName === 'meta') {
      if (property.value.type === 'ObjectExpression') {
        const meta = extractMetaFromObject(property.value)
        // 检查 meta 是否可序列化
        if (isSerializable(meta)) {
          result.meta = meta
        } else {
          console.warn('[vitarx-router] definePage meta 必须是可序列化的对象，不支持函数或复杂对象')
        }
      }
    } else if (keyName === 'pattern') {
      if (property.value.type === 'ObjectExpression') {
        result.pattern = extractPatternFromObject(property.value)
      }
    } else if (keyName === 'redirect') {
      // 提取 redirect 属性
      if (property.value.type === 'StringLiteral') {
        result.redirect = property.value.value
      } else if (property.value.type === 'ObjectExpression') {
        result.redirect = extractRedirectConfig(property.value)
      }
    }
  }

  return result
}

/**
 * 提取重定向配置对象
 */
function extractRedirectConfig(node: BabelTypes.ObjectExpression): RedirectConfig {
  const config: RedirectConfig = { index: '' }

  for (const property of node.properties) {
    if (property.type !== 'ObjectProperty') continue

    const key = property.key
    if (key.type !== 'Identifier') continue

    const keyName = key.name

    if (keyName === 'index') {
      const value = extractLiteralValue(property.value)
      if (typeof value === 'string') {
        config.index = value
      }
    } else if (keyName === 'query') {
      if (property.value.type === 'ObjectExpression') {
        config.query = extractStringRecord(property.value)
      }
    } else if (keyName === 'params') {
      if (property.value.type === 'ObjectExpression') {
        config.params = extractParamsRecord(property.value)
      }
    }
  }

  return config
}

/**
 * 提取字符串键值对对象
 */
function extractStringRecord(node: BabelTypes.ObjectExpression): Record<string, string> {
  const result: Record<string, string> = {}
  for (const property of node.properties) {
    if (property.type !== 'ObjectProperty') continue
    const key = property.key
    if (key.type !== 'Identifier') continue
    const value = extractLiteralValue(property.value)
    if (typeof value === 'string') {
      result[key.name] = value
    }
  }
  return result
}

/**
 * 提取参数键值对对象
 */
function extractParamsRecord(node: BabelTypes.ObjectExpression): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  for (const property of node.properties) {
    if (property.type !== 'ObjectProperty') continue
    const key = property.key
    if (key.type !== 'Identifier') continue
    const value = extractLiteralValue(property.value)
    if (typeof value === 'string' || typeof value === 'number') {
      result[key.name] = value
    }
  }
  return result
}

/**
 * 检查对象是否可序列化
 */
function isSerializable(obj: unknown): boolean {
  if (obj === null || obj === undefined) return true
  if (typeof obj === 'function') return false
  if (typeof obj !== 'object') return true
  if (obj instanceof RegExp) return true
  if (obj instanceof Date) return true

  if (Array.isArray(obj)) {
    return obj.every(item => isSerializable(item))
  }

  return Object.values(obj).every(value => isSerializable(value))
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
 * 从 Babel ObjectExpression 节点提取 pattern 对象
 *
 * 支持两种正则表达式语法：
 * - 正则字面量：`/^\d+$/`
 * - new RegExp()：`new RegExp("^\\d+$")` 或 `new RegExp(/^\d+$/)`
 *
 * @param node - Babel ObjectExpression 节点
 * @returns pattern 对象，键为参数名，值为正则表达式
 */
function extractPatternFromObject(node: BabelTypes.ObjectExpression): Record<string, RegExp> {
  const pattern: Record<string, RegExp> = {}

  for (const property of node.properties) {
    if (property.type !== 'ObjectProperty') continue

    const key = property.key
    if (key.type !== 'Identifier') continue

    const regex = extractRegExpValue(property.value)
    if (regex !== null) {
      pattern[key.name] = regex
    }
  }

  return pattern
}

/**
 * 从 Babel 节点提取正则表达式值
 *
 * 支持以下语法：
 * - 正则字面量：`/^\d+$/`
 * - new RegExp(string)：`new RegExp("^\\d+$")`
 * - new RegExp(regex)：`new RegExp(/^\d+$/)`
 *
 * @param node - Babel 节点
 * @returns 正则表达式对象，无法提取时返回 null
 */
function extractRegExpValue(node: BabelTypes.Node): RegExp | null {
  // 正则字面量：/pattern/flags
  if (node.type === 'RegExpLiteral') {
    try {
      return new RegExp(node.pattern, node.flags || '')
    } catch {
      return null
    }
  }

  // new RegExp(...) 调用
  if (
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'RegExp'
  ) {
    const args = node.arguments
    if (args.length === 0) return null

    const firstArg = args[0]

    // new RegExp("/pattern/") - 字符串参数
    if (firstArg.type === 'StringLiteral') {
      try {
        const pattern = firstArg.value
        // 如果有第二个参数，作为 flags
        const flags = args.length > 1 && args[1].type === 'StringLiteral' ? args[1].value : ''
        return new RegExp(pattern, flags)
      } catch {
        return null
      }
    }

    // new RegExp(/pattern/) - 正则字面量参数
    if (firstArg.type === 'RegExpLiteral') {
      try {
        // 如果有第二个参数，作为新的 flags
        const flags =
          args.length > 1 && args[1].type === 'StringLiteral' ? args[1].value : firstArg.flags || ''
        return new RegExp(firstArg.pattern, flags)
      } catch {
        return null
      }
    }

    // new RegExp(templateLiteral) - 模板字面量参数
    if (
      firstArg.type === 'TemplateLiteral' &&
      firstArg.expressions.length === 0 &&
      firstArg.quasis.length === 1
    ) {
      try {
        const pattern = firstArg.quasis[0].value.cooked || firstArg.quasis[0].value.raw
        const flags = args.length > 1 && args[1].type === 'StringLiteral' ? args[1].value : ''
        return new RegExp(pattern, flags)
      } catch {
        return null
      }
    }
  }

  return null
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
