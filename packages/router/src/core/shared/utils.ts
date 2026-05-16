import { deepClone, type DeepReadonly, toRaw } from 'vitarx'
import type {
  NotFoundTarget,
  RouteLocation,
  RouteMetaData,
  RoutePath,
  RouteViewComponent
} from '../types/index.js'

/**
 * 将 query 字符串转为对象
 *
 * @param {string} queryString - 查询字符串（如 ?key1=value1&key2=value2）
 * @return {Record<string, string>} - 转换后的对象
 */
export function parseQuery(queryString: string): Record<string, string> {
  queryString = decodeURIComponent(queryString)
  // 去除前导的 "?" 符号，分割为键值对
  const params = new URLSearchParams(
    queryString.startsWith('?') ? queryString.substring(1) : queryString
  )
  const obj: Record<string, string> = {}

  // 遍历每一对键值并添加到对象中
  params.forEach((value, key) => (obj[key] = value))

  return obj
}

/**
 * 将对象转换为 query 字符串
 *
 * @param {Record<string, string>} obj - 要转换的对象
 * @return {string} 转换后的查询字符串（如 ?key1=value1&key2=value2）
 */
export function stringifyQuery(obj: Record<string, string>): `?${string}` | '' {
  const queryString = new URLSearchParams(obj).toString()
  // 如果对象为空或没有任何有效查询参数，返回空字符串
  return queryString ? `?${queryString}` : ''
}

/**
 * 去除路径末尾的斜杠
 *
 * @example
 * removePathEndSlash('/foo/') // '/foo'
 * removePathEndSlash('/foo') // '/foo'
 *
 * @param {string} str - 路径字符串
 * @return {string} - 去除末尾斜杠后的路径字符串
 */
export function removeTrailingSlash<T extends string>(str: T): T {
  if (str === '/') return str
  return str.endsWith('/') ? (str.slice(0, -1) as T) : str
}

/**
 * 归一化path
 *
 * 去除所有空格、替换重复的斜杠
 *
 * @example
 * normalizePath('/  foo') // '/foo'
 * normalizePath('/foo/') // '/foo/'
 * normalizePath('/foo/bar') // '/foo/bar'
 * normalizePath('foo/') // '/foo'
 * normalizePath('/foo/',true) // '/foo'
 *
 * @param {string} path - 路径字符串
 * @param {boolean} removeEndSlash - 是否去除尾随斜杠
 * @return {string} - 格式化后的路径字符串
 */
export function normalizePath(path: string, removeEndSlash: boolean = false): `/${string}` {
  // 去除所有空格 处理重复//
  let normalizedPath = `/${path.trim()}`.replace(/\s+/g, '').replace(/\/+/g, '/')
  if (removeEndSlash) {
    normalizedPath = removeTrailingSlash(normalizedPath)
  }
  // 去除尾随斜杠
  return normalizedPath as `/${string}`
}

/**
 * 克隆路由位置对象
 *
 * @param {RouteLocation} route - 要克隆的路由位置对象
 * @return {RouteLocation} - 克隆过后的对象
 */
export function cloneRouteLocation(
  route: RouteLocation | DeepReadonly<RouteLocation>
): RouteLocation {
  const { matched, ...rest } = toRaw(route)
  return Object.assign(deepClone(rest), { matched: Array.from(matched) })
}

/**
 * 创建未匹配路由的 RouteLocation 对象
 *
 * 用于在 onNotFound 钩子中快速创建一个可渲染的 RouteLocation，
 * 使路由匹配失败时仍能渲染指定组件（如 404 页面）。
 *
 * 该函数要求 target.index 必须为路径（以 `/` 开头），
 * 因为名称导航（name-based）匹配失败属于编程错误，应直接抛出异常，
 * 而非创建伪路由位置。
 *
 * @example
 * ```ts
 * // 在 onNotFound 钩子中使用
 * onNotFound(target) {
 *   return createMissingRoute(NotFoundPage, target, { title: '页面未找到' })
 * }
 * ```
 *
 * @param component - 未匹配时要渲染的组件
 * @param target - 用户的原始导航意图（index 必须为路径）
 * @param meta - 可选的自定义 meta 信息，默认为空对象
 * @returns {RouteLocation} 可在 onNotFound 钩子中直接返回的 RouteLocation
 */
export function createMissingRoute(
  component: RouteViewComponent,
  target: NotFoundTarget,
  meta?: RouteMetaData
): RouteLocation {
  const path = target.index as RoutePath
  const query = target.query ?? {}
  const hash = target.hash ?? ''
  const params = target.params ?? {}
  return {
    href: path,
    path,
    hash,
    params,
    query,
    meta: meta || {},
    matched: [{ path, isGroup: false, component: { default: component } }]
  }
}
