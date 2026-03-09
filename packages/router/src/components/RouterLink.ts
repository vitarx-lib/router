import {
  Computed,
  createView,
  ElementView,
  isString,
  logger,
  type ValidChildren,
  type WithProps
} from 'vitarx'
import {
  type NavigateResult,
  NavigateStatus,
  type NavigateTarget,
  type RouteIndex,
  type RouteLocation,
  useRouter
} from '../core/index.js'

type HttpUrl = `http://${string}` | `https://${string}`
type Hash = `#${string}`

/**
 * 解析查询字符串为对象
 *
 * @param queryString - 查询字符串（不含 ? 前缀）
 * @returns 查询参数对象
 */
function parseQuery(queryString: string): Record<string, string> {
  const query: Record<string, string> = {}
  const pairs = queryString.split('&')

  for (const pair of pairs) {
    const [key, value] = pair.split('=', 2)
    if (key) {
      query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
    }
  }

  return query
}

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
    | `${RouteIndex}?${string}${Hash}`
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

  const target = new Computed<NavigateTarget | HttpUrl | Hash | undefined>(() => {
    if (!props.to) return undefined

    const to: NavigateTarget = isString(props.to)
      ? { index: decodeURIComponent(props.to) }
      : props.to

    if (regex.test(to.index) || to.index.startsWith('#')) {
      return to.index as HttpUrl | Hash
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
      to.query = parseQuery(queryString)
    }

    return to
  })

  const location = new Computed<RouteLocation | undefined>(() => {
    if (!target.value || typeof target.value === 'string') return undefined

    const location = router.createRouteLocation(target.value)

    if (!location.matched.length) {
      logger.warn(
        `[RouterLink] Route target "${target.value.index}" did not match any valid route, please check the "to" prop configuration`
      )
    }

    return location
  })

  let active: Computed<boolean> | undefined

  if (props.active && props.active !== 'none') {
    active = new Computed(() => {
      if (!location.value) return false
      const routeTarget = target.value
      if (typeof routeTarget === 'string' || !routeTarget) return false

      if (routeTarget.index.startsWith('/')) {
        if (props.active === 'obscure') {
          if (location.value.path === '/') {
            return router.route.path === '/'
          } else {
            return router.route.fullPath.startsWith(location.value.path)
          }
        } else {
          return location.value.path === router.route.path
        }
      } else {
        const index = routeTarget.index
        return !!router.route.matched.find(route => route.name === index)
      }
    })
  }

  const isDisabled = () => props.disabled ?? false

  const href = () => {
    if (typeof target.value === 'string') return target.value
    return location.value?.fullPath || 'javascript:void(0)'
  }

  const navigate = (e: MouseEvent): void => {
    if (typeof target.value !== 'string') {
      e.preventDefault()

      if (location.value && !isDisabled()) {
        router.navigate(location.value).then(res => {
          if (res.status !== NavigateStatus.success) {
            logger.warn(
              `[RouterLink] Navigation to target "${(target.value as NavigateTarget)?.index}" failed: ${res.message}`
            )
          }

          if (props.callback) props.callback(res)
        })
      }
    }
  }
  const aProps = {
    href: href(),
    onClick: navigate,
    children: props.children,
    'v-bind': [props, exclude],
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
