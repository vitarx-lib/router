import type { HashStr, LazyLoad, Route, RouteGroup, RoutePath, RouteTarget } from './type.js'
import type { LazyLoader, WidgetType } from 'vitarx'

export const LAZY_LOADER_SYMBOL = Symbol('LazyLoader')
export type LAZY_LOADER_SYMBOL = typeof LAZY_LOADER_SYMBOL

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
 * 判断 path 是否包含可选变量
 *
 * @example
 *  isOptionalVariablePath('/{id?}') // true
 *  isOptionalVariablePath('/{id}') // false
 *  isOptionalVariablePath('/*') // false
 * @param path
 */
export function isOptionalVariablePath(path: string): boolean {
  return /\{[^}?]+\?}/.test(path)
}

/**
 * 判断路由是否具有子路由
 *
 * @param route
 */
export function isRouteGroup(route: Route): route is RouteGroup {
  return 'children' in route && route.children !== undefined && route.children.length > 0
}

/**
 * 生成动态路由匹配正则
 *
 * @param {string} path - 路径字符串
 * @param {Record<string, any>} pattern - 自定义的正则规则集合
 * @param {boolean} strict - 是否严格匹配
 * @return { {regex: RegExp length: number; isOptional: boolean} } - 返回动态匹配的正则表达式
 */
export function createDynamicPattern(
  path: string,
  pattern: Record<string, any>,
  strict: boolean
): { regex: RegExp; length: number; isOptional: boolean } {
  let optional = false
  // 处理变量路径段
  const processVariable = (
    varName: string,
    isOptional: boolean,
    isLastSegment?: boolean
  ): string => {
    const regex = pattern[varName]
    // 如果 `pattern` 中没有该变量的正则表达式，使用默认规则
    if (!regex) {
      pattern[varName] = /[^/]+/
    } else if (!(regex instanceof RegExp)) {
      console.warn(
        `[Vitarx.Router][WARN]：${path} 动态路径${varName}变量的自定义正则表达式必须是 RegExp 类型`
      )
      pattern[varName] = /[^/]+/
    }

    // 如果是可选的且是路径的最后一段，使用 `(?:...)` 包裹正则
    if (isOptional) {
      optional = true
      if (!isLastSegment) {
        throw new Error(
          `[Vitarx.Router][ERROR]：动态路径 ${path} 中，可选变量 ${varName} 必须是路径的最后一段`
        )
      }
      return `(?:(${pattern[varName].source}))?`
    }
    // 如果是必填的或非最后一段可选变量，使用捕获组
    return `(${pattern[varName].source})`
  }

  const processedPath = path
    // 将 `{var?}` 替换为可选的捕获组，检查它是否在路径的最后部分
    .replace(/{([^}?]+)\?}/g, (_, varName) =>
      processVariable(varName, true, path.endsWith(`{${varName}?}`))
    )
    // 将 `{var}` 替换为必填捕获组
    .replace(/{([^}]+)}/g, (_, varName) => processVariable(varName, false))
    // 转义斜杠
    .replace(/\//g, '\\/')
    // 末尾斜杠可选
    .replace(/\/?$/, '\/?')

  // 根据 strict 参数决定是否忽略大小写
  const flags = strict ? '' : 'i'
  // 段长
  const segments = path.replace(/^\/|\/$/g, '').split('/').length
  return {
    regex: new RegExp(`^${processedPath}$`, flags),
    length: segments,
    isOptional: optional
  }
}

/**
 * 格式化path
 *
 * @param {string} path - 路径字符串
 * @return {string} - 格式化后的路径字符串
 */
export function formatPath(path: string): RoutePath {
  if (path === '/') return path
  // 重复的// 替换为/ 去除结尾/
  return `/${path}`.replace(/\/+/g, '/').replace(/\s+/g, '') as RoutePath
}

/**
 * 生成路由路径
 *
 * @param {string} path - 路径字符串
 * @param {Record<string, string>} params - 路径参数对象
 */
