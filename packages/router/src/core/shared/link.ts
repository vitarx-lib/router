import { type Computed, computed, isPlainObject, isString } from 'vitarx'
import { NavState } from '../common/constant.js'
import { isExternalLink, isNavTarget, isRoutePath } from '../common/utils.js'
import type {
  NavigateResult,
  NavTarget,
  RouteIndex,
  RouteLocation,
  URLHash
} from '../types/index.js'
import { useRouter } from './inject.js'
import { cloneRouteLocation, parseQuery, removeTrailingSlash, stringifyQuery } from './utils.js'

type LinkToTarget<T extends RouteIndex = RouteIndex> = NavTarget<T> | T | string
export type LinkExactMatchMode = 'path' | 'href' | 'hash' | 'query'
export interface UseLinkOptions<T extends RouteIndex = RouteIndex> {
  /**
   * 要跳转的目标
   *
   * 可以是路由目标对象，也可以是路由索引
   */
  to: LinkToTarget<T>
  /**
   * 是否使用 `router.replace()` 而不是 `router.push()`。
   *
   * 优先级低于 `to.replace`
   *
   * @default false
   */
  replace?: boolean
  /**
   * 如果支持则使用 `document.startViewTransition()`。
   *
   * @default false
   */
  viewTransition?: boolean
  /**
   * 精确匹配模式
   *
   * - 'path'：精确匹配路径
   * - 'href'：精确匹配完整链接
   * - 'hash'：精确匹配路径和锚点
   * - 'query'：精确匹配路径和查询参数
   *
   * @default 'path'
   */
  exactMatchMode?: LinkExactMatchMode
}
export interface UseLinkReturn {
  /**
   * 链接的 `href` 属性值
   */
  href: Computed<string>
  /**
   * 匹配的路由信息
   */
  route: Computed<RouteLocation | null>
  /**
   * 是否匹配当前路由
   */
  isActive: Computed<boolean>
  /**
   * 是否精确匹配当前路由
   */
  isExactActive: Computed<boolean>
  /**
   * 跳转到目标路由
   *
   * @param [e] 点击事件
   */
  navigate: (e?: MouseEvent) => Promise<NavigateResult>
}

/**
 * 处理视图转换
 * @param callback
 */
async function handleTransition(callback: () => Promise<void>): Promise<void> {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') {
    await callback()
    return
  }
  const transition = document.startViewTransition(callback)
  await transition.finished
}
/**
 * 判断当前路径是否以目标路径为前缀（路径段级别匹配）
 *
 * 去除尾部斜杠后，判断 currentPath 是否等于 targetPath 或以 targetPath/ 开头，
 * 避免如 `/users-admin` 错误匹配 `/users` 的问题。
 *
 * @example
 * isPathPrefixMatch('/users/123', '/users') // true
 * isPathPrefixMatch('/users', '/users') // true
 * isPathPrefixMatch('/users-admin', '/users') // false
 * isPathPrefixMatch('/', '/') // true
 *
 * @param currentPath - 当前路由路径
 * @param targetPath - 目标路由路径
 * @returns 是否为前缀匹配
 */
export function isPathPrefixMatch(currentPath: string, targetPath: string): boolean {
  const current = removeTrailingSlash(currentPath)
  const target = removeTrailingSlash(targetPath)
  if (target === '/') return current.startsWith('/')
  return current === target || current.startsWith(target + '/')
}

/**
 * 判断当前路径是否与目标路径完全匹配
 *
 * 去除尾部斜杠后进行严格相等比较。
 *
 * @example
 * isPathExactMatch('/users', '/users') // true
 * isPathExactMatch('/users/', '/users') // true
 * isPathExactMatch('/users/123', '/users') // false
 *
 * @param currentPath - 当前路由路径
 * @param targetPath - 目标路由路径
 * @returns 是否为精确匹配
 */
export function isPathExactMatch(currentPath: string, targetPath: string): boolean {
  return removeTrailingSlash(currentPath) === removeTrailingSlash(targetPath)
}

/**
 * 创建一个链接助手，用于处理路由导航、生成链接属性及判断激活状态。
 *
 * @template T - 路由索引类型，扩展自 `RouteIndex`。
 * @param props - 链接配置选项。
 * @param props.to - 要跳转的目标，可以是路由目标对象、路由索引、带查询参数的路径字符串、哈希值或 HTTP/HTTPS 链接。
 * @param [props.replace] - 是否使用 `router.replace()` 而不是 `router.push()`。优先级低于 `to.replace`。默认为 `false`。
 * @param [props.viewTransition] - 如果支持则使用 `document.startViewTransition()` 进行视图过渡。默认为 `false`。
 * @param [props.exactMatchMode] - 精确匹配模式。可选值有：'path'、'href'、'hash'、'query'。默认为 'path'。
 * @returns 返回一个包含链接属性和导航方法的对象。
 * @returns {Computed<string>} returns.href - 链接的 `href` 属性值。
 * @returns {Computed<RouteLocation | null>} returns.route - 匹配的路由信息，如果未匹配则返回 `null`。
 * @returns {Computed<boolean>} returns.isActive - 指示当前路由是否与目标路由部分匹配（前缀匹配）。
 * @returns {Computed<boolean>} returns.isExactActive - 指示当前路由是否与目标路由完全匹配。
 * @returns {function} returns.navigate - 执行导航到目标路由的函数。接收可选的 `MouseEvent` 参数，阻止默认行为并执行跳转。
 */
