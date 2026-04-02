/**
 * @fileoverview definePage 宏模块
 *
 * 解析页面文件中的 definePage 宏调用，提取路由配置。
 *
 * definePage 作为全局宏使用，无需导入，因此只需移除调用语句。
 */

import type { GeneratorResult } from '@babel/generator'
import fs from 'node:fs'
import type { PageOptions } from '../types.js'
import { babelGenerate, babelTraverse, parseCode, warn } from '../utils/index.js'
import { extractPageOptions } from './astValueExtractor.js'

/**
 * 合并多个页面配置
 *
 * @param optionsList - 配置列表
 * @returns 合并后的配置
 */
function mergePageOptions(optionsList: PageOptions[]): PageOptions {
  const merged: PageOptions = {}

  // 遍历所有配置，按优先级合并
  for (const options of optionsList) {
    // 名称直接覆盖
    if (options.name) merged.name = options.name
    // meta 合并
    if (options.meta) merged.meta = { ...merged.meta, ...options.meta }
    // pattern 合并
    if (options.pattern) merged.pattern = { ...merged.pattern, ...options.pattern }
    // 重定向直接覆盖
    if (options.redirect) merged.redirect = options.redirect
    // 别名合并（支持字符串和数组形式）
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
 * @param filePath - 页面文件路径
 * @returns 解析出的页面配置，解析失败返回 null
 */
export function parseDefinePage(filePath: string): PageOptions | null {
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    return null
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  // 快速检查是否包含 definePage 调用
  if (!content.includes('definePage')) {
    return null
  }

  try {
    // 解析代码为 AST
    const ast = parseCode(content)
    const pageOptionsList: PageOptions[] = []

    // 遍历 AST 查找 definePage 调用
    babelTraverse(ast, {
      CallExpression(nodePath: any) {
        const { node } = nodePath

        // 检查是否是 definePage 调用
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'definePage') {
          return
        }

        // 检查参数是否为对象表达式
        const arg = node.arguments[0]
        if (!arg || arg.type !== 'ObjectExpression') {
          return
        }

        // 提取页面配置
        const options = extractPageOptions(arg)
        pageOptionsList.push(options)
      }
    })

    // 没有找到 definePage 调用
    if (pageOptionsList.length === 0) {
      return null
    }

    // 处理多个 definePage 调用的情况
    if (pageOptionsList.length > 1) {
      warn('检测到多个 definePage 调用，将合并所有配置', '建议每个文件只调用一次 definePage')
    }

    // 合并所有配置
    return mergePageOptions(pageOptionsList)
  } catch (e) {
    // 解析失败，返回 null
    warn('解析 definePage 失败', `${filePath}: ${e?.toString()}`)
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
  // 快速检查是否包含 definePage 调用
  if (!code.includes('definePage')) {
    return null
  }

  // 解析代码为 AST
  const ast = parseCode(code)

  let hasDefinePage = false

  // 遍历 AST 查找并移除 definePage 调用
  babelTraverse(ast, {
    CallExpression(nodePath: any) {
      const { node } = nodePath

      // 检查是否是 definePage 调用
      if (node.callee.type === 'Identifier' && node.callee.name === 'definePage') {
        hasDefinePage = true
        // 移除节点
        nodePath.remove()
      }
    }
  })

  // 没有找到 definePage 调用
  if (!hasDefinePage) return null

  // 生成转换后的代码
  return babelGenerate(ast, {
    retainLines: false,
    compact: false,
    sourceMaps: true,
    filename,
    sourceFileName: filename
  })
}
