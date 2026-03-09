import {
  AnyProps,
  Component,
  computed,
  createView,
  dynamic,
  DynamicView,
  inject,
  isFunction,
  isPlainObject,
  isView,
  logger,
  provide,
  View
} from 'vitarx'
import { useRouter } from '../core/index.js'

export interface RouteOptions {
  /**
   * 命名视图
   *
   * @default 'default'
   */
  name?: string
  /**
   * 渲染组件
   *
   * 渲染函数有两个可选参数：
   *  - `component`：当前要渲染的组件
   *  - `props`：要注入给组件的属性对象
   *
   * @default `component => createView(component,props)`
   */
  render?: (component: Component, props: AnyProps) => View
}

// 路由视图层级索引
const INDEX_SYMBOL = Symbol.for('__v_router_view_counter')

/**
 * 路由视图
 *
 * @param props - 路由视图配置
 * @param [props.name] - 命名视图
 * @param [props.render] - 渲染组件
 * @return - 动态视图
 */
export function RouterView(props: RouteOptions): DynamicView<View | null> {
  const router = useRouter() // 获取路由实例

  // 获取父级 index
  const parentIndex = inject(INDEX_SYMBOL, -1) // 从依赖注入中获取父级索引，默认为 -1
  const index = parentIndex + 1 // 计算当前视图的索引
  provide(INDEX_SYMBOL, index) // 向子组件提供当前索引
  // 视图属性计算
  const routeProps = computed((): AnyProps => {
    const route = router.route // 获取当前路由信息
    const name = props.name || 'default' // 获取视图名称，默认为 'default'
    let injectProps = route.matched[index]?.props?.[name] // 获取匹配路由中的属性

    if (injectProps === false) return {} // 如果属性为 false，返回空对象
    if (injectProps === true) return route.params // 如果属性为 true，返回路由参数
    if (typeof injectProps === 'function') {
      // 如果属性是函数
      try {
        injectProps = injectProps(route)
      } catch (e) {
        logger.error('[RouterView] Error occurred while executing props function', e)
      }
    }
    return isPlainObject(injectProps) ? injectProps : {} // 如果是普通对象则返回，否则返回空对象
  })
  // 组件计算
  const component = computed(() => {
    const route = router.route.matched[index] // 获取匹配的路由记录
    const name = props.name || 'default' // 获取视图名称，默认为 'default'
    if (!route) {
      // 如果没有匹配的路由记录
      return index === 0 && name === 'default' && router.missing ? router.missing : null // 如果是根组件且没有默认视图，返回缺失组件
    }
    return route.component?.[name] ?? null // 返回匹配的组件或 null
  })
  // 动态渲染视图
  return dynamic(() => {
    if (!component.value) return null // 如果没有组件，返回 null
    const render = props.render // 获取自定义渲染函数
    if (isFunction(render)) {
      // 如果有自定义渲染函数
      try {
        const result = render(component.value, routeProps.value)
        if (isView(result)) return result
      } catch (e) {
        logger.error('[RouterView] Error occurred while executing render function', e)
      }
    }
    // 默认渲染方式
    return component.value ? createView(component.value, routeProps.value) : null // 创建视图组件或返回 null
  })
}
