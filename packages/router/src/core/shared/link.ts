import { type Computed, computed, isPlainObject, isString, logger } from 'vitarx'
import { hasValidNavTarget, hasValidPath } from '../common/utils.js'
import { useRouter } from '../router/index.js'
import type {
  NavigateResult,
  NavTarget,
  RouteIndex,
  RouteLocation,
  RoutePath,
  URLHash
} from '../types/index.js'
import { cloneRouteLocation, parseQuery } from './utils.js'

export type HTTPUrl = `http://${string}` | `https://${string}`
type LinkToTarget<T extends RouteIndex = RouteIndex> =
  | NavTarget<T>
  | T
  | `${RoutePath}?${string}`
  | URLHash
  | HTTPUrl
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
  navigate: (e?: MouseEvent) => Promise<NavigateResult | void>
}

/**
 * 处理视图转换
 * @param callback
 */
const handleTransition = async (callback: () => Promise<void>): Promise<void> => {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') {
    await callback()
    return
  }
  const transition = document.startViewTransition(callback)
  await transition.finished
}

/**
 * 创建一个链接助手，用于处理路由导航、生成链接属性及判断激活状态。
 *
 * @template T - 路由索引类型，扩展自 `RouteIndex`。
 * @param props - 链接配置选项。
 * @param props.to - 要跳转的目标，可以是路由目标对象、路由索引、带查询参数的路径字符串、哈希值或 HTTP/HTTPS 链接。
 * @param [props.replace] - 是否使用 `router.replace()` 而不是 `router.push()`。优先级低于 `to.replace`。默认为 `false`。
 * @param [props.viewTransition] - 如果支持则使用 `document.startViewTransition()` 进行视图过渡。默认为 `false`。
 * @returns 返回一个包含链接属性和导航方法的对象。
 * @returns {Computed<string>} returns.href - 链接的 `href` 属性值。
 * @returns {Computed<RouteLocation | null>} returns.route - 匹配的路由信息，如果未匹配则返回 `null`。
 * @returns {Computed<boolean>} returns.isActive - 指示当前路由是否与目标路由部分匹配（前缀匹配）。
 * @returns {Computed<boolean>} returns.isExactActive - 指示当前路由是否与目标路由完全匹配。
 * @returns {function} returns.navigate - 执行导航到目标路由的函数。接收可选的 `MouseEvent` 参数，阻止默认行为并执行跳转。
 */
export function useLink<T extends RouteIndex>(props: UseLinkOptions<T>): UseLinkReturn {
  const router = useRouter()
  const httpRegex = /^(https?):\/\/[^\s\/$.?#].\S*$/i

  /**
   * 计算属性：解析目标路由
   * @returns 返回解析后的路由位置对象，如果无效则返回 null
   */
  const route = computed((): RouteLocation | null => {
    const to = props.to
    let target: NavTarget | null = null

    // 验证目标类型
    if (hasValidNavTarget(to)) {
      target = to
    } else if (isString(to)) {
      // 如果是 HTTP/HTTPS 链接则返回 null
      if (httpRegex.test(to)) return null
      target = { index: to }
    } else if (typeof to === 'symbol') {
      target = { index: to }
    } else {
      if (__VITARX_DEV__) {
        logger.warn(
          `[RouterLink] Invalid "to" prop: ${isPlainObject(to) ? JSON.stringify(to) : String(to)}`
        )
      }
      return null
    }

    // 处理字符串目标
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

    const route = router.matchRoute(target)
    if (route) return route

    if (__VITARX_DEV__) {
      logger.warn(
        `[RouterLink] No match found for to ${isPlainObject(to) ? JSON.stringify(to) : String(to)}`
      )
    }
    return null
  })

  /**
   * 计算属性：生成链接的 href 属性
   * @returns 返回路由的 href 或原始字符串，默认返回 'javascript:void(0)'
   */
  const href = computed(() => {
    if (route.value?.href) {
      return route.value.href
    }
    if (isPlainObject(props.to) && hasValidPath(props.to.index)) {
      return props.to.index
    }
    if (isString(props.to)) {
      if (httpRegex.test(props.to)) {
        return props.to
      }
      if (props.to.startsWith('/')) {
        return props.to
      }
    }
    return 'javascript:void(0)'
  })

  /**
   * 计算属性：判断当前路由是否是激活状态
   * @returns 如果当前路由以目标路由路径开头则返回 true
   */
  const isActive = computed(() => {
    const matchedRoute = route.value
    if (!matchedRoute) return false
    return router.route.href.startsWith(matchedRoute.path)
  })

  /**
   * 计算属性：判断当前路由是否是精确激活状态
   * @returns 如果当前路由与目标路由完全匹配则返回 true
   */
  const isExactActive = computed(() => {
    const matchedRoute = route.value
    if (!matchedRoute) return false
    return router.route.href === matchedRoute.href
  })

  /**
   * 导航处理函数
   * @param e - 可选的鼠标事件对象
   * @returns 返回导航结果，如果没有匹配路由则返回 undefined
   */
  const navigate = async (e?: MouseEvent): Promise<NavigateResult | void> => {
    const matchedRoute = route.value

    // 如果没有匹配的路由，则返回 void 0
    if (!matchedRoute) {
      if (href.value === 'javascript:void(0)') {
        logger.warn(
          `[RouterLink] No match found for to ${isPlainObject(props.to) ? JSON.stringify(props.to) : String(props.to)}`
        )
        e?.preventDefault()
      }
      return void 0
    }

    // 阻止默认行为
    e?.preventDefault()

    const defaultReplace = props.replace ?? false
    const isReplace = hasValidNavTarget(props.to)
      ? (props.to.replace ?? defaultReplace)
      : defaultReplace

    let result: NavigateResult

    // 处理视图过渡
    if (!__VITARX_SSR__ && props.viewTransition) {
      await handleTransition(async () => {
        result = isReplace ? await router.replace(matchedRoute) : await router.push(matchedRoute)
        await router.waitViewRender()
      })
    } else {
      result = isReplace ? await router.replace(matchedRoute) : await router.push(matchedRoute)
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
