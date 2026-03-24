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
import { warn } from './logger.js'
import { applyNamingStrategyToName, applyNamingStrategyToPath } from './namingStrategy.js'
import type { NamingStrategy, PageOptions, ParsedPage, RedirectConfig } from './types.js'

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
 * 核心逻辑：
 * 1. 快速检查文件是否包含 'export' 关键字（性能优化）
 * 2. 使用 Babel 解析 AST
 * 3. 遍历 AST 收集变量声明、函数声明、类声明
 * 4. 检测 export default 声明类型
 * 5. 检测 export { xxx as default } 命名导出
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

  // 步骤1：快速检查是否包含 export default 关键字
  // 这是一个性能优化，避免对不包含导出的文件进行 AST 解析
  if (!content.includes('export')) {
    return {
      hasDefaultExport: false,
      isFunctionOrClass: false,
      exportName: null,
      warning: `未检测到默认导出 (default export)，该文件将被跳过。请确保导出一个函数组件。`
    }
  }

  try {
    // 步骤2：使用 Babel 解析 AST
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

    // 步骤3：存储声明信息，用于后续检测导出类型
    // 关键：需要先收集所有声明，才能判断 export default xxx 中的 xxx 是什么类型
    const namedExports = new Map<string, 'function' | 'class' | 'variable' | 'unknown'>()
    // 变量声明信息：存储变量名 -> 类型映射
    const variableDeclarations = new Map<string, 'function' | 'arrow' | 'class' | 'unknown'>()

    // 默认导出检测结果
    let hasDefaultExport = false
    let isFunctionOrClass = false
    let exportName: string | null = null

    // 步骤4：遍历 AST 收集信息
    babelTraverse(ast, {
      // 收集变量声明：const Component = () => {}
      VariableDeclarator(nodePath) {
        const { node } = nodePath
        if (node.id.type === 'Identifier') {
          const name = node.id.name
          if (node.init) {
            // 根据初始化表达式判断变量类型
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

      // 收集函数声明：function Component() {}
      FunctionDeclaration(nodePath) {
        const { node } = nodePath
        if (node.id) {
          variableDeclarations.set(node.id.name, 'function')
        }
      },

      // 收集类声明：class Component {}
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

        // 根据声明类型判断是否为有效的组件导出
        switch (declaration.type) {
          case 'FunctionDeclaration':
          case 'FunctionExpression':
            // export default function Component() {}
            isFunctionOrClass = true
            exportName = declaration.id?.name || null
            break

          case 'ArrowFunctionExpression':
            // export default () => {}
            isFunctionOrClass = true
            break

          case 'ClassDeclaration':
          case 'ClassExpression':
            // export default class Component {}
            isFunctionOrClass = true
            exportName = declaration.id?.name || null
            break

          case 'Identifier':
            // export default Component
            // 关键：需要检查标识符是否指向函数或类
            exportName = declaration.name
            const varType = variableDeclarations.get(declaration.name)
            if (varType === 'function' || varType === 'arrow' || varType === 'class') {
              isFunctionOrClass = true
            }
            break

          default:
            // 其他情况（如对象、字面量等）不是有效的组件
            break
        }
      },

      // 处理命名导出：export { Component as default }
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

        // 处理 export { Component as default }
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

    // 步骤5：构建警告信息
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
 * 核心流程：
 * 1. 解析命名视图（如 index@sidebar.tsx）
 * 2. 检测默认导出函数组件
 * 3. 解析文件名，提取路由名称和动态参数
 * 4. 构建路由路径
 * 5. 解析 definePage 宏配置
 *
 * 文件命名约定：
 * - `index.tsx` → 索引路由，路径为目录路径
 * - `[id].tsx` → 动态路由，路径包含参数 `{id}`
 * - `about.tsx` → 静态路由，路径为 `/about`
 * - `index@sidebar.tsx` → 命名视图，sidebar 视图
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录绝对路径
 * @param parentPath - 父级路径（用于嵌套路由）
 * @param namingStrategy - 命名策略，默认为 'kebab'
 * @param pathPrefix - 路由路径前缀，默认为 ''
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
 *
 * // 使用路径前缀
 * parsePageFile('/src/admin/home.tsx', '/src/admin', '', 'kebab', '/admin')
 * // => { path: '/admin/home', name: 'admin-home', ... }
 * ```
 */
export function parsePageFile(
  filePath: string,
  pagesDir: string,
  parentPath: string,
  namingStrategy: NamingStrategy = 'kebab',
  pathPrefix: string = ''
): ParsedPage | null {
  const fileName = path.basename(filePath)
  const ext = path.extname(fileName)
  const baseName = fileName.slice(0, -ext.length)

  // 步骤1：解析命名视图
  // 命名视图格式：filename@viewName.ext
  // 例如：index@sidebar.tsx → base: index, view: sidebar
  let viewName: string | null = null
  let baseWithoutView = baseName
  const viewSeparatorIndex = baseName.indexOf('@')
  if (viewSeparatorIndex > -1) {
    baseWithoutView = baseName.slice(0, viewSeparatorIndex)
    viewName = baseName.slice(viewSeparatorIndex + 1)
  }

  // 步骤2：检测默认导出函数组件
  // 只对 js/ts/jsx/tsx 文件进行检测
  // 其他文件类型（如 .md）可能需要第三方插件转换，跳过检测
  if (CHECK_EXPORT_EXTENSIONS.includes(ext)) {
    const exportCheck = checkDefaultExport(filePath)

    if (exportCheck.warning) {
      warn(`警告: ${filePath}\n  ${exportCheck.warning}`)
      return null
    }
  }

  // 步骤3：计算相对路径和目录路径
  const relativePath = path.relative(pagesDir, filePath)
  const dirPath = path.dirname(relativePath)

  // 判断是否为索引文件
  const isIndex = baseWithoutView === 'index'

  // 步骤4：解析文件名，提取路由名称和动态参数
  const { name: routeName, params, isDynamic } = parseFileName(baseWithoutView)

  // 步骤5：构建路由路径
  // 关键逻辑：
  // - 索引文件：路径为目录路径（如 users/index.tsx → /users）
  // - 非索引文件：路径为目录路径 + 文件名（如 users/profile.tsx → /users/profile）
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

  // 步骤5.1：应用路径前缀

  // 规则：
  //
  // 错误示例：pathPrefix='/admin', routePath='/home' → '/adminhome'
  // 正确示例：pathPrefix='/admin/', routePath='/home' → '/admin/home'
  // 自定义拼接符示例：pathPrefix='promos-', routePath='/black-friday' → '/promos-black-friday'
  // 正确示例：pathPrefix='/admin', routePath='/' → '/admin'
  pathPrefix = pathPrefix.trim() === '/' ? '' : pathPrefix.trim()
  if (pathPrefix) {
    const normalizedPrefix = pathPrefix.startsWith('/') ? pathPrefix : `/${pathPrefix}`
    if (routePath === '/') {
      routePath = normalizedPrefix.replace(/\/+$/, '')
    } else {
      // 去掉 routePath 开头的 /，然后直接拼接
      routePath = normalizedPrefix + routePath.slice(1)
    }
  }

  // 步骤6：解析 definePage 宏配置
  const pageOptions = parseDefinePage(filePath)

  // 步骤7：生成路由名称（用于编程式导航）
  const name = pageOptions?.name || generateRouteName(relativePath, baseWithoutView, pathPrefix)

  // 步骤8：应用命名策略转换 path 和 name
  const finalPath = applyNamingStrategyToPath(routePath, namingStrategy)
  const finalName = applyNamingStrategyToName(name, namingStrategy)

  return {
    path: finalPath,
    filePath,
    name: finalName,
    params,
    isIndex,
    isDynamic,
    children: [],
    meta: pageOptions?.meta,
    pattern: pageOptions?.pattern,
    customName: pageOptions?.name,
    parentPath,
    redirect: pageOptions?.redirect,
    alias: pageOptions?.alias,
    viewName
  }
}

/**
 * 解析文件名
 *
 * 核心逻辑：
 * 1. 使用正则匹配动态参数格式 [param] 或 [param?]
 * 2. 提取参数名称和是否可选
 * 3. 将 [id] 转换为 {id} 格式用于路由路径
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
    const paramName = dynamicMatch[1] // 参数名
    const isOptional = !!dynamicMatch[2] // 是否可选（?）
    params.push(paramName)
    // 将 [id] 转换为 {id} 格式，[param?] 转换为 {param?} 格式
    return { name: `{${paramName}${isOptional ? '?' : ''}}`, params, isDynamic }
  }

  return { name: fileName, params, isDynamic }
}

/**
 * 生成路由名称
 *
 * 核心逻辑：
 * 1. 从前缀中提取名称段（去掉开头的 / 和结尾的 / 或 -）
 * 2. 从相对路径中提取目录段
 * 3. 添加文件名段（动态参数使用参数名）
 * 4. 用 '-' 连接所有段
 *
 * 特殊处理：
 * - 根目录的 index 文件：如果有前缀则使用前缀，否则使用 'index'
 * - 子目录的 index 文件：名称为前缀 + 目录路径
 * - 动态参数使用参数名而非完整格式
 *
 * @param relativePath - 相对于 pages 目录的路径
 * @param baseName - 文件名（不含扩展名）
 * @param pathPrefix - 路由路径前缀
 * @returns 路由名称
 *
 * @example
 * ```typescript
 * // 无前缀
 * generateRouteName('index.tsx', 'index', '')           // => 'index'
 * generateRouteName('user/index.tsx', 'index', '')      // => 'user'
 * generateRouteName('user/[id].tsx', '[id]', '')        // => 'user-id'
 *
 * // 有前缀
 * generateRouteName('index.tsx', 'index', '/admin/')    // => 'admin'
 * generateRouteName('user/index.tsx', 'index', '/admin/') // => 'admin-user'
 * generateRouteName('[id].tsx', '[id]', '/admin/')      // => 'admin-id'
 *
 * // 自定义前缀
 * generateRouteName('black-friday.tsx', 'black-friday', 'promos-') // => 'promos-black-friday'
 * ```
 */
function generateRouteName(
  relativePath: string,
  baseName: string,
  pathPrefix: string = ''
): string {
  const dirPath = path.dirname(relativePath)
  const segments: string[] = []

  // 步骤1：从前缀中提取名称段
  // 去掉开头的 / 和结尾的 / 或 -
  if (pathPrefix) {
    const prefixName = pathPrefix.replace(/^\/+/, '').replace(/[-\/]+$/, '')
    if (prefixName) {
      segments.push(prefixName)
    }
  }

  // 步骤2：添加目录路径段
  if (dirPath !== '.') {
    segments.push(...dirPath.replace(/\\/g, '/').split('/'))
  }

  // 步骤3：添加文件名段
  // 特殊处理：根目录的 index 文件
  if (baseName !== 'index' || dirPath === '.') {
    // 根目录的 index 文件：如果没有前缀，添加 'index'
    if (baseName === 'index' && dirPath === '.' && !pathPrefix) {
      segments.push('index')
    } else if (baseName !== 'index') {
      const dynamicMatch = baseName.match(DYNAMIC_PARAM_REGEX)
      if (dynamicMatch) {
        segments.push(dynamicMatch[1])
      } else {
        segments.push(baseName)
      }
    }
  }

  // 步骤4：用 '-' 连接所有段
  return segments.join('-')
}

/**
 * 解析 definePage 宏配置
 *
 * 核心流程：
 * 1. 快速检查文件是否包含 definePage 相关内容（性能优化）
 * 2. 使用 Babel 解析 AST
 * 3. 遍历 AST 查找 definePage 导入和调用
 * 4. 提取配置对象中的属性
 * 5. 合并多个 definePage 调用的配置
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

  // 步骤1：快速检查是否包含 definePage 相关内容
  // 这是一个性能优化，避免对不包含 definePage 的文件进行 AST 解析
  if (!content.includes('definePage') && !DEFINE_PAGE_SOURCES.some(src => content.includes(src))) {
    return null
  }

  try {
    // 步骤2：使用 Babel 解析 AST
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

    // 步骤3：初始化状态变量
    // 用于存储导入的 definePage 的本地名称（可能是别名）
    let definePageLocalName: string | null = null
    // 用于存储所有找到的 definePage 配置
    const pageOptionsList: PageOptions[] = []
    // 用于存储警告信息
    const warnings: string[] = []

    // 步骤4：遍历 AST 查找 definePage 导入和调用
    babelTraverse(ast, {
      // 步骤4.1：处理导入语句，确定 definePage 的本地名称
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
              // 记录本地名称（可能是别名，如 import { definePage as dp }）
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

      // 步骤4.2：处理函数调用，提取 definePage 配置
      CallExpression(nodePath) {
        const { node } = nodePath

        // 检查是否是 definePage 调用
        if (node.callee.type === 'Identifier' && node.callee.name === 'definePage') {
          // 检查是否已导入
          if (!definePageLocalName) {
            warnings.push(
              `警告: ${filePath}\n` +
                `  definePage 未从 'vitarx-router/auto-routes' 导入，请确保添加导入语句。`
            )
          } else if (definePageLocalName !== 'definePage') {
            // 如果使用了别名但调用的是原始名称
            warnings.push(
              `警告: ${filePath}\n` +
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

        // 检查是否使用了别名调用（如 dp({ ... })）
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

    // 步骤5：输出警告
    for (const warning of warnings) {
      warn(warning)
    }

    // 步骤6：检查是否有多个 definePage 调用
    if (pageOptionsList.length > 1) {
      warn(
        `警告: ${filePath}\n` +
          `  检测到 ${pageOptionsList.length} 个 definePage 调用，将合并配置。建议只使用一个 definePage。`
      )
    }

    // 步骤7：合并多个配置（后面的覆盖前面的）
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
    warn(`解析 definePage 失败: ${filePath}`, error?.toString())
    return null
  }
}

/**
 * 从 Babel ObjectExpression 节点提取配置选项
 *
 * 核心逻辑：
 * 1. 遍历对象的所有属性
 * 2. 根据属性名提取对应的值
 * 3. 支持的属性：name, meta, pattern, redirect
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

    // 提取 name 属性
    if (keyName === 'name') {
      const value = extractLiteralValue(property.value)
      if (typeof value === 'string') {
        result.name = value
      }
    }
    // 提取 meta 属性
    else if (keyName === 'meta') {
      if (property.value.type === 'ObjectExpression') {
        const meta = extractMetaFromObject(property.value)
        // 检查 meta 是否可序列化（不支持函数）
        if (isSerializable(meta)) {
          result.meta = meta
        } else {
          warn('definePage meta 必须是可序列化的对象，不支持函数或复杂对象')
        }
      }
    }
    // 提取 pattern 属性
    else if (keyName === 'pattern') {
      if (property.value.type === 'ObjectExpression') {
        result.pattern = extractPatternFromObject(property.value)
      }
    }
    // 提取 redirect 属性
    else if (keyName === 'redirect') {
      if (property.value.type === 'StringLiteral') {
        result.redirect = property.value.value
      } else if (property.value.type === 'ObjectExpression') {
        result.redirect = extractRedirectConfig(property.value)
      }
    }
    // 提取 alias 属性
    else if (keyName === 'alias') {
      if (property.value.type === 'StringLiteral') {
        result.alias = property.value.value
      } else if (property.value.type === 'ArrayExpression') {
        const aliases: string[] = []
        for (const element of property.value.elements) {
          if (element?.type === 'StringLiteral') {
            aliases.push(element.value)
          }
        }
        if (aliases.length > 0) {
          result.alias = aliases
        }
      }
    }
  }

  return result
}

/**
 * 提取重定向配置对象
 *
 * 支持的属性：
 * - index: 目标路由索引
 * - query: 查询参数对象
 * - params: 路由参数对象
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
        config.params = extractParamsRecord(property.value) as Record<string, string>
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
 *
 * 可序列化的类型：
 * - null, undefined
 * - 基本类型（string, number, boolean）
 * - RegExp, Date
 * - 数组（所有元素可序列化）
 * - 对象（所有属性值可序列化）
 *
 * 不可序列化的类型：
 * - 函数
 * - 包含函数的对象或数组
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
 * - new RegExp(template)：`new RegExp(\`^\\d+$\`)`
 *
 * @param node - Babel 节点
 * @returns 正则表达式对象，无法提取时返回 null
 */
function extractRegExpValue(node: BabelTypes.Node): RegExp | null {
  // 情况1：正则字面量 /pattern/flags
  if (node.type === 'RegExpLiteral') {
    try {
      return new RegExp(node.pattern, node.flags || '')
    } catch {
      return null
    }
  }

  // 情况2：new RegExp(...) 调用
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
 * 支持提取以下类型的字面量：
 * - StringLiteral：字符串字面量
 * - BooleanLiteral：布尔字面量
 * - NumericLiteral：数字字面量
 * - TemplateLiteral：简单模板字面量（无插值）
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
      // 简单模板字面量（无插值表达式）
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
 * 用于从已生成的路由路径中提取参数名称列表。
 * 参数格式为 {paramName}。
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
