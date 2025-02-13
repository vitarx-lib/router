import {
  createElement,
  type Element,
  Fragment,
  inject,
  provide,
  shallowRef,
  type VNode,
  watch,
  Widget,
  type WidgetType
} from 'vitarx'
import { type RouteNormalized, Router } from '../core/index.js'

export interface RouteOptions {
  /**
   * 命名视图
   *
   * @default 'default'
   */
  name?: string
}

// 路由视图层级索引
const INDEX_SYMBOL = Symbol('RouterViewCounter')

/**
 * # 路由器视图
 *
 * 用于渲染路由线路配置的`widget`，可以在子组件中嵌套`RouterView`，但应用内只能存在一个根视图。
 *
 * 如需实现页面缓存等功能，可以重写该类的{@link build}方法。
 */
export class RouterView extends Widget<RouteOptions> {
  // 自身index
  private readonly _$index: number
  // 当前匹配的路由配置
  private _$currentRoute?: RouteNormalized
  // 当前视图元素
  private _$currentElement = shallowRef<VNode<WidgetType>>()

  constructor(props: RouteOptions) {
    super(props)
    const parentIndex = inject(INDEX_SYMBOL, -1, this)
    this._$index = parentIndex + 1
    provide(INDEX_SYMBOL, this._$index, this)
    this._$currentRoute = this.matchedRoute
    if (this._$currentRoute) {
      this._$currentElement.value = Router.routeView(this._$currentRoute, this.name)
    }
    watch(this.location.matched, (_c, o) => {
      const newRoute = o[this.index]
      if (newRoute !== this._$currentRoute) {
        this._$currentRoute = newRoute
        this._$currentElement.value = newRoute ? Router.routeView(newRoute, this.name) : undefined
      }
    })
  }

  /**
   * 当前路由器视图所在层级索引
   *
   * `index`的值从0开始，它与`RouteLocation.matched`数组下标一一对应
   */
  public get index() {
    return this._$index
  }

  /**
   * 是否为最后一个路由视图
   */
  public get isLastView() {
    return this.index === this.location.matched.length - 1 && this.name === 'default'
  }

  /**
   * 视图名称
   *
   * @default 'default'
   */
  public get name() {
    return this.props.name || 'default'
  }

  public get matchedRoute(): RouteNormalized | undefined {
    return this.location.matched[this.index]
  }

  /**
   * 当前路由器视图要显示的虚拟节点
   *
   * 注意未匹配时会返回`undefined`，匹配成功时返回的是`VNode<WidgetType>`
   *
   * @protected
   */
  protected get currentElement(): VNode | undefined {
    return this._$currentElement.value
  }

  /**
   * 当前的路由位置对象
   *
   * @protected
   */
  protected get location() {
    return Router.instance.currentRouteLocation
  }

  /**
   * @inheritDoc
   */
  protected onMounted() {
    this.completeViewRender()
  }

  /**
   * @inheritDoc
   */
  protected override onUpdated() {
    this.completeViewRender()
  }

  /**
   * ## 构建视图
   *
   * 可以重写该方法添加自定义的视图元素
   *
   * 例如，使用`KeepAlive`组件缓存当前视图元素：
   * ```tsx
   * protected build() {
   *   // 不可省略，因为`KeepAlive`不能渲染非组件节点。
   *   if (!this.currentElement) return <></> // 使用空片段节点占位
   *
   *   // 将当前显示的视图元素(VNode<WidgetType>对象)传递给`KeepAlive`插槽，使用缓存功能。
   *   return <KeepAlive onlyKey={this.matchedRoute?.path}>{this.currentElement}</KeepAlive>
   * }
   * ```
   * @protected
   */
  protected build(): Element {
    return this.currentElement || createElement(Fragment)
  }

  /**
   * 视图渲染完成通知路由器
   *
   * @private
   */
  private completeViewRender() {
    // 如果是最后一个路由视图更新完成，则通知路由实例视图渲染已完成
    if (this.isLastView) Router.instance['_completeViewRender']()
  }
}
