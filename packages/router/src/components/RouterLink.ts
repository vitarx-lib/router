import {
  Computed,
  createView,
  ElementView,
  isPlainObject,
  isString,
  logger,
  type ValidChildren,
  type WithProps
} from 'vitarx'
import {
  type HashStr,
  type NavigateResult,
  NavigateStatus,
  type NavigateTarget,
  type RouteIndex,
  type RouteLocation,
  useRouter
} from '../core/index.js'
import { cloneRouteLocation, queryStringToObject } from '../core/utils.js'

type HttpUrl = `http://${string}` | `https://${string}`
type Hash = `#${string}`

export interface RouterLinkProps extends WithProps<'a'> {
  /**
   * 要跳转的目标
   *
   * 可以是路由目标对象，也可以是路由索引
   */
  to:
    | NavigateTarget
    | RouteIndex
    | HttpUrl
    | Hash
    | `${RouteIndex}${Hash}`
    | `${RouteIndex}?${string}`
  /**
   * 子节点插槽
   */
  children?: ValidChildren
  /**
   * 是否禁用
   *
   * @default false
   */
  disabled?: boolean
  /**
   * 激活状态计算
   *
   * 如果启用了激活状态计算，那么当路由匹配到当前路由时，a标签会添加`aria-current="page"`属性，
   *
   * 算法：
   * - 如果路由索引以/开头
   *    - 严格匹配`Router.currentRouteLocation.path === to.index`，
   *    - 模糊匹配`Router.currentRouteLocation.fullPath.startsWith(to.index)`
   * - 如果路由索引不以/开头，则会匹配`Router.currentRouteLocation.matched[i].name`，仅支持严格匹配
   *
   * 可选值：
   * - none：不计算激活状态
   * - obscure：模糊匹配，只要目标路由的路径以当前路由的路径开头，就认为当前路由处于激活状态
   * - strict：严格匹配，只有目标路由的路径完全匹配当前路由的路径，才认为当前路由处于激活状态
   *
   * @default 'none'
   */
  active?: 'none' | 'obscure' | 'strict'
  /**
   * 导航回调函数
   *
   * @param {NavigateResult} result - 导航结果
   */
  callback?: (result: NavigateResult) => void
}

const exclude = [
  'to',
  'children',
  'href',
  'disabled',
  'active',
  'callback',
  'onClick',
  'onclick',
  'aria-current'
]
const regex = /^(https?):\/\/[^\s\/$.?#].\S*$/i
type NavigateInfo =
  | {
      href: string
      navigate: false
    }
  | {
      href: string
      navigate: true
      location: RouteLocation
    }
/**
 * 路由跳转组件
 *
 * 它只是简单的实现了一个a标签，点击后跳转到目标路由，
 * 如果有更高级的定制需求，往往你可以项目中自行编写一个小部件来实现任何你想要的效果。
 *
 * @param {RouterLinkProps} props - 路由跳转组件属性
 * @returns {ElementView<'a'>} - a元素视图
 */
export function RouterLink(props: RouterLinkProps): ElementView<'a'> {
  const router = useRouter()
  const navigateInfo = new Computed<NavigateInfo>(() => {
    if (!props.to) {
      return {
        href: 'javascript:void(0)',
        navigate: false
      }
    }

    const to: NavigateTarget = isString(props.to)
      ? { index: decodeURIComponent(props.to) }
      : props.to

    if (!isPlainObject(to) || !isString(to.index)) {
      logger.warn('[RouterLink] Invalid "to" prop:', to)
      return {
        href: 'javascript:void(0)',
        navigate: false
      }
    }

    if (regex.test(to.index)) {
      return {
        href: to.index,
        navigate: false
      }
    }

    if (to.index.startsWith('#')) {
      if (router.mode === 'hash') {
        // 兼容hash模式，跳转到指定hash
        const route = cloneRouteLocation(router.route)
        if (route.hash) {
          route.fullPath.replace(route.hash, to.index)
        } else {
          route.fullPath += to.index
        }
        route.hash = to.index as HashStr
        return {
          href: route.fullPath,
          location: route,
          navigate: true
        }
      } else {
        return {
          href: to.index,
          navigate: false
        }
      }
    }

    if (to.index.includes('#')) {
      const [index, hash] = to.index.split('#', 2)
      to.index = index
      to.hash = `#${hash}`
    }

    // 解析查询参数
    if (to.index.includes('?')) {
      const [index, queryString] = to.index.split('?', 2)
      to.index = index
      to.query = queryStringToObject(queryString)
    }

    const location = router.createRouteLocation(to)
    if (__VITARX_DEV__ && location.matched.length) {
      logger.warn(
        `[RouterLink] No match found for location with path "${location.fullPath}, rawIndex "${location.index}"`,
        location.matched
      )
    }
    return { href: location.fullPath, location, navigate: true }
  })

  let active: Computed<boolean> | undefined

  if (props.active && props.active !== 'none') {
    active = new Computed(() => {
      const info = navigateInfo.value
      if (!info.navigate) return false
      const loc = info.location
      if (loc.index.startsWith('/')) {
        if (props.active === 'obscure') {
          if (loc.path === '/') {
            return router.route.path === '/'
          } else {
            return router.route.fullPath.startsWith(loc.path)
          }
        } else {
          return loc.path === router.route.path
        }
      } else {
        // 名称匹配
        return !!router.route.matched.find(route => route.name === loc.index)
      }
    })
  }

  const isDisabled = () => props.disabled ?? false

  const navigate = (e: MouseEvent): void => {
    if (isDisabled()) return e.preventDefault()
    const navigateTarget = navigateInfo.value
    // 无需导航
    if (!navigateTarget.navigate) return void 0
    e.preventDefault()
    const to = props.to
    const location =
      isPlainObject(to) && to.replace
        ? { ...navigateTarget.location, replace: true }
        : navigateTarget.location
    router.navigate(location).then(res => {
      if (__VITARX_DEV__ && res.status !== NavigateStatus.success) {
        logger.warn(`[RouterLink] Navigation to target "${location.index}" failed: ${res.message}`)
      }
      if (props.callback) props.callback(res)
    })
  }

  const aProps = {
    onClick: navigate,
    children: props.children,
    'v-bind': [props, exclude],
    get href() {
      return navigateInfo.value.href
    },
    get draggable() {
      return props.draggable ?? false
    },
    get 'aria-current'() {
      return active?.value && !isDisabled() ? 'page' : undefined
    },
    get disabled() {
      return isDisabled() ? '' : undefined
    }
  }
  return createView('a', aProps)
}
