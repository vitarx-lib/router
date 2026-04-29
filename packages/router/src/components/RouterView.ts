import {
  AnyProps,
  Component,
  type ComponentView,
  type Computed,
  computed,
  createCommentView,
  createView,
  dynamic,
  inject,
  isFunction,
  isPlainObject,
  logger,
  provide,
  View
} from 'vitarx'
import { createRouteProxy } from '../core/common/proxy.js'
import { __ROUTER_VIEW_DEPTH_KEY__, type RouteRecord, useRouter } from '../core/index.js'

export interface RouterViewOptions {
  /**
   * 命名视图
   *
   * @default 'default'
   */
  name?: string
  /**
   * 渲染页面组件
   *
   * 接收两个参数：
   *  - `component: Computed<Component | null>`：当前要渲染的组件，
   *  - `props: Computed<AnyProps | null>`：要注入给组件的属性对象
   *
   *  @example
   *  ```jsx
   *  // 搭配 Freeze 使用
   *  <RouterView>
   *    {(component, props, path) => <Freeze is={component} props={props}/>}
   *  </RouterView>
   *  ```
   *
   *  @example
   *  ```jsx
   *  // 搭配Transition使用
   *  <Transition>
   *    <RouterView />
   *  </Transition>
   *  ```
   *  @example
   *  ```jsx
   *  // Freeze & Transition 组合使用
   *  <Transition>
   *    <RouterView>
   *      {(component, props) => <Freeze is={component} props={props} />}
   *    </RouterView>
   *  </Transition>
   *
   *  // 等效的另类写法
   *  <RouterView>
   *     {(component, props) => (<Transition><Freeze is={component} props={props} /></Transition>)}
   *  </RouterView>
   *  ```
   */
  children?: (
    component: Computed<Component | null>,
    props: Computed<AnyProps | null>,
    route: Computed<RouteRecord | null>
  ) => View
}

/**
 * RouterView 组件
 *
 * @description 用于渲染当前路由匹配到的组件视图
 *
 * @param {RouterViewOptions} props - 组件属性
 * @param {Function} [props.children] - 可选的子组件渲染函数
 * @param {string} [props.name='default'] - 视图名称，默认为 'default'
 * @returns {View} 返回渲染的视图
 */
export function RouterView(props: RouterViewOptions): View {
  const { children } = props
  // 获取路由实例
  const router = useRouter()
  // 获取父级 index
  const parentIndex = inject(__ROUTER_VIEW_DEPTH_KEY__, -1) // 从依赖注入中获取父级索引，默认为 -1
  const index = parentIndex + 1 // 计算当前视图的索引
  provide(__ROUTER_VIEW_DEPTH_KEY__, index) // 向子组件提供当前索引
  // 匹配的路由线路
  const viewName = computed(() => props.name || 'default')
  const matchedRoute = computed((): RouteRecord => {
    return router.route.matched[index] ?? null
  })

  // 视图属性计算
  const routeProps = computed((): AnyProps | null => {
    const currentRoute = matchedRoute.value
    if (!currentRoute) return null
    let injectProps = currentRoute.props?.[viewName.value] ?? router.config.props ?? true

    if (injectProps === false) return null // 如果属性为 false，返回null
    if (injectProps === true && currentRoute.pattern) {
      // 使用路由记录自己的 params 对象
      return currentRoute.params || {}
    }
    if (typeof injectProps === 'function') {
      try {
        const proxiedRoute = createRouteProxy(router.route, currentRoute)
        injectProps = injectProps(proxiedRoute)
      } catch (e) {
        logger.error('[RouterView] Error occurred while executing props function', e)
      }
    }
    return isPlainObject(injectProps) ? injectProps : null
  })

  // 组件计算
  const component = computed(() => {
    const route = matchedRoute.value // 获取匹配的路由记录
    if (!route) return null
    return route.component?.[viewName.value] ?? null
  })

  // 如果传入了 children 函数，则调用并返回其结果
  if (isFunction(children)) {
    try {
      return children(component, routeProps, matchedRoute)
    } catch (e) {
      logger.error('[RouterView] Error occurred while executing children function', e)
      return createCommentView(`router-view:error`)
    }
  }

  let lastView: ComponentView | null = null
  let lastComponent: Component | null = null
  return dynamic(() => {
    const renderComponent = component.value
    if (renderComponent) {
      if (lastComponent === renderComponent) {
        return lastView
      }
      lastComponent = renderComponent
      return (lastView = createView(renderComponent, routeProps.value))
    }
    lastView = null
    lastComponent = null
    return createCommentView('router-view:empty')
  })
}
