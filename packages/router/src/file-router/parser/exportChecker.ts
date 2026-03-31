/**
 * @fileoverview 导出检测模块
 *
 * 检测文件是否具有有效的默认导出函数组件。
 * 用于验证页面文件是否可以作为路由组件。
 */
import type * as BabelTypes from '@babel/types'
import fs from 'node:fs'
import { parseCode, babelTraverse } from '../utils/babelUtils.js'

/** 需要进行默认导出检测的文件扩展名 */
const CHECK_EXPORT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

/**
 * 默认导出检测结果
 */
export interface DefaultExportCheckResult {
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
 * 变量声明类型
 */
type VariableType = 'function' | 'arrow' | 'class' | 'unknown'

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
): object {
  return {
    VariableDeclarator(nodePath: any) {
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
    FunctionDeclaration(nodePath: any) {
      const { node } = nodePath
      if (node.id) {
        variableDeclarations.set(node.id.name, 'function')
      }
    },
    ClassDeclaration(nodePath: any) {
      const { node } = nodePath
      if (node.id) {
        variableDeclarations.set(node.id.name, 'class')
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
  result: { hasDefaultExport: boolean; isFunction: boolean; exportName: string | null },
  variableDeclarations: Map<string, VariableType>
): object {
  return {
    ExportDefaultDeclaration(nodePath: any) {
      const { node } = nodePath
      result.hasDefaultExport = true

      const declaration = node.declaration

      switch (declaration.type) {
        case 'FunctionDeclaration':
        case 'FunctionExpression':
          result.isFunction = true
          result.exportName = declaration.id?.name || null
          break

        case 'ArrowFunctionExpression':
          result.isFunction = true
          break

        case 'Identifier':
          result.exportName = declaration.name
          const varType = variableDeclarations.get(declaration.name)
          if (varType === 'function' || varType === 'arrow' || varType === 'class') {
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
  result: { hasDefaultExport: boolean; isFunction: boolean; exportName: string | null },
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
  } else if (declaration.type === 'ClassDeclaration') {
    if (declaration.id) {
      variableDeclarations.set(declaration.id.name, 'class')
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
          } else if (decl.init.type === 'ClassExpression') {
            variableDeclarations.set(name, 'class')
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
  result: { hasDefaultExport: boolean; isFunction: boolean; exportName: string | null },
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
        result.exportName = specifier.local.name

        const varType = variableDeclarations.get(specifier.local.name)
        if (varType === 'function' || varType === 'arrow' || varType === 'class') {
          result.isFunction = true
        }
      }
    }
  }
}

/**
 * 检测文件是否具有有效的默认导出函数组件
 *
 * @param filePath - 文件路径
 * @returns 检测结果
 */
export function checkDefaultExport(filePath: string): DefaultExportCheckResult {
  if (!fs.existsSync(filePath)) {
    return {
      hasDefaultExport: false,
      isFunctionOrClass: false,
      exportName: null,
      warning: `文件不存在: ${filePath}`
    }
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  if (!content.includes('export')) {
    return {
      hasDefaultExport: false,
      isFunctionOrClass: false,
      exportName: null,
      warning: `未检测到默认导出 (default export)，该文件将被跳过。请确保导出一个函数组件。`
    }
  }

  try {
    const ast = parseCode(content)

    const variableDeclarations = new Map<string, VariableType>()
    const result = {
      hasDefaultExport: false,
      isFunction: false,
      exportName: null as string | null
    }

    babelTraverse(ast, {
      ...createVariableDeclarationVisitor(variableDeclarations),
      ...createExportDeclarationVisitor(result, variableDeclarations)
    })

    let warning: string | null = null
    if (!result.hasDefaultExport) {
      warning = `未检测到默认导出 (default export)，该文件将被跳过。请确保导出一个函数组件。`
    } else if (!result.isFunction) {
      warning = `默认导出不是函数或类，该文件将被跳过。请确保导出一个有效的 React 组件。`
    }

    return {
      hasDefaultExport: result.hasDefaultExport,
      isFunctionOrClass: result.isFunction,
      exportName: result.exportName,
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
 * 检查文件扩展名是否需要导出检测
 *
 * @param ext - 文件扩展名
 * @returns 是否需要检测
 */
export function shouldCheckExport(ext: string): boolean {
  return CHECK_EXPORT_EXTENSIONS.includes(ext)
}
