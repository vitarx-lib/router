/**
 * @fileoverview AST 值提取工具模块
 *
 * 从 Babel AST 节点中提取各种类型的值。
 * 用于解析 definePage 宏的配置参数。
 */
import type * as BabelTypes from '@babel/types'
import type { PageOptions, RedirectConfig } from '../types/index.js'

/**
 * 不支持节点的警告信息
 */
export interface UnsupportedNodeWarning {
  /** 不支持的 AST 节点类型 */
  nodeType: string
  /** 属性访问路径，如 "meta.nav.items[0].label" */
  path: string
  /** 修复建议 */
  suggestion: string
}

/**
 * 不支持节点类型到修复建议的映射
 */
const UNSUPPORTED_NODE_SUGGESTIONS: Record<string, string> = {
  Identifier: '不支持变量引用，请使用字面量值。例如将 { name: myVar } 改为 { name: "value" }',
  MemberExpression:
    '不支持属性访问表达式，请使用字面量值。例如将 { api: config.url } 改为 { api: "https://example.com" }',
  CallExpression: '不支持函数调用，请使用字面量值。例如将 { id: genId() } 改为 { id: "static-id" }',
  ArrowFunctionExpression:
    '不支持箭头函数，请使用字面量值。例如将 { handler: () => {} } 改为 { handler: "handlerName" }',
  FunctionExpression:
    '不支持函数表达式，请使用字面量值。例如将 { handler: function() {} } 改为 { handler: "handlerName" }',
  NewExpression: '不支持 new 表达式（除 new RegExp 外），请使用字面量值',
  SpreadElement: '不支持展开运算符，请显式列出所有属性',
  ConditionalExpression:
    '不支持三元表达式，请使用字面量值。例如将 { val: cond ? "a" : "b" } 改为 { val: "a" }',
  BinaryExpression: '不支持二元运算表达式，请使用字面量值。例如将 { val: 1 + 2 } 改为 { val: 3 }',
  LogicalExpression:
    '不支持逻辑运算表达式，请使用字面量值。例如将 { val: a || "default" } 改为 { val: "default" }',
  SequenceExpression: '不支持逗号表达式，请使用字面量值',
  AssignmentExpression: '不支持赋值表达式，请使用字面量值',
  UpdateExpression: '不支持更新表达式，请使用字面量值。例如将 { val: i++ } 改为 { val: 1 }',
  TaggedTemplateExpression: '不支持标签模板字符串，请使用普通字符串字面量',
  ClassExpression: '不支持类表达式，请使用字面量值',
  ObjectMethod: '不支持对象方法定义，请使用字面量值。例如将 { fn() {} } 改为 { fn: "methodName" }'
}

/**
 * 获取不支持节点的修复建议
 *
 * @param nodeType - AST 节点类型
 * @returns 修复建议
 */
function getSuggestion(nodeType: string): string {
  return (
    UNSUPPORTED_NODE_SUGGESTIONS[nodeType] ??
    `不支持 ${nodeType} 类型的表达式，definePage 配置仅支持静态字面量值（字符串、数字、布尔、null、对象、数组、正则、一元表达式、简单模板字符串）`
  )
}

/**
 * 提取字面量值
 *
 * 从 AST 节点提取 JavaScript 字面量值。
 * 遇到不支持的节点类型时，将警告信息收集到 warnings 数组中。
 *
 * @param node - AST 节点
 * @param currentPath - 当前属性访问路径
 * @param warnings - 警告收集器
 * @returns 提取的值
 */
