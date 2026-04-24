/**
 * @fileoverview AST 值提取工具模块
 *
 * 从 Babel AST 节点中提取各种类型的值。
 * 用于解析 definePage 宏的配置参数。
 */
import type * as BabelTypes from '@babel/types'
import type { PageOptions, RedirectConfig } from '../types/index.js'

/**
 * 提取字面量值
 *
 * 从 AST 节点提取 JavaScript 字面量值。
 *
 * @param node - AST 节点
 * @returns 提取的值
 */
function extractAstLiteralValue(node: BabelTypes.Node): unknown {
  switch (node.type) {
    case 'StringLiteral':
      return node.value
    case 'NumericLiteral':
      return node.value
    case 'BooleanLiteral':
      return node.value
    case 'NullLiteral':
      return null
    case 'ArrayExpression':
      return node.elements.map(elem => (elem ? extractAstLiteralValue(elem) : null))
    case 'ObjectExpression': {
      const obj: Record<string, unknown> = {}
      for (const prop of node.properties) {
        if (prop.type !== 'ObjectProperty') continue
        const key = prop.key.type === 'Identifier' ? prop.key.name : null
        if (key) {
          obj[key] = extractAstLiteralValue(prop.value)
        }
      }
      return obj
    }
    default:
      return undefined
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
 * @returns meta 对象
 */
function extractMetaValue(node: BabelTypes.Node): Record<string, unknown> | undefined {
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

    meta[key] = extractAstLiteralValue(prop.value)
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
        const firstArg = args[0]
        const secondArg = args[1]

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
 * @returns 页面配置
 */
export function extractPageOptions(node: BabelTypes.ObjectExpression): PageOptions {
  const options: PageOptions = {}

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
        options.meta = extractMetaValue(prop.value)
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
