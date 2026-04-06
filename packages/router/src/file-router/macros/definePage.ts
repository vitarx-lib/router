/**
 * @fileoverview definePage 宏模块
 *
 * 解析页面文件中的 definePage 宏调用，提取路由配置。
 *
 * definePage 作为全局宏使用，无需导入，因此只需移除调用语句。
 */

import type { GeneratorResult } from '@babel/generator'
import type { FileReader, PageOptions } from '../types.js'
import { babelGenerate, babelTraverse, parseCode, warn } from '../utils/index.js'
import { readFileContent } from '../utils/fileReader.js'
import { extractPageOptions } from './astValueExtractor.js'

/**
 * 合并多个页面配置
 *
 * @param optionsList - 配置列表
 * @returns 合并后的配置
 */
function mergePageOptions(optionsList: PageOptions[]): PageOptions {
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
 * 从代码内容解析 definePage 配置
 *
 * @param content - 代码内容
 * @returns 解析出的页面配置，解析失败返回 null
 */
function parseDefinePageFromContent(content: string): PageOptions | null {
  if (!content.includes('definePage')) {
    return null
  }

  try {
    const ast = parseCode(content)
    const pageOptionsList: PageOptions[] = []

    babelTraverse(ast, {
      CallExpression(nodePath: any) {
        const { node } = nodePath

        if (node.callee.type !== 'Identifier' || node.callee.name !== 'definePage') {
          return
        }

        const arg = node.arguments[0]
        if (!arg || arg.type !== 'ObjectExpression') {
          return
        }

        const options = extractPageOptions(arg)
        pageOptionsList.push(options)
      }
    })

    if (pageOptionsList.length === 0) {
      return null
    }

    if (pageOptionsList.length > 1) {
      warn('检测到多个 definePage 调用，将合并所有配置', '建议每个文件只调用一次 definePage')
    }

    return mergePageOptions(pageOptionsList)
  } catch (e) {
    warn('解析 definePage 失败', `${e?.toString()}`)
    return null
  }
}

/**
 * 解析 definePage 宏配置
 *
 * definePage 作为全局宏使用，无需导入。
 * 直接查找代码中的 definePage 调用并提取配置。
 *
 * @param filePath - 页面文件路径
 * @param pagesDir - 页面目录路径
 * @param fileReader - 可选的自定义文件读取函数
 * @returns 解析出的页面配置，解析失败返回 null
 */
export async function parseDefinePage(
  filePath: string,
  pagesDir: string,
  fileReader?: FileReader
): Promise<PageOptions | null> {
  try {
    const content = await readFileContent(filePath, pagesDir, fileReader)
    return parseDefinePageFromContent(content)
  } catch {
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
    CallExpression(nodePath: any) {
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
