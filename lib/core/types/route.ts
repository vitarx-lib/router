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
 * 路由元数据
 */
export interface RouteMeta {
  [key: string]: any
}

/**
 * 重定向处理器
 */
export type RedirectHandler = (this: RouterCore, to: RouteLocation) => RouteTarget

/**
 * 路由路线配置
 */
export interface Route<W extends AllowedRouteWidget = AllowedRouteWidget> {
  path: RoutePath
  pattern?: Record<string, RegExp>
  name?: string
  widget?: W
  redirect?: RouteTarget | RedirectHandler
  children?: Route[]
  meta?: RouteMeta
  suffix?: '*' | string | string[] | false
  injectProps?: (W extends NamedRouteWidget<infer k> ? InjectNamedProps<k> : InjectProps) | boolean
  beforeEnter?: BeforeEnterCallback
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
