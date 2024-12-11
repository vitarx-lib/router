import type { Route, RouteGroup, RoutePath } from './type.js'

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
 *  isOptionalVariablePath('/home') // false
 * @param path
 */
export function isOptionalVariablePath(path: string): boolean {
  return /\/{[^}?]+\?}/.test(path)
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
