import {
  Computed,
  createElement,
  type Element,
  isString,
  markRaw,
  type WebRuntimeDom,
  Widget
} from 'vitarx'
import { type RouteIndex, type RouteLocation, Router, type RouteTarget } from '../core/index.js'

export interface RouterLinkProps {
  /**
   * 要跳转的目标
   *
   * 可以是路由目标对象，也可以是路由索引
   */
  to: RouteTarget | RouteIndex
  /**
   * 子节点插槽
   */
  children: Element | Element[] | string
  /**
   * a 标签的style属性
   */
  style?: WebRuntimeDom.HTMLStyleProperties
  /**
   * a 标签的class属性
   */
  class?: WebRuntimeDom.HTMLClassProperties
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
   * - 如果路由索引以/开头，严格匹配`Router.instance.currentRouteLocation.path === to.index`，模糊匹配`Router.instance.currentRouteLocation.fullPath.startsWith(to.index)`
   * - 如果路由索引不以/开头，则会匹配`Router.instance.currentRouteLocation.matched[i].name`，仅支持严格匹配
   *
   * 可选值：
   * - none：不计算激活状态
   * - obscure：模糊匹配，只要目标路由的路径包含当前路由的路径，就认为当前路由处于激活状态
   * - strict：严格匹配，只有目标路由的路径完全匹配当前路由的路径，才认为当前路由处于激活状态
   *
   * @default 'none'
   */
  active?: 'none' | 'obscure' | 'strict'
}

/**
 * # 路由跳转小部件
 *
 * 它只是简单的实现了一个a标签，点击后跳转到目标路由，
 * 如果有更高级的定制需求，往往你可以项目中自行编写一个小部件来实现任何你想要的效果。
 */
export class RouterLink extends Widget<RouterLinkProps> {
  /**
   * 路由目标
   *
   * 计算属性
   *
   * @protected
   */
  protected target: Computed<RouteTarget>
  /**
   * 路由目标对应的`RouteLocation`对象
   *
   * 计算属性
   *
   * @protected
   */
  protected location: Computed<RouteLocation>
  /**
   * 激活状态
   *
   * 计算属性
   *
   * @protected
   */
  protected active: Computed<boolean> | undefined = undefined
  protected htmlProps: Computed<WebRuntimeDom.HtmlProperties<HTMLAnchorElement>>

  constructor(props: RouterLinkProps) {
    super(props)
    this.target = new Computed(() => {
      return markRaw(isString(props.to) ? { index: props.to } : props.to)
    })
    this.location = new Computed(() => {
      const location = Router.instance.createRouteLocation(this.target.value)
      if (!location.matched.length) {
        console.warn(
          `[Vitarx.RouterLink][WARN]：索引：${this.target.value.index}，未匹配到任何有效的路由线路，请检查to属性是否配置正确！`
        )
      }
      return markRaw(location)
    })
    if (props.active !== undefined && props.active !== 'none') {
      this.active = new Computed(() => {
        if (this.target.value.index.startsWith('/')) {
          if (props.active === 'obscure') {
            return Router.instance.currentRouteLocation.fullPath.startsWith(
              this.location.value.path
            )
          } else {
            return this.location.value.path === Router.instance.currentRouteLocation.path
          }
        } else {
          return !!Router.instance.currentRouteLocation.matched.find(
            route => route.name === this.target.value.index
          )
        }
      })
    }
    this.htmlProps = new Computed(() => {
      const props: WebRuntimeDom.HtmlProperties<HTMLAnchorElement> = {
        href: this.href,
        onClick: e => this.navigate(e),
        children: this.children,
        style: this.props.style,
        class: this.props.class
      }
      if (this.isActive) props['aria-current'] = 'page'
      if (this.isDisabled) props.disabled = true
      return props
    })
  }

  /**
   * 当前是否处于激活状态
   */
  get isActive() {
    return this.active?.value && !this.isDisabled
  }

  get isDisabled() {
    return this.props.disabled ?? false
  }

  /**
   * 路由目标地址
   */
  get href(): string {
    return this.location.value.fullPath
  }

  /**
   * 导航到目标路由
   *
   * 该方法用于处理`a`标签的点击事件
   *
   * @param e
   */
  protected navigate(e: MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    !this.isDisabled && Router.instance.navigate(this.location.value).then()
  }

  protected build(): Element {
    return createElement('a', this.htmlProps.value)
  }
}
