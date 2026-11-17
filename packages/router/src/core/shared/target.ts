/**
 * 职责：拆分导航路径中的查询参数和锚点；不匹配路由或修改调用方对象。
 */
import type { NavTarget, URLHash } from '../types/index.js'
import { parseQuery } from './utils.js'

/**
 * 标识已拆分的路径，避免解码后的路径分隔符再次参与 URL 解析。
 */
const resolvedPathKey = Symbol('resolvedPath')

/**
 * 创建内部已拆分目标；标记可随导航选项浅拷贝传递，不进入历史状态。
 *
 * @param target 已分别提供路径、查询参数和锚点的目标
 * @returns 带内部路径标记的新目标
 */
export function createResolvedPathTarget(target: NavTarget): NavTarget {
  const resolvedTarget = { ...target, [resolvedPathKey]: true }
  return resolvedTarget
}

/**
 * 规范化路径导航目标，显式字段优先于路径内的同名参数。
 *
 * @param target 原始导航目标
 * @returns 保留导航选项的规范化目标
 */
export function normalizePathTarget(target: NavTarget): NavTarget {
  if (resolvedPathKey in target) return target
  if (typeof target.index !== 'string' || !target.index.startsWith('/')) return target
  const hashIndex = target.index.indexOf('#')
  const pathAndQuery = hashIndex < 0 ? target.index : target.index.slice(0, hashIndex)
  const queryIndex = pathAndQuery.indexOf('?')
  if (hashIndex < 0 && queryIndex < 0) return target
  const index = queryIndex < 0 ? pathAndQuery : pathAndQuery.slice(0, queryIndex)
  const query = queryIndex < 0 ? {} : parseQuery(pathAndQuery.slice(queryIndex + 1))
  const hash: URLHash | '' =
    hashIndex < 0 ? '' : `#${decodeURIComponent(target.index.slice(hashIndex + 1))}`
  return { ...target, index, query: { ...query, ...target.query }, hash: target.hash ?? hash }
}
