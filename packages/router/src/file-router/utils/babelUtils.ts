/**
 * @fileoverview Babel 工具模块
 *
 * 提供 Babel AST 解析和遍历的工具函数封装。
 * 包含公共的 parser 配置，消除代码重复。
 */
import { parse } from '@babel/parser'
import generator from '@babel/generator'
import traverse, { type NodePath } from '@babel/traverse'
import type { ParserPlugin } from '@babel/parser'

export { type NodePath }

export const babelTraverse: typeof traverse =
  'default' in traverse ? (traverse.default as typeof traverse) : traverse

export const babelGenerate: typeof generator =
  'default' in generator ? (generator.default as typeof generator) : generator

/**
 * 公共 Babel Parser 插件配置
 *
 * 用于解析现代 JavaScript/TypeScript 代码，包括 JSX 和各种新语法特性。
 */
export const BABEL_PARSER_PLUGINS: ParserPlugin[] = [
  'jsx',
  'typescript',
  'topLevelAwait',
  'classProperties',
  'objectRestSpread',
  'dynamicImport'
]

/**
 * 解析代码为 AST
 *
 * 使用统一的配置解析 JavaScript/TypeScript 代码。
 *
 * @param code - 源代码字符串
 * @returns Babel AST 节点
 *
 * @example
 * ```typescript
 * const ast = parseCode(`
 *   import { definePage } from 'vitarx-router/auto-routes'
 *   definePage({ name: 'home' })
 * `)
 * ```
 */
export function parseCode(code: string) {
  return parse(code, {
    sourceType: 'module',
    plugins: BABEL_PARSER_PLUGINS
  })
}
