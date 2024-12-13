import type { LazyLoad, Route, RouteGroup, RoutePath } from './type.js'
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
  return `/${path}`.replace(/\s+/g, '').replace(/\/+/g, '/').replace(/\/$/, '') as RoutePath
}

/**
 * 生成路由路径
 *
 * @param {string} path - 路径字符串
 * @param {Record<string, string>} params - 路径参数对象
 */
export function generateRoutePath(path: string, params: Record<string, string>): string {
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

  return path
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
 * @param {boolean} addHashPrefix - 是否添加 # 前缀
 */
export function formatHash(hash: any, addHashPrefix: boolean): string {
  if (typeof hash !== 'string') return ''
  // 如果 hash 有值且不以 # 开头，添加 # 前缀
  if (!hash) return hash
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
export function objectToQueryString(obj: Record<string, string>): string {
  const queryString = new URLSearchParams(obj).toString()
  // 如果对象为空或没有任何有效查询参数，返回空字符串
  return queryString ? `?${queryString}` : ''
}
