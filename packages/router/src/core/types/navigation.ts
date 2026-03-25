import type { DeepReadonly } from 'vitarx'
import { type NavState } from '../common/constant.js'
import type { RouteIndex, RouteIndexMap, RouteMetaData, RoutePath, RouteRecord } from './route.js'

/**
 * URL 路径参数
 */
export type URLParams = Record<string, string>
/**
 * URL 查询参数
 */
export type URLQuery = Record<string, string>

/**
 * URL hash
 */
export type URLHash = `#${string}`

/**
 * URL 路径生成模式
 *
 * - hash: 使用hash模式生成href，支持无服务端重定向刷新页面。
 * - path: 使用常规path模式生成href，需搭配服务端重定向使用。
 */
export type URLMode = 'hash' | 'path'

/**
 * 路由位置 (原始对象)
 */
export interface RouteLocationRaw {
  /**
   * 完整的href
   */
  href: string
  /**
   * 路由路径
   *
   * 可用于导航的路由path
   */
  path: RoutePath
  /**
   * URL hash
   */
  hash: URLHash | ''
  /**
   * 路由参数
   *
   * 具有响应性，可持续监听
   */
  params: URLParams
  /**
   * URL 查询参数
   *
   * 具有响应性，可持续监听
   */
  query: URLQuery
  /**
   * 路由元数据
   */
  meta: RouteMetaData
  /**
   * 匹配的路由记录
   *
   * 从根路由开始，到当前路由结束
   */
  matched: RouteRecord[]
  /**
   * 如果在守卫过程中被重定向，
   * 则为最初需要导航的路由位置
   */
  redirectFrom?: RouteLocation
}

/**
 * 当前路由位置 (对外只读)
 */
export type RouteLocation = DeepReadonly<RouteLocationRaw>

/**
 * 路由索引类型
 */
interface BaseNavOptions<T extends RouteIndex> {
  /**
   * 路由索引，/开头为路径，否则为名称
   */
  index: T
  /**
   * URL hash
   */
  hash?: URLHash | ''
  /**
   * URL 查询参数
   */
  query?: URLQuery
  /**
   * 路由参数
   */
  params?: URLParams
}

/**
 * 路由目标
 *
 * 用于描述导航的目标位置
 */
export interface NavTarget<T extends RouteIndex = RouteIndex> extends NavOptions<T> {
  /**
   * 是否替换当前历史记录
   *
   * @default false
   */
  replace?: boolean
}

/**
 * 导航配置
 */
export type NavOptions<T extends RouteIndex = RouteIndex> = keyof RouteIndexMap extends never
  ? BaseNavOptions<T>
  : T extends keyof RouteIndexMap
    ? Omit<BaseNavOptions<T>, keyof RouteIndexMap[T]> & RouteIndexMap[T]
    : BaseNavOptions<T>

/**
 * 导航结果
 *
 * 包含导航的状态和相关信息
 */
export interface NavigateResult {
  /**
   * 导航状态
   */
  state: NavState
  /**
   * 状态描述
   */
  message: string
  /**
   * 目标路由位置
   *
   * `state !== NavState.notfound` 时存在
   */
  to: RouteLocation | null
  /**
   * 来源路由位置
   */
  from: RouteLocation
  /**
   * 重定向来源
   */
  redirectFrom?: RouteLocation
}
