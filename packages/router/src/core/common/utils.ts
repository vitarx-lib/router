import { type AnyCallback, isDeepEqual, isPlainObject, isString } from 'vitarx'
import { normalizePath, parseQuery } from '../shared/utils.js'
import type {
  GuardResult,
  NavTarget,
  RouteIndex,
  RouteLocation,
  RoutePath,
  URLHash,
  URLQuery
} from '../types/index.js'

/**
 * 检查给定的值是否为一个合法的导航配置对象
 *
 * @param val 要检查的未知类型值
 * @returns {boolean} 如果值是一个导航目标对象则返回true，否则返回false
 */
export function hasValidNavTarget(val: unknown): val is NavTarget {
  // 首先检查值是否是一个普通对象
  // 然后检查该对象是否包含 'index' 属性
  return isPlainObject(val) && 'index' in val && hasValidRouteIndex(val.index)
}

/**
 * 检查给定的值是否为有效的路由索引
 *
 * @param val - 需要检查的值，类型为unknown
 * @returns {boolean} 返回一个布尔值，表示值是否为有效的路由索引
 * 同时使用类型谓词(val is RouteIndex)来缩小类型范围
 */
export function hasValidRouteIndex(val: unknown): val is RouteIndex {
  // 检查值是否为字符串类型或者是否为symbol类型
  return isString(val) || typeof val === 'symbol'
}

/**
 * 判断两个路由位置对象是否只有 hash 不同
 *
 * @param route1
 * @param route2
 */
export function hasOnlyChangeHash(route1: RouteLocation, route2: RouteLocation) {
  return (
    route1.hash !== route2.hash &&
    route1.path === route2.path &&
    isDeepEqual(route1.query, route2.query)
  )
}

/**
 * 判断给定的索引是否为路径索引
 *
 * @param index - 要判断的索引
 * @returns {boolean} - 如果索引为路径索引则返回true，否则返回false
 */
export function hasValidPath(index: any): index is RoutePath {
  return isString(index) && index.startsWith('/')
}

/**
 * 移除路径字符串中的指定后缀
 * @param path - 原始路径字符串
 * @param suffix - 需要移除的后缀，必须以点号开头
 * @returns - 如果路径以指定后缀结尾，则返回去除后缀后的路径；否则返回原始路径
 */
export function removePathSuffix(path: string, suffix: `.${string}`): string {
  return path.endsWith(suffix) ? path.slice(0, -suffix.length) : path
}

/**
 * 辅助方法：解析 Hash 内容
 *
 * 输入: "/path?a=1&b=2#anchor"
 * 输出: { path: "/path", query: { a: "1" }, hash: "#anchor" }
 */
export function parseHashContent(hashContent: string): {
  path: RoutePath
  query: URLQuery
  hash: URLHash | ''
} {
  let path: RoutePath
  let query: URLQuery = {}
  let hash: URLHash | '' = ''

  // 1. 分离页面锚点 (#)
  // split 限制参数为 2，确保只分割第一个 #，防止路径中包含 # (少见但可能)
  const [pathAndQuery, anchor] = hashContent.split('#', 2)
  if (anchor) {
    hash = `#${decodeURIComponent(anchor)}`
  }

  // 2. 分离查询参数 (?)
  // 同样限制分割数为 2，防止路径中包含 ?
  const [pathname, queryString] = pathAndQuery.split('?', 2)

  // 3. 格式化路径
  path = normalizePath(pathname || '/')

  // 4. 解析查询参数
  if (queryString) {
    query = parseQuery(queryString)
  }

  return { path, query, hash }
}

/**
 * 处理守卫函数的执行结果
 * @private
 */
export function processGuardResult(res: GuardResult): boolean | NavTarget | void {
  if (res === false) return false
  if ((res && isString(res)) || typeof res === 'symbol') {
    return { index: res }
  }
  if (hasValidNavTarget(res)) return res
  return true
}

/**
 * 解析导航目标
 *
 * @param index - 导航目标
 */
export function resolveNavTarget(index: NavTarget | RouteIndex | RouteLocation): NavTarget {
  if (isString(index) || typeof index === 'symbol') {
    return { index }
  }
  if (hasValidNavTarget(index)) {
    return index
  }
  if (isPlainObject(index) && index.path && index.matched) {
    return {
      index: index.matched.at(-1)?.name || index.path, // 使用最后一个匹配的路由名称，如果没有则使用路径
      params: index.params, // 路由参数
      query: index.query, // 查询参数
      hash: index.hash // 哈希值
    }
  }
  throw new Error('Invalid navigation target')
}

/**
 * 注册钩子函数工具
 *
 * @param hooks - 钩子函数存储对象
 * @param type - 钩子函数类型
 * @param hook - 钩子函数
 */
export function registerHookTool<T extends { [key: string]: any }>(
  hooks: T,
  type: keyof T,
  hook: AnyCallback
): void {
  const set = hooks[type]
  if (!set) {
    hooks[type] = new Set([hook]) as any as T[keyof T]
  } else {
    set.add(hook)
  }
}