export function useLink<T extends RouteIndex>(props: UseLinkOptions<T>): UseLinkReturn {
  const router = useRouter()

  /**
   * 计算属性：解析目标路由
   * @returns 返回解析后的路由位置对象，如果无效则返回 null
   */
  const route = computed((): RouteLocation | null => {
    const to = props.to
    let target: NavTarget | null = null

    // 验证目标类型
    if (isNavTarget(to)) {
      target = to
    } else if (isString(to)) {
      // 如果是 HTTP/HTTPS 链接则返回 null
      if (isExternalLink(to)) return null
      target = { index: to }
    } else if (typeof to === 'symbol') {
      target = { index: to }
    } else {
      return null
    }

    // 处理路由路径
    if (isString(target.index)) {
      // 兼容纯锚点连接跳转
      if (target.index.startsWith('#')) {
        const route = cloneRouteLocation(router.route)
        route.hash = target.index as URLHash
        route.href = router.buildUrl(route.path, route.query, route.hash)
        return route
      }
      // 解析片段标识符
      if (target.index.includes('#')) {
        const [index, hash] = target.index.split('#', 2)
        target.index = index
        target.hash = hash ? `#${hash}` : ''
      }
      // 解析查询参数
      if (target.index.includes('?')) {
        const [index, queryString] = target.index.split('?', 2)
        target.index = index
        target.query = parseQuery(queryString)
      }
    }

    return router.matchRoute(target)
  })

  /**
   * 计算属性：生成链接的 href 属性
   * @returns 返回路由的 href 或原始字符串，默认返回 'javascript:void(0)'
   */
  const href = computed(() => {
    if (route.value?.href) return route.value.href
    if (isPlainObject(props.to) && isRoutePath(props.to.index)) return props.to.index
    if (isString(props.to)) return props.to
    return 'javascript:void(0)'
  })

  /**
   * 计算属性：判断当前路由是否是激活状态
   * @returns 如果当前路由以目标路由路径开头则返回 true
   */
  const isActive = computed(() => {
    const matchedRoute = route.value
    if (!matchedRoute) return false
    return isPathPrefixMatch(router.route.path, matchedRoute.path)
  })

  /**
   * 计算属性：判断当前路由是否是精确激活状态
   * @returns 如果当前路由与目标路由完全匹配则返回 true
   */
  const isExactActive = computed(() => {
    const matchedRoute = route.value
    if (!matchedRoute) return false
    const isMatched = isPathExactMatch(router.route.path, matchedRoute.path)
    if (!isMatched) return false
    const mode = props.exactMatchMode || 'path'
    switch (mode) {
      case 'href':
        return router.route.href === matchedRoute.href
      case 'hash':
        return router.route.hash === matchedRoute.hash
      case 'query':
        return stringifyQuery(router.route.query) === stringifyQuery(matchedRoute.query)
      default:
        return true
    }
  })

  /**
   * 导航处理函数
   * @param e - 可选的鼠标事件对象
   * @returns {Promise<NavigateResult | void>} 如果
   */
  const navigate = async (e?: MouseEvent): Promise<NavigateResult> => {
    const routeHref = href.value

    // 如果是无效的链接或外部链接都返回模拟的未匹配路由结果
    if (routeHref === 'javascript:void(0)') {
      return {
        state: NavState.notfound,
        message: `No match found for target: ${isPlainObject(props.to) ? JSON.stringify(props.to) : String(props.to)}`,
        to: null,
        from: cloneRouteLocation(router.route)
      }
    }
    if (isExternalLink(routeHref)) {
      return {
        state: NavState.external,
        message: `Open External link ${routeHref}`,
        to: null,
        from: cloneRouteLocation(router.route)
      }
    }

    // 阻止默认行为
    e?.preventDefault()

    const defaultReplace = props.replace ?? false
    const isReplace = isNavTarget(props.to) ? (props.to.replace ?? defaultReplace) : defaultReplace

    let result: NavigateResult
    const routeTarget = route.value || routeHref
    // 处理视图过渡
    if (!__VITARX_SSR__ && props.viewTransition) {
      await handleTransition(async () => {
        result = isReplace ? await router.replace(routeTarget) : await router.push(routeTarget)
        await router.waitViewRender()
      })
    } else {
      result = isReplace ? await router.replace(routeTarget) : await router.push(routeTarget)
    }

    return result!
  }

  return {
    href,
    route,
    isActive,
    isExactActive,
    navigate
  }
}
