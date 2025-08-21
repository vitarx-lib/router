import type { DeepReadonly, MakeRequired } from 'vitarx'
import type RouterCore from '../router-core.js'
import type { AfterEnterCallback, BeforeEnterCallback } from './hooks.js'
import type {
  AllowedRouteWidget,
  NamedRouteWidget,
  ReadonlyRouteLocation,
  RouteLocation,
  RoutePath,
  RouteTarget,
  RouteWidget
} from './navigation.js'

/**
 * 注入参数处理函数
 *
 * @param {ReadonlyRouteLocation} location 路由匹配的位置信息
 * @return {Record<string, any>} 注入的参数，必须是可JSON序列化的对象
 */
export type InjectPropsHandler = (location: ReadonlyRouteLocation) => Record<string, any>

/**
 * 路由参数注入
 */
export type InjectProps = boolean | Record<string, any> | InjectPropsHandler

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
  /**
   * 路由的路径，用于URL匹配
   *
   * 支持动态路径匹配，如：/user/{id}，可选变量：/user/{id?}
   */
  path: RoutePath
  /**
   * 动态路由匹配模式
   *
   * 默认会继承`RouterOptions.pattern`
   */
  pattern?: Record<string, RegExp>
  /**
   * 路由的名称，用于识别和引用路由
   */
  name?: string
  /**
   * 路由对应的视图组件
   *
   * 支持命名视图
   * @example
   * ```ts
   * {
   *   path: '/user/{id}',
   *   name: 'user',
   *   widget: {
   *     default: User,
   *     detail: UserDetail,
   *   }
   * }
   * ```
   *
   * 支持懒加载
   * @example
   * ```ts
   * {
   *   path: '/user/{id}',
   *   widget: () => import('./User.js')
   * }
   * ```
   */
  widget?: T
  /**
   * 路由重定向的目标地址或处理函数
   */
  redirect?: RouteTarget | RedirectHandler
  /**
   * 子路由配置，用于嵌套路由
   */
  children?: Route[]
  /**
   * 路由的元数据，用于存储附加信息
   */
  meta?: RouteMetaData
  /**
   * 路由的后缀配置，决定是否支持通配符或指定后缀
   *
   * 默认继承`RouterOptions.suffix`
   */
  suffix?: '*' | string | string[] | false
  /**
   * 需要给路由`Widget`注入的参数
   *
   * 可选值：
   * - `true`：表示仅注入匹配到的动态参数
   * - `false`：表示不注入任何参数
   * - `{key: value}`：表示注入指定参数，其中`key`为参数名，`any`为参数值
   * - `(location: RouteLocation) => {key: value}`：自定义一个处理函数，返回一个对象用于注入参数
   *
   * > 注意：如果是命名视图，则需要以键值对形式传入：{视图名称:injectProps配置}
   *
   * @default true
   */
  injectProps?: (T extends NamedRouteWidget<infer k> ? InjectNamedProps<k> : InjectProps) | boolean
  /**
   * 路由进入前的钩子函数，用于权限控制或数据预加载
   *
   * 默认继承`RouterOptions.beforeEach`
   */
  beforeEnter?: BeforeEnterCallback
  /**
   * 路由进入后的钩子函数，用于处理进入路由后的逻辑
   *
   * 默认继承`RouterOptions.afterEach`
   */
  afterEnter?: AfterEnterCallback
}

/**
 * 规范化路由线路配置
 */
export interface RouteNormalized extends MakeRequired<Route, 'meta' | 'pattern' | 'suffix'> {
  children: RouteNormalized[]
  widget: undefined | Record<string, RouteWidget>
  injectProps: undefined | InjectNamedProps
}

/**
 * 只读规范化路由线路配置
 */
export type ReadonlyRouteNormalized = DeepReadonly<RouteNormalized>

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
