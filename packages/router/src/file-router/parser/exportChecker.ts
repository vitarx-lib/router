/**
 * @fileoverview 导出检测模块
 *
 * 检测文件是否具有有效的默认导出函数组件。
 * 用于验证页面文件是否可以作为路由组件。
 */
import type { NodePath, TraverseOptions } from '@babel/traverse'
import type * as BabelTypes from '@babel/types'
import { babelTraverse, debug, parseCode, warn } from '../utils/index.js'

/**
 * 变量声明类型
 */
type VariableType = 'function' | 'arrow' | 'unknown'

/**
 * 收集变量声明
 *
 * 遍历 AST 收集所有变量声明的类型信息。
 *
 * @param variableDeclarations - 变量声明映射
 * @returns traverse visitor 对象
 */
function createVariableDeclarationVisitor(
  variableDeclarations: Map<string, VariableType>
): TraverseOptions {
  return {
    VariableDeclarator(nodePath: NodePath<BabelTypes.VariableDeclarator>) {
      const { node } = nodePath
      if (node.id.type === 'Identifier') {
        const name = node.id.name
        if (node.init) {
          if (node.init.type === 'ArrowFunctionExpression') {
            variableDeclarations.set(name, 'arrow')
          } else if (node.init.type === 'FunctionExpression') {
            variableDeclarations.set(name, 'function')
          } else {
            variableDeclarations.set(name, 'unknown')
          }
        }
      }
    },
    FunctionDeclaration(nodePath: NodePath<BabelTypes.FunctionDeclaration>) {
      const { node } = nodePath
      if (node.id) {
        variableDeclarations.set(node.id.name, 'function')
      }
    }
  }
}

/**
 * 创建导出声明 visitor
 *
 * @param result - 检测结果对象
 * @param variableDeclarations - 变量声明映射
 * @returns traverse visitor 对象
 */
function createExportDeclarationVisitor(
  result: { hasDefaultExport: boolean; isFunction: boolean },
  variableDeclarations: Map<string, VariableType>
): TraverseOptions {
  return {
    ExportDefaultDeclaration(nodePath: any) {
      const { node } = nodePath
      result.hasDefaultExport = true

      const declaration = node.declaration

      switch (declaration.type) {
        case 'FunctionDeclaration':
        case 'FunctionExpression':
          result.isFunction = true
          break

        case 'ArrowFunctionExpression':
          result.isFunction = true
          break

        case 'Identifier':
          const varType = variableDeclarations.get(declaration.name)
          if (varType === 'function' || varType === 'arrow') {
            result.isFunction = true
          }
          break
      }
    },
    ExportNamedDeclaration(nodePath: any) {
      const { node } = nodePath
      processNamedExportDeclaration(node, result, variableDeclarations)
    }
  }
}

/**
 * 处理命名导出声明
 *
 * @param node - 命名导出节点
 * @param result - 检测结果
 * @param variableDeclarations - 变量声明映射
 */
function processNamedExportDeclaration(
  node: BabelTypes.ExportNamedDeclaration,
  result: { hasDefaultExport: boolean; isFunction: boolean },
  variableDeclarations: Map<string, VariableType>
): void {
  if (node.declaration) {
    processNamedExportDeclarationNode(node.declaration, variableDeclarations)
  }

  if (node.specifiers) {
    processExportSpecifiers(node.specifiers, result, variableDeclarations)
  }
}

/**
 * 处理命名导出声明节点
 *
 * @param declaration - 声明节点
 * @param variableDeclarations - 变量声明映射
 */
function processNamedExportDeclarationNode(
  declaration: BabelTypes.Declaration,
  variableDeclarations: Map<string, VariableType>
): void {
  if (declaration.type === 'FunctionDeclaration') {
    if (declaration.id) {
      variableDeclarations.set(declaration.id.name, 'function')
    }
  } else if (declaration.type === 'VariableDeclaration') {
    for (const decl of declaration.declarations) {
      if (decl.id.type === 'Identifier') {
        const name = decl.id.name
        if (decl.init) {
          if (decl.init.type === 'ArrowFunctionExpression') {
            variableDeclarations.set(name, 'function')
          } else if (decl.init.type === 'FunctionExpression') {
            variableDeclarations.set(name, 'function')
          }
        }
      }
    }
  }
}

/**
 * 处理导出说明符
 *
 * @param specifiers - 导出说明符数组
 * @param result - 检测结果
 * @param variableDeclarations - 变量声明映射
 */
function processExportSpecifiers(
  specifiers: readonly (
    | BabelTypes.ExportDefaultSpecifier
    | BabelTypes.ExportNamespaceSpecifier
    | BabelTypes.ExportSpecifier
  )[],
  result: { hasDefaultExport: boolean; isFunction: boolean },
  variableDeclarations: Map<string, VariableType>
): void {
  for (const specifier of specifiers) {
    if (specifier.type === 'ExportSpecifier') {
      const exportedName =
        specifier.exported.type === 'Identifier'
          ? specifier.exported.name
          : specifier.exported.value

      if (exportedName === 'default') {
        result.hasDefaultExport = true

        const varType = variableDeclarations.get(specifier.local.name)
        if (varType === 'function' || varType === 'arrow') {
          result.isFunction = true
        }
      }
    }
  }
}

/**
 * 检测文件是否具有有效的默认导出函数组件
 *
 * @param content - 文件内容
 * @param file - 文件路径
 * @returns {boolean} 检测结果
 */
export function checkDefaultExport(content: string, file: string): boolean {
  // 快速检测，避免对文件进行复杂的解析
  if (!content.includes('export default')) {
    debug(
      `⚠️ 未检测到默认导出 (default export)，该文件可能被跳过。请确保导出一个函数组件。`,
      `in ${file}`
    )
    return false
  }

  // 解析文件内容为 AST 进行精确检查
  const ast = parseCode(content)

  const variableDeclarations = new Map<string, VariableType>()
  const result = {
    hasDefaultExport: false,
    isFunction: false
  }

  try {
    babelTraverse(ast, {
      ...createVariableDeclarationVisitor(variableDeclarations),
      ...createExportDeclarationVisitor(result, variableDeclarations),
      CallExpression(nodePath) {
        const { node } = nodePath
        if (node.callee.type === 'Identifier' && node.callee.name === 'console') {
          nodePath.remove()
        }
      }
    })

    let debugInfo: string | null = null
    if (!result.hasDefaultExport) {
      debugInfo = `⚠️ 未检测到默认导出 (default export)，该文件可能被跳过。请确保导出一个函数组件。`
    } else if (!result.isFunction) {
      debugInfo = `⚠️ 默认导出的不是函数，该文件可能被跳过。请确保导出一个有效的函数组件。`
    }
    if (debugInfo) {
      debug(debugInfo, `in ${file}`)
      return false
    }
    return true
  } catch (e) {
    warn(`⚠️ 无法解析文件 ${file}`, `${e instanceof Error ? e.message : String(e)}`)
    return false
  }
}
