import type RouterCore from '../router-core.js'
import type { ReadonlyRouteLocation, RouteIndex, RouteTarget } from './navigation.js'

/**
 * 路由前置钩子返回值
 *
 * - boolean: true继续导航,false阻止导航
 * - RouteTarget: 重定向到新的目标
 * - string: 重定向到新的path/name
 * - void: 继续导航
 * - Promise: 异步处理,resolve的值同上
 */
export type BeforeEachCallbackResult =
  | boolean
  | RouteTarget
  | RouteIndex
  | void
  | Promise<boolean | RouteTarget | RouteIndex | void>

/**
 * 路由前置钩子
 *
 * 在导航确认前调用,可以通过返回false来取消导航
 *
 * @param this - 路由器实例
 * @param to - 即将要进入的目标路由对象
 * @param from - 当前导航正要离开的路由对象
 * @returns {BeforeEachCallbackResult} 返回false可以取消导航
 */
export type BeforeEnterCallback = (
  this: RouterCore,
  to: ReadonlyRouteLocation,
  from: ReadonlyRouteLocation
) => BeforeEachCallbackResult

/**
 * 路由后置钩子
 *
 * 在导航确认后调用
 *
 * @param this - 路由器实例
 * @param to - 即将要进入的目标路由对象
 * @param from - 当前导航正要离开的路由对象
 * @returns {void}
 */
export type AfterEnterCallback = (
  this: RouterCore,
  to: ReadonlyRouteLocation,
  from: ReadonlyRouteLocation
) => void
