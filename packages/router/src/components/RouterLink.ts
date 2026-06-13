import {
  type CodeLocation,
  createView,
  ElementView,
  isFunction,
  isPlainObject,
  logger,
  type RenderChildren,
  type WithProps
} from 'vitarx'
import { isExternalLink, type NavigateResult } from '../core/index.js'
import { useLink, type UseLinkOptions } from '../core/shared/index.js'

export interface RouterLinkProps extends UseLinkOptions, Omit<WithProps<'a'>, 'href' | 'onClick'> {
  /**
   * 子节点插槽
   */
  children?: RenderChildren
  /**
   * 是否禁用
   *
   * @default false
   */
  disabled?: boolean
  /**
   * 导航回调函数
   *
   * @param {NavigateResult} result - 导航结果
   */
  callback?: (result: NavigateResult) => void
  /**
   * 当链接激活时应用的类名
   */
  activeClass?: string
  /**
   * 当链接完全匹配时应用的类名
   */
  exactActiveClass?: string
  /**
   * 当链接禁用时应用的类名
   */
  disabledClass?: string
  /**
   * Value passed to the attribute `aria-current` when the link is exact active.
   */
  ariaCurrentValue?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'
}

const EXTRA_PROPS = [
  'to',
  'replace',
  'viewTransition',
  'exactMatchMode',
  'disabled',
  'callback',
  'onclick',
  'activeClass',
  'exactActiveClass',
  'disabledClass',
  'ariaCurrentValue'
] as const

/**
 * 路由链接组件，渲染为一个 `<a>` 标签，用于在应用内进行声明式导航。
 *
 * 该组件基于 `useLink` Hook 实现，支持自动处理点击事件、阻止默认行为、
 * 动态设置激活状态类名、`href` 属性以及 `aria-current` 无障碍属性。
 *
 * @param {RouterLinkProps} props - 组件属性
 * @param {CodeLocation} [location] - 代码位置信息
 * @returns {ElementView<'a'>} 返回一个锚点元素视图
 *
 * @example
 * ```tsx
 * // 基本用法
 * <RouterLink to="/about">关于我们</RouterLink>
 * // 激活类名
 * <RouterLink to="/about" activeClass="active">关于我们</RouterLink>
 * // 外站链接支持
 * <RouterLink to="https://www.example.com" target="_blank">访问示例站</RouterLink>
 * // 禁用状态
 * <RouterLink to="/about" disabled>关于我们</RouterLink>
 * // 透传属性
 * <RouterLink to="/about" class="nav-link">关于我们</RouterLink>
 * // 带参数的导航
 * <RouterLink to={{ index: '/user', query: { id: 123 } }}>用户信息</RouterLink>
 * ```
 */
export function RouterLink(props: RouterLinkProps, location?: CodeLocation): ElementView<'a'> {
  const link = useLink(props)
  if (__VITARX_DEV__) {
    if (!link.route.value && !isExternalLink(link.href.value)) {
      logger.warn(
        `[RouterLink] No match found for to: ${isPlainObject(props.to) ? JSON.stringify(props.to) : String(props.to)}`,
        location
      )
    }
  }

  const isDisabled = () => props.disabled ?? false

  const navigate = async (e: MouseEvent): Promise<void> => {
    if (isDisabled()) return e.preventDefault()
    const result = await link.navigate(e)
    if (result && isFunction(props.callback)) props.callback(result)
  }

  const aProps = {
    onClick: navigate,
    children: props.children,
    'v-bind': [props, EXTRA_PROPS],
    get class() {
      return [
        props.activeClass && link.isActive.value ? props.activeClass : undefined,
        props.exactActiveClass && link.isExactActive.value ? props.exactActiveClass : undefined,
        props.disabledClass && isDisabled() ? props.disabledClass : undefined
      ].filter(Boolean)
    },
    get href() {
      return link.href.value
    }
  }
  if ('ariaCurrentValue' in props) {
    Object.defineProperty(aProps, 'aria-current', {
      enumerable: true,
      configurable: true,
      get() {
        return link.isExactActive.value ? props.ariaCurrentValue : undefined
      }
    })
  }
  return createView('a', aProps)
}
