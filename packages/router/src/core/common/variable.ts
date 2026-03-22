import { isPlainObject } from 'vitarx'
import { normalizePath } from '../shared/utils.js'
import type { ResolvedPattern, Route, RoutePath } from '../types/index.js'

/**
 * 判断path是否包含变量
 *
 * @example
 *  isVariable('/{id}') // true
 *  isVariable('/{id?}') // true
 *  isVariable('/home') // false
 * @param path
 */
export function isVariablePath(path: string): boolean {
  return /\{[^}]+}/.test(path)
}

/**
 * 提取路径中的所有变量定义
 *
 * @param path - 路径
 * @returns 变量定义数组，包含名称和是否可选
 */
export function extractVariables(path: string): Array<{ name: string; optional: boolean }> {
  const variables: Array<{ name: string; optional: boolean }> = []
  const regex = /\{([^}?]+)(\?)?}/g
  let match
  while ((match = regex.exec(path)) !== null) {
    variables.push({
      name: match[1],
      optional: !!match[2]
    })
  }
  return variables
}

/**
 * 验证别名路径的变量是否与主路径一致
 *
 * 规则：
 * - 变量名称必须完全一致
 * - 变量的可选性必须一致
 * - 变量数量必须一致
 *
 * @param mainPattern - 主路径的 pattern
 * @param aliasPath - 别名路径
 * @returns 验证通过返回 true，否则返回 false
 */
export function validateAliasVariables(
  mainPattern: ResolvedPattern[] | undefined,
  aliasPath: string
): boolean {
  const aliasVariables = extractVariables(aliasPath)

  if (!mainPattern || mainPattern.length === 0) {
    return aliasVariables.length === 0
  }

  if (aliasVariables.length !== mainPattern.length) {
    return false
  }

  const mainVarMap = new Map(mainPattern.map(p => [p.name, p.optional]))
  for (const aliasVar of aliasVariables) {
    const mainOptional = mainVarMap.get(aliasVar.name)
    if (mainOptional === undefined) {
      return false
    }
    if (mainOptional !== aliasVar.optional) {
      return false
    }
  }

  return true
}

/**
 * 获取路径中的可选变量数量
 *
 * @param path - 路径
 * @return {number} - 可选变量数量
 */
export function optionalVariableCount(path: string): number {
  // 去除路径中的所有空格
  const pathWithoutSpaces = path.replace(/\s+/g, '')

  // 匹配形如 {name?} 的可选变量
  const regex = /\{[\w-]+\?}/g

  // 提取所有符合可选变量规则的部分
  const matches = pathWithoutSpaces.match(regex)

  // 如果匹配到的部分存在，则返回数量，否则返回 0
  return matches ? matches.length : 0
}

/**
 * 将参数合并到路由路径中
 *
 * @example
 * mergePathVariable('/user/{id}', { id: 1 }) // '/user/1'
 * mergePathVariable('/user/{id?}', {}) // '/user'
 */
export function mergePathVariable(
  path: RoutePath,
  params: Record<string, string | number>
): RoutePath {
  const fullPath = path.replace(/{([^}?]+)\??}/g, (_match, paramName) => {
    // 获取参数值
    const value = params[paramName]
    // 如果参数不存在，返回空字符串（处理可选参数）
    if (value === undefined || value === null) {
      return ''
    }
    // 转字符串并处理空格
    return String(value).replace(/\s+/g, '_')
  })

  // 使用 formatPath 处理可能出现的双斜杠 (如 /user//) 或首尾斜杠问题
  return normalizePath(fullPath)
}

/**
 * 合并两个路由模式对象
 *
 * @param p1 - 父级的pattern配置（Record格式）
 * @param p2 - 要合并的路由pattern输入
 * @returns {Record<string, RegExp>} - 合并后的路由模式对象
 */
export function mergePattern(p1?: Route['pattern'], p2?: Route['pattern']): Record<string, RegExp> {
  // 1. 初始化结果对象
  const result: Record<string, RegExp> = {}
  // 2. 先处理 p1，直接复制所有 pattern
  if (isPlainObject(p1)) {
    for (const name in p1) {
      if (p1[name] instanceof RegExp) result[name] = p1[name]
    }
  }

  // 3. 处理 p2，直接覆盖 result 中对应的 regex
  // 如果 p1 中没有某个 name，这相当于新增；如果有，则是覆盖
  if (isPlainObject(p2)) {
    for (const name in p2) {
      if (p2[name] instanceof RegExp) result[name] = p2[name]
    }
  }

  return result
}