export function generateRoutePath(path: string, params: Record<string, string>): RoutePath {
  const oldPath = path
  // 处理必填参数和可选参数
  path = path.replace(/{([^}]+)\?*}/g, (match, paramName) => {
    // 判断是否为可选参数
    const isOptional = match.includes('?')

    // 如果是可选参数并且 params 中没有对应值，跳过替换
    if (isOptional && params[paramName] === undefined) {
      return '' // 返回空字符串，跳过可选参数
    }

    // 如果是必填参数且 params 中没有对应值，抛出错误
    if (!isOptional && params[paramName] === undefined) {
      throw new TypeError(
        `[Vitarx.Router.generateRoutePath] 访问路由${oldPath}时缺少参数：${paramName}`
      )
    }

    // 返回对应的参数值
    return String(params[paramName])
  })

  return path as RoutePath
}

/**
 * ## 标记延迟加载
 *
 * 由于直接定义`() => import('./xxx.js')`会导致类型与函数式组件冲突，
 * 在未执行函数之前难以有效判断其类型，所以这里使用Symbol标记懒加载器。
 *
 * @example
 * lazy(() => import('./xxx.js'))
 *
 * @template T - WidgetType
 * @param {LazyLoader<T>} lazyLoader - 函数返回的import即是惰性加载器
 */
export function lazy<T extends WidgetType>(lazyLoader: LazyLoader<T>): LazyLoad<T> {
  ;(lazyLoader as any)[LAZY_LOADER_SYMBOL] = true
  return lazyLoader as LazyLoad<T>
}

/**
 * ## 判断一个函数是否为延迟加载器
 *
 * @param lazyLoader
 * @return {boolean}
 */
export function isLazyLoad(lazyLoader: any): lazyLoader is LazyLoad<WidgetType> {
  return typeof lazyLoader === 'function' && lazyLoader[LAZY_LOADER_SYMBOL]
}

/**
 * 格式化hash
 *
 * @param {any} hash - hash
 * @param {true} addHashPrefix - 添加#前缀
 * @return {string} - 格式化后的hash带有#
 */
export function formatHash(hash: any, addHashPrefix: true): `#${string}` | ''

/**
 * 格式化hash
 *
 * @param {any} hash - hash
 * @param {false} addHashPrefix - 去除#前缀
 * @return {string} - 格式化后的hash，不带#前缀
 */
export function formatHash(hash: any, addHashPrefix: false): string
export function formatHash(hash: any, addHashPrefix: boolean): string {
  if (typeof hash !== 'string') return ''
  // 如果 hash 有值且不以 # 开头，添加 # 前缀
  if (!hash) return ''
  hash = hash.trim()
  if (addHashPrefix) {
    return hash.startsWith('#') ? hash : `#${hash}`
  } else {
    return hash.startsWith('#') ? hash.slice(1) : hash
  }
}

/**
 * 将 query 字符串转为对象
 *
 * @param {string} queryString - 查询字符串（如 ?key1=value1&key2=value2）
 * @return {Record<string, string>} - 转换后的对象
 */
