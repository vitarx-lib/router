import type {
  HashStr,
  LazyLoad,
  Route,
  RouteLocation,
  RouteNormalized,
  RoutePath,
  RouteTarget
} from './type.js'
import type { WidgetType } from 'vitarx'

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
 * 获取路径中的可选变量数量
 *
 * @param path - 路径
 * @return {number} - 可选变量数量
 */
export function optionalVariableCount(path: string): number {
  // 去除路径中的所有空格
  const pathWithoutSpaces = path.replace(/\s+/g, '')

  // 匹配形如 {varname?} 的可选变量
  const regex = /\{[\w-]+\?}/g

  // 提取所有符合可选变量规则的部分
  const matches = pathWithoutSpaces.match(regex)

  // 如果匹配到的部分存在，则返回数量，否则返回 0
  return matches ? matches.length : 0
}

/**
 * 判断路由是否具有子路由
 *
 * @param route
 */
export function isRouteGroup(route: Route): boolean {
  return 'children' in route && route.children !== undefined && route.children.length > 0
}

/**
 * 生成动态路由匹配正则
 *
 * @param {string} path - 路径字符串
 * @param {Record<string, any>} pattern - 自定义的正则规则集合
 * @param {boolean} strict - 是否严格匹配
 * @return { {regex: RegExp length: number; optional: number} } - 返回动态匹配的正则表达式
 */
export function createDynamicPattern(
  path: string,
  pattern: Record<string, any>,
  strict: boolean
): { regex: RegExp; length: number; optional: number } {
  let optional = 0
  // 处理变量路径段
  const processVariable = (varName: string, isOptional: boolean): string => {
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

    // 如果是可选的，使用 `(?:...)` 包裹正则
    if (isOptional) {
      optional++
      return `(?:(${pattern[varName].source}))?`
    } else if (optional) {
      throw new Error(
        `[Vitarx.Router][ERROR]：动态路径 ${path} 中，可选变量 ${varName} 后不能存在任何必填变量`
      )
    }
    // 如果是必填的或非最后一段可选变量，使用捕获组
    return `(${pattern[varName].source})`
  }

  const processedPath = path
    // 将 `{var?}` 替换为可选的捕获组，检查它是否在路径的最后部分
    .replace(/{([^}?]+)\?}/g, (_, varName) => processVariable(varName, true))
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
    optional
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
  return `/${path.trim()}`.replace(/\/+/g, '/').replace(/\s+/g, '') as RoutePath
}

/**
 * 合并路径参数
 *
 * @param {string} path - 路径字符串
 * @param {Record<string, string>} params - 路径参数对象
 */
export function mergePathParams(path: RoutePath, params: Record<string, string>): RoutePath {
  if (!isVariablePath(path)) return path
  const oldPath = path
  // 处理必填参数和可选参数
  path = path.replace(/{([^}]+)\?*}/g, (_match, paramName) => {
    // 判断是否为可选参数
    const isOptional = paramName.endsWith('?')
    if (isOptional) paramName = paramName.slice(0, -1)
    if (params[paramName] === undefined) {
      // 如果是可选参数并且 params 中没有对应值，跳过替换
      if (isOptional) return ''
      throw new TypeError(
        `[Vitarx.Router.mergePathParams] 访问路由${oldPath}时缺少参数：${paramName}`
      )
    }
    // 返回对应的参数值
    return String(params[paramName]).replace(/\s+/g, '_')
  }) as RoutePath
  return path
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
/**
 * 格式化hash
 *
 * @param hash
 * @param addHashPrefix
 */
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
 * 深度比较两个变量是否相等
 *
 * @param {any} var1 - 要比较的第一个变量
 * @param {any} var2 - 要比较的第二个变量
 * @returns {boolean} - 如果两个变量完全相等，则返回 true；否则返回 false
 */
