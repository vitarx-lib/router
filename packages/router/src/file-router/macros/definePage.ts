/**
 * @fileoverview definePage 宏模块
 *
 * 解析页面文件中的 definePage 宏调用，提取路由配置。
 *
 * definePage 作为全局宏使用，无需导入，因此只需移除调用语句。
 */

import type { GeneratorResult } from '@babel/generator'
import type { NodePath } from '@babel/traverse'
import type { CallExpression } from '@babel/types'
import type { PageOptions, RedirectConfig } from '../types/index.js'
import { babelGenerate, babelTraverse, parseCode, warn } from '../utils/index.js'
import { extractPageOptions } from './astValueExtractor.js'

/**
 * 合并多个页面配置
 *
 * @param optionsList - 配置列表
 * @returns 合并后的配置
 */
export function mergePageOptions(optionsList: PageOptions[]): PageOptions {
  const merged: PageOptions = {}

  for (const options of optionsList) {
    if (options.name) merged.name = options.name
    if (options.meta) merged.meta = { ...merged.meta, ...options.meta }
    if (options.pattern) merged.pattern = { ...merged.pattern, ...options.pattern }
    if (options.redirect) merged.redirect = options.redirect
    if (options.alias) {
      if (!merged.alias) {
        merged.alias = options.alias
      } else {
        const existing = Array.isArray(merged.alias) ? merged.alias : [merged.alias]
        const incoming = Array.isArray(options.alias) ? options.alias : [options.alias]
        merged.alias = [...existing, ...incoming]
      }
    }
  }

  return merged
}

/**
 * 解析 definePage 宏配置
 *
 * definePage 作为全局宏使用，无需导入。
 * 直接查找代码中的 definePage 调用并提取配置。
 *
 * @param content - 源代码
 * @param filePath - 文件路径
 * @returns 解析出的页面配置，解析失败返回 null
 */
export function parseDefinePage(content: string, filePath: string): PageOptions | null {
  if (!content.includes('definePage')) {
    return null
  }

  try {
    const ast = parseCode(content)
    const routeOptionsList: PageOptions[] = []

    babelTraverse(ast, {
      CallExpression(nodePath: NodePath<CallExpression>) {
        const { node } = nodePath

        if (node.callee.type !== 'Identifier' || node.callee.name !== 'definePage') {
          return
        }

        const arg = node.arguments[0]
        if (!arg || arg.type !== 'ObjectExpression') {
          return
        }

        const options = extractPageOptions(arg)
        routeOptionsList.push(options)
      }
    })

    if (routeOptionsList.length === 0) {
      return null
    }

    if (routeOptionsList.length > 1) {
      warn(
        '检测到多个 definePage 调用，将合并所有配置，建议每个文件只调用一次 definePage',
        `in ${filePath}`
      )
    }

    return mergePageOptions(routeOptionsList)
  } catch (e) {
    warn('解析 definePage 失败', `${e instanceof Error ? e.message : String(e)} in ${filePath}`)
    return null
  }
}

/**
 * 移除 definePage 宏调用（仅在构建模式下）
 *
 * definePage 作为全局宏使用，无需导入。
 * 此函数仅移除 definePage 调用语句。
 *
 * @param code - 源代码
 * @param filename - 文件路径
 * @returns 转换后的代码，无需转换返回 null
 */
export function removeDefinePage(code: string, filename: string): GeneratorResult | null {
  if (!code.includes('definePage')) {
    return null
  }

  const ast = parseCode(code)

  let hasDefinePage = false

  babelTraverse(ast, {
    CallExpression(nodePath: NodePath<CallExpression>) {
      const { node } = nodePath

      if (node.callee.type === 'Identifier' && node.callee.name === 'definePage') {
        hasDefinePage = true
        nodePath.remove()
      }
    }
  })

  if (!hasDefinePage) return null

  return babelGenerate(ast, {
    retainLines: false,
    compact: false,
    sourceMaps: true,
    filename,
    sourceFileName: filename
  })
}

/** 普通 Record<string, string> 比较 */
function recordEqual(a?: PageOptions['meta'], b?: PageOptions['meta']): boolean {
  if (a === b) return true
  if (!a || !b) return false

  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    if (a[k] !== b[k]) return false
  }

  return true
}

/** RegExp 结构比较 */
function patternEqual(a?: PageOptions['pattern'], b?: PageOptions['pattern']): boolean {
  if (a === b) return true
  if (!a || !b) return false

  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    const ra = a[k]
    const rb = b[k]

    if (!rb) return false

    // 关键：比较正则内容 + flags
    if (ra.source !== rb.source || ra.flags !== rb.flags) {
      return false
    }
  }

  return true
}

/** redirect: string | Record */
function redirectEqual(a?: PageOptions['redirect'], b?: PageOptions['redirect']): boolean {
  if (a === b) return true
  if (!a || !b) return false

  const ta = typeof a
  const tb = typeof b

  // 类型不同，直接不等
  if (ta !== tb) return false

  // string
  if (ta === 'string') {
    return a === b
  }

  // RedirectConfig
  const ra = a as RedirectConfig
  const rb = b as RedirectConfig

  if (ra.index !== rb.index) return false

  if (!recordEqual(ra.query, rb.query)) return false
  return recordEqual(ra.params, rb.params)
}

/** alias: string | string[] */
function aliasEqual(a?: PageOptions['alias'], b?: PageOptions['alias']): boolean {
  if (a === b) return true
  if (!a || !b) return false

  const arrA = Array.isArray(a) ? a : [a]
  const arrB = Array.isArray(b) ? b : [b]

  const len = arrA.length
  if (len !== arrB.length) return false

  // ⚠️ 默认：顺序敏感（更安全，避免隐藏 bug）
  for (let i = 0; i < len; i++) {
    if (arrA[i] !== arrB[i]) return false
  }

  return true
}

/**
 * 判断两个页面配置是否相等
 *
 * @param a
 * @param b
 */
export function isEqualPageOptions(a?: PageOptions | null, b?: PageOptions | null): boolean {
  if (a === b) return true
  if (!a || !b) return false

  // name
  if (a.name !== b.name) return false

  // meta
  if (!recordEqual(a.meta, b.meta)) return false

  // pattern (RegExp)
  if (!patternEqual(a.pattern, b.pattern)) return false

  // redirect
  if (!redirectEqual(a.redirect, b.redirect)) return false

  // alias
  return aliasEqual(a.alias, b.alias)
}
