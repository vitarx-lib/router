import type RouterCore from '../router-core.js'
import type { AfterEnterCallback, BeforeEnterCallback } from './hooks.js'
import type {
  AllowedRouteWidget,
  NamedRouteWidget,
  RouteLocation,
  RoutePath,
  RouteTarget,
  RouteWidget
} from './navigation.js'

/**
 * 路由参数注入
 */
export type InjectProps =
  | boolean
  | Record<string, any>
  | ((route: RouteLocation) => Record<string, any>)

/**
 * 命名的props
 */
export type InjectNamedProps<k extends string = string> = Record<k, InjectProps>

/**
 * 重定向处理器
 */
export type RedirectHandler = (this: RouterCore, to: RouteLocation) => RouteTarget | undefined

/**
 * 路由路线配置
 *
 * 该接口定义了应用程序中路由的配置对象的结构它描述了路由如何映射到组件，
 * 以及路由的各种属性和行为
 *
 * @template T - 指定路由组件的类型，必须是 AllowedRouteWidget 的子类型
 */
export interface Route<T extends AllowedRouteWidget = AllowedRouteWidget> {
  // 路由的路径，用于URL匹配
  path: RoutePath
  // 路由路径的正则表达式模式，用于复杂匹配规则
  pattern?: Record<string, RegExp>
  // 路由的名称，用于识别和引用路由
  name?: string
  // 路由对应的组件或页面
  widget?: T
  // 路由重定向的目标地址或处理函数
  redirect?: RouteTarget | RedirectHandler
  // 子路由配置，用于嵌套路由
  children?: Route[]
  // 路由的元数据，用于存储附加信息
  meta?: RouteMetaData
  // 路由的后缀配置，决定是否支持通配符或指定后缀
  suffix?: '*' | string | string[] | false
  // 注入到路由组件的属性配置，或直接注入所有属性
  injectProps?: (T extends NamedRouteWidget<infer k> ? InjectNamedProps<k> : InjectProps) | boolean
  // 路由进入前的钩子函数，用于权限控制或数据预加载
  beforeEnter?: BeforeEnterCallback
  // 路由进入后的钩子函数，用于处理进入路由后的逻辑
  afterEnter?: AfterEnterCallback
}

/**
 * 规范化过后的路由线路配置
 */
export interface RouteNormalized extends MakeRequired<Route, 'meta' | 'pattern' | 'suffix'> {
  children: RouteNormalized[]
  widget: undefined | Record<string, RouteWidget>
  injectProps: undefined | InjectNamedProps
}

/**
 * 动态路由记录
 */
export interface DynamicRouteRecord {
  regex: RegExp
  route: RouteNormalized
}

/**
 * 路由匹配结果
 */
export type MatchResult =
  | {
      route: RouteNormalized
      params: Record<string, string> | undefined
    }
  | undefined
