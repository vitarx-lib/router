import type { Router } from '../router/router.js'
import type { NavigateTarget, RouteLocationRaw } from './navigation.js'
import type { RouteIndex } from './route.js'

/**
 * 守卫结果
 *
 * - false: 阻止导航
 * - NavigateTarget / RouteIndex: 重定向到新目标
 * - void: 继续导航
 * - Promise: 异步处理
 */
export type GuardResult =
  | boolean
  | NavigateTarget
  | RouteIndex
  | void
  | Promise<boolean | NavigateTarget | RouteIndex | void>

/**
 * 前置守卫钩子
 *
 * 触发时机: 路由匹配成功后，导航确认前。
 * 说明: 只有路由匹配成功才会触发此钩子。
 *
 * @param this - 路由器实例
 * @param to - 目标路由对象 (匹配成功，必定存在)
 * @param from - 来源路由对象
 * @returns {GuardResult}
 */
export type NavigationGuard = (
  this: Router,
  to: RouteLocationRaw,
  from: RouteLocationRaw | null
) => GuardResult

/**
 * 路由后置钩子
 *
 * 触发时机: 导航成功结束后。
 *
 * @param this - 路由器实例
 * @param to - 当前激活的路由对象
 * @param from - 上一个路由对象
 */
export type AfterCallback = (this: Router, to: RouteLocationRaw, from: RouteLocationRaw) => void

/**
 * 路由未匹配钩子
 *
 * 触发时机: 路由匹配失败 (404) 时。
 * 用途: 可用于统一跳转 404 页面或记录错误日志。
 *
 * @param this - 路由器实例
 * @param target - 用户的原始导航意图
 * @returns {NavigateTarget | RouteIndex | void} 返回新目标表示重定向，无返回值则抛出错误
 */
export type NotFoundHandler = (
  this: Router,
  target: NavigateTarget
) => NavigateTarget | void | Promise<NavigateTarget | void>

/**
 * 路由错误处理钩子
 *
 * @param this - 路由器实例
 * @param error - 错误对象
 * @param to - 目标路由对象
 * @param from - 源路由对象
 */
export type NavErrorListener = (
  this: Router,
  error: unknown,
  to: RouteLocationRaw,
  from: RouteLocationRaw
) => void