function extractAstLiteralValue(
  node: BabelTypes.Node,
  currentPath: string,
  warnings: UnsupportedNodeWarning[]
): unknown {
  switch (node.type) {
    case 'StringLiteral':
      return node.value
    case 'NumericLiteral':
      return node.value
    case 'BooleanLiteral':
      return node.value
    case 'NullLiteral':
      return null
    case 'RegExpLiteral':
      return new RegExp(node.pattern, node.flags || '')
    case 'TemplateLiteral': {
      // 仅支持无表达式的简单模板字符串，如 `hello`
      if (node.quasis.length === 1 && node.expressions.length === 0) {
        return node.quasis[0].value.cooked
      }
      warnings.push({
        nodeType: node.type,
        path: currentPath,
        suggestion:
          '不支持带插值表达式的模板字符串，请使用纯字符串字面量。例如将 `Hello ${name}` 改为 "Hello World"'
      })
      return undefined
    }
    case 'UnaryExpression': {
      const arg = extractAstLiteralValue(node.argument, currentPath, warnings)
      if (arg === undefined || arg === null) return undefined
      switch (node.operator) {
        case '-':
          return -arg as number
        case '+':
          return +(arg as number)
        case '!':
          return !(arg as boolean)
        case '~':
          return ~(arg as number)
        case 'void':
          return undefined
        default:
          warnings.push({
            nodeType: node.type,
            path: currentPath,
            suggestion: `不支持 "${node.operator}" 一元运算符，仅支持 -, +, !, ~, void`
          })
          return undefined
      }
    }
    case 'ArrayExpression':
      return node.elements.map((elem, index) =>
        elem ? extractAstLiteralValue(elem, `${currentPath}[${index}]`, warnings) : null
      )
    case 'ObjectExpression': {
      const obj: Record<string, unknown> = {}
      for (const prop of node.properties) {
        if (prop.type === 'ObjectMethod') {
          warnings.push({
            nodeType: 'ObjectMethod',
            path: currentPath,
            suggestion: getSuggestion('ObjectMethod')
          })
          continue
        }
        if (prop.type !== 'ObjectProperty') continue
        const key =
          prop.key.type === 'Identifier'
            ? prop.key.name
            : prop.key.type === 'StringLiteral'
              ? prop.key.value
              : null
        if (key) {
          obj[key] = extractAstLiteralValue(prop.value, `${currentPath}.${key}`, warnings)
        }
      }
      return obj
    }
    default: {
      warnings.push({
        nodeType: node.type,
        path: currentPath,
        suggestion: getSuggestion(node.type)
      })
      return undefined
    }
  }
}

/**
 * 提取字符串记录
 *
 * 从对象表达式节点提取键值对为字符串的对象。
 *
 * @param node - 对象表达式节点
 * @returns 字符串记录
 */
function extractStringRecord(node: BabelTypes.ObjectExpression): Record<string, string> {
  const record: Record<string, string> = {}

  for (const prop of node.properties) {
    if (prop.type !== 'ObjectProperty') continue

    const key =
      prop.key.type === 'Identifier'
        ? prop.key.name
        : prop.key.type === 'StringLiteral'
          ? prop.key.value
          : null
    if (!key) continue

    if (prop.value.type === 'StringLiteral') {
      record[key] = prop.value.value
    }
  }

  return record
}

/**
 * 提取 meta 值
 *
 * @param node - AST 节点
 * @param currentPath - 当前属性访问路径
 * @param warnings - 警告收集器
 * @returns meta 对象
 */
function extractMetaValue(
  node: BabelTypes.Node,
  currentPath: string,
  warnings: UnsupportedNodeWarning[]
): Record<string, unknown> | undefined {
  if (node.type !== 'ObjectExpression') return undefined

  const meta: Record<string, unknown> = {}

  for (const prop of node.properties) {
    if (prop.type !== 'ObjectProperty') continue

    const key =
      prop.key.type === 'Identifier'
        ? prop.key.name
        : prop.key.type === 'StringLiteral'
          ? prop.key.value
          : null
    if (!key) continue

    meta[key] = extractAstLiteralValue(prop.value, `${currentPath}.${key}`, warnings)
  }

  return meta
}

/**
 * 提取 pattern 值
 *
 * 从对象表达式节点提取正则表达式模式。
 *
 * @param node - AST 节点
 * @returns pattern 对象
 */
function extractPatternValue(node: BabelTypes.Node): Record<string, RegExp> | undefined {
  if (node.type !== 'ObjectExpression') return undefined

  const pattern: Record<string, RegExp> = {}

  for (const prop of node.properties) {
    if (prop.type !== 'ObjectProperty') continue

    const key =
      prop.key.type === 'Identifier'
        ? prop.key.name
        : prop.key.type === 'StringLiteral'
          ? prop.key.value
          : null
    if (!key) continue

    const value = prop.value
    const regex = extractRegExp(value)

    if (regex) {
      pattern[key] = regex
    }
  }

  return pattern
}