export function queryStringToObject(queryString: string): Record<string, string> {
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
export function objectToQueryString(obj: Record<string, string>): `?${string}` | '' {
  const queryString = new URLSearchParams(obj).toString()
  // 如果对象为空或没有任何有效查询参数，返回空字符串
  return queryString ? `?${queryString}` : ''
}

/**
 * 创建一个唯一id生成器函数，用于生成唯一的字符串。
 * 优化：防止在同一毫秒内生成相同的ID。
 */
export function createUniqueIdGenerator(): () => string {
  let counter = 0 // 计数器封装在闭包内
  let lastTimestamp = 0 // 上次生成 ID 时的时间戳

  return function unique_id() {
    const timestamp = Math.floor(Date.now() / 1000) // 获取当前时间戳

    // 如果当前时间戳和上次生成 ID 的时间戳相同，则递增 counter
    if (timestamp === lastTimestamp) {
      counter++
    } else {
      counter = 0 // 如果时间戳变化，重置 counter
      lastTimestamp = timestamp // 更新上次生成 ID 时的时间戳
    }

    const counterStr = counter.toString().padStart(6, '0')
    return `${timestamp}${counterStr}` // 组合时间戳和计数器生成唯一ID
  }
}

/**
 * 从 URL 对象中提取 path、hash 和 query
 *
 * @param {URL} url - 当前的 URL 对象
 * @param {string} mode - 路由模式 ('path' 或 'hash')
 * @param {string} base - 路由的根路径
 * @returns {object} - 包含 path、hash 和 query 的对象
 */
export function urlToRouteTarget(
  url: URL | Location,
  mode: 'path' | 'hash',
  base: `/${string}`
): MakeRequired<RouteTarget, 'query' | 'hash'> {
  let path = decodeURIComponent(url.pathname) as RoutePath
  let hash = decodeURIComponent(url.hash) as HashStr
  let query: Record<string, string>
  if (mode === 'path') {
    query = queryStringToObject(url.search)
    // 去除 basePath
    if (path.startsWith(base)) {
      path = formatPath(path.slice(base.length))
    } else {
      // 使用 pathname 来获取 path
      path = formatPath(path) // 去除结尾/
    }
    return { index: path, hash, query }
  }
  if (hash.includes('#')) {
    // 使用 hash 来获取 path 和 hash
    const hashPart = hash.slice(1) // 去掉前缀 #
    const [fullPath, anchor] = hashPart.split('#') // 分离路径和锚点
    // 分离 path 和查询参数
    const [pathInHash, queryString] = fullPath.split('?')
    path = formatPath(pathInHash || '') as RoutePath // 提取并格式化路径
    hash = anchor ? `#${anchor}` : ''
    // 提取查询参数
    query = queryStringToObject(queryString || '') // 安全处理无查询参数的情况
  } else {
    path = base as RoutePath
    query = queryStringToObject(url.search)
  }
  return { index: path, hash, query }
}

/**
 * 浅对比两个变量是否一致
 *
 * @param var1
 * @param var2
 */
export function shallowEqual(var1: any, var2: any): boolean {
  if (Object.is(var1, var2)) return true // 精确比较两个值是否相同（处理 NaN 等特殊情况）

  // 如果不是对象或其中一个为 null，则直接返回 false
  if (typeof var1 !== 'object' || typeof var2 !== 'object' || var1 === null || var2 === null) {
    return false
  }

  const keys1 = Reflect.ownKeys(var1)
  const keys2 = Reflect.ownKeys(var2)

  if (keys1.length !== keys2.length) return false // 键数量不同

  // 检查每个键是否存在且值相等
  for (const key of keys1) {
    if (
      !Object.prototype.hasOwnProperty.call(var2, key) ||
      !Object.is(var1[key], var2[key]) // 使用 Object.is 处理精确相等
    ) {
      return false
    }
  }

  return true // 所有键和值都相等
}

/**
 * 根据路由表生成路由索引
 *
 * 该函数提供给node脚本使用，生成对应的`RoutePath`和`RouteName`类型，优化类型推断
 *
 * @param {Route[]} routes - 路由表
 * @return {{ paths: string[], names: string[] }} - 路由索引对象，包含所有路由路径和名称
 */
export function generateRouteIndex(routes: Route[]): { paths: string[]; names: string[] } {
  const paths: string[] = []
  const names: string[] = []

  // 递归遍历路由，拼接路径
  function traverse(route: Route, parentPath: string = '') {
    // 如果是路由组，拼接路径并继续遍历子路由
    const fullPath = formatPath(parentPath ? `${parentPath}/${route.path}` : route.path)

    // 如果有widget，记录路径
    if (route.widget) {
      paths.push(fullPath)
    }
    // 如果有name，记录name
    if (route.name) {
      names.push(route.name)
    }
    // 如果有子路由，递归遍历
    if (route.children && route.children.length > 0) {
      route.children.forEach(childRoute => traverse(childRoute, fullPath))
    }
  }

  // 遍历所有的根路由
  routes.forEach(route => traverse(route))
  return {
    paths,
    names
  }
}
