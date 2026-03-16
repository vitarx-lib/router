import {
  AnyProps,
  Component,
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
import { useRouter } from '../core/index.js'

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
   *  - `props: AnyProps | null`：要注入给组件的属性对象
   *
   *  @example
   *  ```jsx
   *  // 搭配 Freeze 使用
   *  <RouterView>
   *    {(component, props) => <Freeze component={component} props={props} />}
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
   *      {(component, props) => <Freeze component={component} props={props} />}
   *    </RouterView>
   *  </Transition>
   *
   *  // 等效的另类写法
   *  <RouterView>
   *     {(component, props) => (<Transition><Freeze component={component} props={props} /></Transition>)}
   *  </RouterView>
   *  ```
   */
  children?: (component: Computed<Component | null>, props: AnyProps | null) => View
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
export function RouterView(props: RouterViewOptions): View {
  const { children, name = 'default' } = props
  const router = useRouter() // 获取路由实例

  // 获取父级 index
  const parentIndex = inject(INDEX_SYMBOL, -1) // 从依赖注入中获取父级索引，默认为 -1
  const index = parentIndex + 1 // 计算当前视图的索引
  provide(INDEX_SYMBOL, index) // 向子组件提供当前索引

  // 视图属性计算
  const routeProps = computed((): AnyProps | null => {
    const route = router.route // 获取当前路由信息
    const name = props.name || 'default' // 获取视图名称，默认为 'default'
    let injectProps = route.matched[index]?.props?.[name] // 获取匹配路由中的属性

    if (injectProps === false) return null // 如果属性为 false，返回null
    if (injectProps === true) return route.params // 如果属性为 true，返回路由参数
    if (typeof injectProps === 'function') {
      // 如果属性是函数
      try {
        injectProps = injectProps(route)
      } catch (e) {
        logger.error('[RouterView] Error occurred while executing props function', e)
      }
    }
    return isPlainObject(injectProps) ? injectProps : null
  })

  // 组件计算
  const component = computed(() => {
    const route = router.route.matched[index] // 获取匹配的路由记录
    if (!route) {
      // 如果是根组件且没有默认视图，返回缺失组件
      return index === 0 && name === 'default' && router.missing ? router.missing : null
    }
    return route.component?.[name] ?? null // 返回匹配的组件或 null
  })

  if (isFunction(children)) {
    try {
      return children(component, routeProps)
    } catch (e) {
      logger.error('[RouterView] Error occurred while executing children function', e)
    }
  }

  return dynamic(() => {
    if (component.value) {
      return createView(component.value, routeProps.value)
    }
    return createCommentView('router-view:empty')
  })
}