/**
 * 从 AST 节点提取正则表达式
 *
 * @param node - AST 节点
 * @returns 正则表达式或 null
 */
function extractRegExp(node: BabelTypes.Node): RegExp | null {
  if (node.type === 'RegExpLiteral') {
    return new RegExp(node.pattern, node.flags || '')
  }

  if (node.type === 'NewExpression') {
    if (node.callee.type === 'Identifier' && node.callee.name === 'RegExp') {
      const args = node.arguments
      if (args.length >= 1) {
        const firstArg = args.at(0)!
        const secondArg = args.at(1)!

        let patternStr: string | null = null
        let flags = ''

        if (firstArg.type === 'StringLiteral') {
          patternStr = firstArg.value
        } else if (firstArg.type === 'TemplateLiteral') {
          if (firstArg.quasis.length === 1 && firstArg.expressions.length === 0) {
            patternStr = firstArg.quasis[0].value.raw
          }
        } else if (firstArg.type === 'RegExpLiteral') {
          patternStr = firstArg.pattern
          flags = firstArg.flags || ''
        }

        if (patternStr) {
          if (secondArg && secondArg.type === 'StringLiteral') {
            flags = secondArg.value
          }
          return new RegExp(patternStr, flags)
        }
      }
    }
  }

  return null
}

/**
 * 提取 redirect 值
 *
 * @param node - AST 节点
 * @returns 重定向配置
 */
function extractRedirectValue(node: BabelTypes.Node): string | RedirectConfig | undefined {
  if (node.type === 'StringLiteral') {
    return node.value
  }

  if (node.type === 'ObjectExpression') {
    const config: Partial<RedirectConfig> = {}

    for (const prop of node.properties) {
      if (prop.type !== 'ObjectProperty') continue

      const key =
        prop.key.type === 'Identifier'
          ? prop.key.name
          : prop.key.type === 'StringLiteral'
            ? prop.key.value
            : null
      if (!key) continue

      if (key === 'index' && prop.value.type === 'StringLiteral') {
        config.index = prop.value.value
      } else if (key === 'query' && prop.value.type === 'ObjectExpression') {
        config.query = extractStringRecord(prop.value)
      } else if (key === 'params' && prop.value.type === 'ObjectExpression') {
        config.params = extractStringRecord(prop.value)
      }
    }

    if (config.index) {
      return config as RedirectConfig
    }
  }

  return undefined
}

/**
 * 提取 alias 值
 *
 * @param node - AST 节点
 * @returns 别名配置
 */
function extractAliasValue(node: BabelTypes.Node): string | string[] | undefined {
  if (node.type === 'StringLiteral') {
    return node.value
  }

  if (node.type === 'ArrayExpression') {
    const aliases: string[] = []
    for (const elem of node.elements) {
      if (elem?.type === 'StringLiteral') {
        aliases.push(elem.value)
      }
    }
    return aliases.length > 0 ? aliases : undefined
  }

  return undefined
}

/**
 * 从对象表达式提取页面配置
 *
 * @param node - 对象表达式节点
 * @param warnings - 警告收集器（可选，不传则不收集警告）
 * @returns 页面配置和警告列表
 */
export function extractPageOptions(
  node: BabelTypes.ObjectExpression,
  warnings?: UnsupportedNodeWarning[]
): PageOptions {
  const options: PageOptions = {}
  const warnList = warnings ?? []

  for (const prop of node.properties) {
    if (prop.type !== 'ObjectProperty') continue

    const key =
      prop.key.type === 'Identifier'
        ? prop.key.name
        : prop.key.type === 'StringLiteral'
          ? prop.key.value
          : null
    if (!key) continue

    switch (key) {
      case 'name':
        if (prop.value.type === 'StringLiteral') {
          options.name = prop.value.value
        }
        break

      case 'meta':
        options.meta = extractMetaValue(prop.value, 'meta', warnList)
        break

      case 'pattern':
        options.pattern = extractPatternValue(prop.value)
        break

      case 'redirect':
        options.redirect = extractRedirectValue(prop.value)
        break

      case 'alias':
        options.alias = extractAliasValue(prop.value)
        break
    }
  }

  return options
}
