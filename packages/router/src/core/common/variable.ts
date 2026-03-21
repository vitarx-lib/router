import { normalizePath } from '../shared/utils.js'
import type { RoutePath } from '../types/index.js'

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
