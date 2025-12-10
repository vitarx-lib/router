import {
  type Computed,
  computed,
  createVNode,
  inject,
  isRecordObject,
  provide,
  type Renderable,
  Widget,
  type WidgetNode
} from 'vitarx'
import { type ReadonlyRoute, useRouter } from '../core/index.js'

export interface RouteOptions {
  /**
   * 命名视图
   *
   * @default 'default'
   */
  name?: string
}

// 路由视图层级索引
const INDEX_SYMBOL = Symbol.for('__v_router_view_counter')

/**
 * # 路由器视图
 *
 * 用于渲染路由线路配置的`Widget`，可以在子组件中嵌套`RouterView`，但应用内只能存在一个根视图。
 *
 * 如需实现页面缓存等功能，可以重写该类的{@link build}方法。
 *
 * @see https://vitarx.cn/router/advanced/router-view.html 文档
 */
export class RouterView extends Widget<RouteOptions> {
  // 自身index
  public readonly index: number
  protected readonly router = useRouter()
  protected readonly viewNode: Computed<WidgetNode | null>
  protected readonly viewProps: Computed<Record<string, any>>
  constructor(props: RouteOptions) {
    super(props)
    const parentIndex = inject(INDEX_SYMBOL, -1)
    this.index = parentIndex + 1
    provide(INDEX_SYMBOL, this.index)
    this.viewNode = computed(() => {
      const route = this.matchedRoute
      const name = this.name
      const props = this.viewProps.value
      if (!route) {
        return this.index === 0 && name === 'default' && this.router.missing
          ? createVNode(this.router.missing)
          : null
      }
      const widget = route.widget?.[name]
      return widget ? (createVNode(widget, props) as WidgetNode) : null
    })
    this.viewProps = computed((): Record<string, any> => {
      const params = this.router.route.params
      const name = this.name
      let props = this.matchedRoute?.injectProps?.[name]
      if (props === false) return {}
      if (props === true) return { ...params }
      if (typeof props === 'function') {
        try {
          props = props(this.router.route)
        } catch (e) {
          console.error(e)
        }
      }
      return isRecordObject(props) ? props : {}
    })
  }
  /**
   * 视图名称
   *
   * @default 'default'
   */
  public get name() {
    return this.props.name || 'default'
  }
  /**
   * 获取当前匹配的路线配置
   *
   * 注意未匹配时会返回`undefined`，匹配成功时返回的是`ReadonlyRouteNormalized`
   */
  public get matchedRoute(): ReadonlyRoute | undefined {
    return this.router.route.matched[this.index]
  }
  /**
   * 构建视图
   *
   * 可以重写该方法实现自定义的视图构建逻辑。
   *
   * 例如，使用`KeepAlive`小部件进行页面缓存：
   * ```tsx
   * build() {
   *   // 使用空片段节点占位
   *   if (!this.viewNode.value) return null // 不可省略，因为`KeepAlive`不能渲染非组件节点。
   *
   *   // 将当前要进行展示的小部件构造函数传递给`KeepAlive`插槽，会在切换页面时缓存当前页面状态。
   *   return <KeepAlive>{this.viewNode.value}</KeepAlive>
   * }
   * ```
   * @protected
   */
  build(): Renderable {
    return this.viewNode.value
  }
}
