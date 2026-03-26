import { inject } from 'vitarx'
import { __ROUTER_KEY__ } from '../common/constant.js'
import type { Router } from '../router/index.js'

/**
 * 获取路由器实例
 *
 * 可以传入一个 `true` 来抑制抛出异常，未找到路由器时返回 null
 *
 * @return {Router} - 路由器实例
 * @throws {Error} - 如果未创建路由器实例，则会抛出异常
 */
export function useRouter(): Router

/**
 * 获取路由器实例
 *
 *
 * @param {boolean} allowEmpty - 是否允许返回空值
 * @return {Router | null} - 如果存在则返回路由器实例
 */
export function useRouter(allowEmpty: false): Router | null

/**
 * 获取路由器实例
 *
 * @param {boolean} allowEmpty - 是否允许返回空值
 * @return {Router} - 路由器实例
 * @throws {Error} - 如果未创建路由器实例，则会抛出异常
 */
export function useRouter(allowEmpty: true): Router

/**
 * 获取路由器实例
 *
 * @param allowEmpty - 是否允许返回空值
 * @return {Router | null} - 如果存在则返回路由器实例，否则返回 null
 * @throws {Error} - 如果未创建路由器实例且不允许返回空值，则会抛出异常
 */
export function useRouter(allowEmpty: boolean = false): Router | null {
  const router = inject<Router | null>(__ROUTER_KEY__, null)
  if (!allowEmpty && !router) {
    throw new Error('[Router] Router instance not found')
  }
  return router
}
