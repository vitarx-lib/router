import { isBool, isComponent, isDeepEqual, isFunction, isPlainObject, isString } from 'vitarx'
import { RouteManager } from '../router/manager.js'
import type {
  GuardResult,
  NavTarget,
  RouteIndex,
  RouteLocationRaw,
  RoutePath,
  RouterOptions,
  URLHash,
  URLMode,
  URLQuery
} from '../types/index.js'
import { normalizePath, parseQuery } from './shared.js'

/**
 * 检查给定的值是否是一个导航目标对象
 *
 * @param val 要检查的未知类型值
 * @returns {boolean} 如果值是一个导航目标对象则返回true，否则返回false
 */
export function isNavigateTarget(val: unknown): val is NavTarget {
  // 首先检查值是否是一个普通对象
  // 然后检查该对象是否包含'to'属性
  return isPlainObject(val) && 'to' in val
}

/**
 * 检查路由器配置选项的合法性
 * @param options 用户传入的 RouterOptions 对象
 * @throws {Error} 当选项不合法时抛出错误
 */
export function checkRouterOptions(options: RouterOptions): void {
  // 1. 检查 options 是否为对象
  if (typeof options !== 'object' || options === null) {
    throw new Error('[Router] Router options must be an object.')
  }

  // 2. 检查 routes 是否存在且为有效类型
  if (!('routes' in options) || options.routes === undefined) {
    throw new Error('[Router] "routes" is a required option.')
  }

  // 更新判断逻辑以匹配新的 RouteManager 命名
  if (!Array.isArray(options.routes) && !(options.routes instanceof RouteManager)) {
    throw new Error('[Router] "routes" must be an array or a RouteManager instance.')
  }

  // 3. 检查 mode 的值是否合法
  if ('mode' in options && options.mode !== undefined) {
    const validModes: URLMode[] = ['path', 'hash']
    if (!validModes.includes(options.mode)) {
      throw new Error(
        `[Router] "mode" must be one of: ${validModes.join(', ')}. Received "${options.mode}".`
      )
    }
  }

  // 4. 检查 base 的格式
  if ('base' in options && options.base !== undefined) {
    if (typeof options.base !== 'string') {
      throw new Error('[Router] "base" must be a string.')
    }
    if (!options.base.startsWith('/')) {
      throw new Error('[Router] "base" must start with a slash (/).')
    }
  }

  // 5. 检查 suffix 的格式
  if ('suffix' in options && options.suffix !== undefined) {
    if (typeof options.suffix !== 'string') {
      throw new Error('[Router] "suffix" must be a string.')
    }
    if (!options.suffix.startsWith('.')) {
      throw new Error('[Router] "suffix" must start with a dot (.).')
    }
    if (options.suffix === '.') {
      throw new Error(
        '[Router] "suffix" cannot be just a dot, please provide a valid extension like ".html".'
      )
    }
  }

  if ('props' in options && options.props !== undefined) {
    if (!isBool(options.props) && !isFunction(options.props)) {
      throw new Error('[Router] "props" must be a boolean or function.')
    }
  }

  // 6. 检查 scrollBehavior 的类型
  if ('scrollBehavior' in options && options.scrollBehavior !== undefined) {
    if (!isFunction(options.scrollBehavior)) {
      throw new Error('[Router] "scrollBehavior" must be a function.')
    }
  }

  // 7. 检查钩子函数的类型
  if ('beforeEach' in options && options.beforeEach !== undefined) {
    if (!isFunction(options.beforeEach) && !Array.isArray(options.beforeEach)) {
      throw new Error('[Router] "beforeEach" must be a function or an array of functions.')
    }
  }
  if ('afterEach' in options && options.afterEach !== undefined) {
    if (!isFunction(options.afterEach) && !Array.isArray(options.afterEach)) {
      throw new Error('[Router] "afterEach" must be a function or an array of functions.')
    }
  }
  if ('onNotFound' in options && options.onNotFound !== undefined) {
    if (!isFunction(options.onNotFound)) {
      throw new Error('[Router] "onNotFound" must be a function.')
    }
  }

  // 8. 检查 missing 组件的类型
  if ('missing' in options && options.missing !== undefined) {
    if (!isComponent(options.missing)) {
      throw new Error('[Router] "missing" must be a valid component.')
    }
  }
  if ('onError' in options && options.onError !== undefined) {
    if (!isFunction(options.onError)) {
      throw new Error('[Router] "onError" must be a function.')
    }
  }
}

/**
 * 判断两个路由位置对象是否只有 hash 不同
 *
 * @param route1
 * @param route2
 */
export function hasOnlyChangeHash(route1: RouteLocationRaw, route2: RouteLocationRaw) {
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
export function isPathIndex(index: RouteIndex): index is RoutePath {
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
    return { to: res }
  }
  if (isNavigateTarget(res)) return res
  return true
}
