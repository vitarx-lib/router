import type { Component, DeepReadonly } from 'vitarx'
import type { NavigateStatus } from '../constant.js'
import type { RouteNormalized } from './route.js'

/**
 * hash字符串类型
 *
 * 以#开头的字符串或空字符串
 */
export type HashStr = `#${string}` | ''

/**
 * 路由模式
 *
 * - hash: 使用URL hash实现路由
 * - path: 使用HTML5 History API实现路由
 * - memory: 使用内存实现路由
 */
export type HistoryMode = 'hash' | 'path' | 'memory'

/**
 * 路由组件
 *
 * 可以是普通组件或懒加载组件
 */
export type RouteComponent = Component

/**
 * 命名的路由视图小部件
 *
 * 用于多视图布局
 */
export type NamedRouteComponent<K extends string = string> = Record<K, RouteComponent>

/**
 * 允许的路由小部件联合类型
 *
 * 可以是单个视图组件或命名视图组件的记录
 */
export type AllowedRouteComponent = RouteComponent | NamedRouteComponent

/**
 * 路由索引类型
 */
interface BaseNavigateOptions<T extends RouteIndex> {
  /**
   * 路由索引，/开头为路径，否则为名称
   */
  index: T
  /**
   * URL hash
   */
  hash?: HashStr
  /**
   * URL 查询参数
   */
  query?: Record<string, string>
  /**
   * 路由参数
   */
  params?: Record<string, string | number>
}

/**
 * 路由目标
 *
 * 用于描述导航的目标位置
 */
export interface NavigateTarget extends BaseNavigateOptions<RouteIndex> {
  /**
   * 是否替换当前路由
   */
  isReplace?: boolean
}

/**
 * 路由匹配的详情数据
 *
 * 所有和url相关的数据都已`decodeURIComponent`解码
 */
export interface RouteLocation {
  /**
   * 标识
   */
  readonly __is_route_location: true
  /**
   * 路由索引，调用`push`|`replace`时传入的index
   */
  index: RouteIndex
  /**
   * 完整的path，包含了query和hash
   */
  fullPath: string
  /**
   * `index`所带的后缀
   *
   * 如果没有后缀则为空字符串
   */
  suffix: '' | `.${string}`
  /**
   * 路由路径
   *
   * 如果匹配到路由则为路由的`path`属性
   */
  path: `/${string}`
  /**
   * URL hash
   */
  hash: HashStr
  /**
   * 路由参数
   */
  params: Record<string, any>
  /**
   * URL 查询参数
   */
  query: Record<string, string>
  /**
   * 路由元数据
   */
  meta: RouteMetaData
  /**
   * 匹配的路由记录
   *
   * 从根路由开始，到当前路由结束
   */
  matched: RouteNormalized[]
}

/**
 * 只读路由位置对象
 */
export type ReadonlyRouteLocation = DeepReadonly<RouteLocation>

/**
 * 导航结果
 *
 * 包含导航的状态和相关信息
 */
export interface NavigateResult {
  /**
   * 导航状态
   */
  status: NavigateStatus
  /**
   * 状态描述
   */
  message: string
  /**
   * 最终的导航数据
   */
  to: ReadonlyRouteLocation
  /**
   * 导航完成前的路由数据
   */
  from: ReadonlyRouteLocation
  /**
   * 如果在守卫过程中被重定向，则为最初的路由目标
   */
  redirectFrom: NavigateTarget | undefined
  /**
   * 捕获到的异常
   */
  error?: unknown
}

export interface TypesConfig {
  RouteNamedMap: {}
}

/**
 * 路由索引
 *
 * 可以是路径或路由命名
 */
export type RouteIndex = keyof TypesConfig['RouteNamedMap'] extends never
  ? string
  : keyof TypesConfig['RouteNamedMap']

/**
 * 导航选项
 */
export type NavigateOptions<T extends RouteIndex = RouteIndex> =
  keyof TypesConfig['RouteNamedMap'] extends never
    ? BaseNavigateOptions<T>
    : T extends keyof TypesConfig['RouteNamedMap']
      ? BaseNavigateOptions<T> & TypesConfig['RouteNamedMap'][T]
      : BaseNavigateOptions<T>
