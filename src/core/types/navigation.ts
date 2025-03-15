import type { WidgetType } from 'vitarx'
import type { RouteNormalized } from './route'

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
 * 路由路径
 *
 * 必须以/开头的字符串
 */
export type RoutePath = `/${string}`

/**
 * 命名路由
 *
 * 用于标识路由的唯一名称
 */
export type RouteName = string

/**
 * 路由索引
 *
 * 可以是路径或命名路由
 */
export type RouteIndex = RouterRouteIndexTyped

/**
 * 路由视图小部件
 *
 * 可以是普通组件或懒加载组件
 */
export type RouteWidget = WidgetType

/**
 * 命名的路由视图小部件
 *
 * 用于多视图布局
 */
export type NamedRouteWidget<K extends string = string> = Record<K, RouteWidget>

/**
 * 允许的路由小部件联合类型
 *
 * 可以是单个视图组件或命名视图组件的记录
 */
export type AllowedRouteWidget = RouteWidget | NamedRouteWidget

/**
 * 路由目标
 *
 * 用于描述导航的目标位置
 */
export interface RouteTarget {
  /**
   * 路由索引，/开头为路径，否则为名称
   */
  index: RouteIndex
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
  params?: Record<string, any>
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
 * 枚举值：
 * 0. success: 导航成功
 * 1. aborted: 导航被阻止
 * 2. cancelled: 导航被取消
 * 3. duplicated: 重复导航
 * 4. not_matched: 路由未匹配
 * 5. exception: 捕获到异常
 */
export enum NavigateStatus {
  /**
   * 导航成功
   */
  success,
  /**
   * 导航被阻止
   */
  aborted,
  /**
   * 导航被取消
   *
   * 正在等待中间件处理结果时又触发了新的导航请求
   */
  cancelled,
  /**
   * 重复导航
   */
  duplicated,
  /**
   * 路由未匹配
   */
  not_matched,
  /**
   * 捕获到异常
   */
  exception
}

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
  redirectFrom: RouteTarget | undefined
  /**
   * 捕获到的异常
   */
  error?: unknown
}
