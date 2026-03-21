import { createView, ElementView, isFunction, type ValidChildren, type WithProps } from 'vitarx'
import { type NavigateResult } from '../core/index.js'
import { useLink, type UseLinkOptions } from '../core/page/index.js'

export interface RouterLinkProps extends UseLinkOptions, WithProps<'a'> {
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
   * Value passed to the attribute `aria-current` when the link is exact active.
   *
   * @defaultValue `'page'`
   */
  ariaCurrentValue?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'
}

/**
 * 路由链接组件，渲染为一个 `<a>` 标签，用于在应用内进行声明式导航。
 *
 * 该组件基于 `useLink` Hook 实现，支持自动处理点击事件、阻止默认行为、
 * 动态设置激活状态类名、`href` 属性以及 `aria-current` 无障碍属性。
 *
 * @param {RouterLinkProps} props - 组件属性
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
 * ```
 */
export function RouterLink(props: RouterLinkProps): ElementView<'a'> {
  const link = useLink(props)
  const isDisabled = () => props.disabled ?? false

  const navigate = async (e: MouseEvent): Promise<void> => {
    if (isDisabled()) return e.preventDefault()
    const result = await link.navigate(e)
    if (result && isFunction(props.callback)) props.callback(result)
  }

  const aProps = {
    onClick: navigate,
    children: props.children,
    'v-bind': [
      props,
      ['to', 'children', 'href', 'disabled', 'callback', 'onClick', 'onclick', 'aria-current']
    ],
    get className() {
      return [
        !isDisabled() && link.isActive.value ? props.activeClass : undefined,
        !isDisabled() && link.isExactActive.value ? props.exactActiveClass : undefined
      ].filter(Boolean) as string[]
    },
    get href() {
      return link.href.value
    },
    get draggable() {
      return props.draggable ?? false
    },
    get 'aria-current'() {
      return link.isActive.value && !isDisabled() ? props.ariaCurrentValue || 'page' : undefined
    },
    get disabled() {
      return isDisabled() ? '' : undefined
    }
  }
  return createView('a', aProps)
}