export function deepEqual(var1: any, var2: any): boolean {
  // 精确比较两个值是否相同
  if (Object.is(var1, var2)) return true

  // 如果类型不相等或者有一个是 null，返回 false
  if (typeof var1 !== 'object' || typeof var2 !== 'object' || var1 === null || var2 === null) {
    return false
  }

  const keys1 = Reflect.ownKeys(var1)
  const keys2 = Reflect.ownKeys(var2)

  if (keys1.length !== keys2.length) return false // 键数量不同

  for (const key of keys1) {
    // 递归比较嵌套对象
    const value1 = var1[key]
    const value2 = var2[key]

    if (
      !Object.prototype.hasOwnProperty.call(var2, key) ||
      !deepEqual(value1, value2) // 对比基本类型
    ) {
      return false // 键值不一致，立即返回 false
    }
  }

  return true // 所有键和值一致
}

/**
 * 拆分路径和后缀
 *
 * @param path
 */
export function splitPathAndSuffix(path: string): { path: string; suffix: string } {
  const suffix = getPathSuffix(path)
  if (suffix) path = path.slice(0, -suffix.length)
  return {
    path,
    suffix
  }
}

/**
 * 获取路径后缀
 *
 * @param path
 * @return {string} 有则返回`.${string}`无则返回空字符串
 */
export function getPathSuffix(path: string): `.${string}` | '' {
  const match = path.match(/^(.*?)(\.[a-zA-Z0-9]+)$/)
  if (match) return match[2] as `.${string}`
  return ''
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

/**
 * 辅助判断是否为路由位置对象
 *
 * @param obj
 */
export function isRouteLocationTypeObject(obj: any): obj is RouteLocation {
  if (typeof obj !== 'object') return false
  if (obj === null) return false
  const keys: (keyof RouteLocation)[] = [
    'index',
    'fullPath',
    'path',
    'hash',
    'params',
    'query',
    'matched'
  ]
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) return false
  }
  return true
}

/**
 * 验证 widget 配置
 *
 * @param route
 * @private
 */
function validateWidget(route: Route): void {
  if (typeof route.widget === 'function') {
    // 函数式小部件处理
    route.widget = { default: route.widget }
  } else if (typeof route.widget === 'object' && route.widget !== null) {
    // 对象类型的小部件
    if (Object.keys(route.widget).length === 0) {
      route.widget = undefined
    } else {
      for (const k in route.widget) {
        if (typeof route.widget[k] !== 'function') {
          throw new TypeError(
            `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 widget 命名视图 ${k} 类型有误，它可以是函数式小部件、类小部件，亦或是一个惰性加载器。`
          )
        }
      }
    }
  } else {
    throw new TypeError(
      `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 widget 类型有误，它可以是函数式小部件、类小部件，亦或是一个惰性加载器。`
    )
  }
}

/**
 * 规范化路由对象
 *
 * @param route
 * @private
 */
export function normalizeRoute(route: Route): RouteNormalized {
  // 初始化必要的属性
  route.meta = route.meta || {}
  route.pattern = route.pattern || {}
  route.children = route.children || []
  // 验证 children 是否为数组
  if (!Array.isArray(route.children)) {
    throw new TypeError(
      `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置 children 类型错误，它必须是数组类型。`
    )
  }
  if (!route.path.trim()) {
    throw new TypeError(`[Vitarx.Router][TYPE_ERROR]：路由线路配置 path 不能为空`)
  }
  // 格式化路径
  route.path = formatPath(route.path)
  // 注入属性逻辑
  if ('injectProps' in route) {
    route.injectProps = true
  }
  // 处理 widget 配置
  if ('widget' in route) {
    validateWidget(route)
  } else {
    // 如果没有 widget 且没有子路由，则报错
    if (route.children.length === 0) {
      throw new TypeError(
        `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 widget 属性缺失，它可以是函数式小部件、类小部件，亦或是一个惰性加载器。`
      )
    }
    route.widget = undefined
  }

  return route as RouteNormalized
}
