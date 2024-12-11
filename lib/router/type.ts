import type { LazyLoader, WidgetType } from 'vitarx'

/**
 * 路由参数注入
 */
export type InjectProps =
  | boolean
  | Record<string, any>
  | ((request: RouteRequest) => Record<string, any>)

/**
 * 路由路线配置
 */
export interface Route<TMeta = Record<string, any>> {
  path: string
  /**
   * 动态路由参数匹配规则
   *
   * @example
   * path:`/user/[id]`
   * pattern:{id:'\d+'}
   */
  pattern?: Record<string, string | RegExp>
  /**
   * 路由名称
   *
   * 必须全局保持唯一！
   */
  name?: string
  /**
   * 要展示的Widget
   *
   * 支持三种形式：
   *  1. lazyLoader: `()=>import('./YourWidget')` 懒加载小部件，它会自动被LazyWidget包裹。
   *  2. widget: `YourWidget` 可以是函数式小部件，也可以是类小部件
   *  3. undefined: 自身不展示任何ui，仅做为父路由，使children继承父路由的配置。
   */
  widget?: LazyLoader<WidgetType> | WidgetType
  /**
   * 子路由
   *
   * 子路由path不要以父路由path开头，内部会自动拼接。
   */
  children?: Route<TMeta>[]
  /**
   * 是否预加载
   *
   * 如果启用，它会预先渲染元素（触发 onBeforeMount 钩子），
   * 在路由被正在访问时才会触发onMounted钩子。
   *
   * @default false
   */
  preload?: boolean
  /**
   * 路由元数据
   *
   * 存储一些自定义的数据，不会影响路由匹配
   */
  meta?: TMeta
  /**
   * 将路由参数注入到小部件实例的props中
   *
   * @default true
   */
  injectProps?: InjectProps
}

/**
 * 路由请求对象
 */
export interface RouteRequest {
  /**
   * 路由路径
   */
  path: string
  /**
   * 路由hash
   */
  hash: string
  /**
   * 路由名称
   */
  name: string
  /**
   * 路由query参数
   */
  query: Record<string, any>
  /**
   * 路由参数
   */
  params: Record<string, any>
  /**
   * 路由完整路径
   */
  fullPath: string
}

/**
 * 路由器配置
 */
export interface RouterOptions<TRoute extends Route = Route> {
  /**
   * 根路径
   *
   * 假设你的项目在`/sub-path`目录下运行，那么你需要设置该值为`/sub-path`，它与`vite.base`配置值应保持一致。
   *
   * @default '/'
   */
  base?: string
  /**
   * 是否严格匹配路由
   *
   * 严格匹配指：区分大小写
   *
   * @default false
   */
  strict?: boolean
  /**
   * 路由表
   *
   * 路由表的第一个路由为默认路由。
   */
  routes: TRoute[]
}

export type RouteTarget = ({ path: string } | { name: string }) & {
  query?: Record<string, any>
  params?: Record<string, any>
}
