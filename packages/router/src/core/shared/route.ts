import { type DeepReadonly, inject } from 'vitarx'
import { __ROUTER_VIEW_DEPTH_KEY__ } from '../common/constant.js'
import { createRouteProxy } from '../common/proxy.js'
import type { RouteLocation } from '../types/index.js'
import { useRouter } from './inject.js'

/**
 * 获取当前`RouteLocation`对象
 *
 * 简单示例：
 * ```jsx
 * import { useRoute,watch } from 'vitarx-router'
 *
 * // 监听路由参数变化示例
 * export default function App() {
 *  const route = useRoute()
 *  watch(()=>route.params.id, (newId, oldId) => {
 *   console.log(`监听到id参数变化, 旧值：${oldId}, 新值：${newId}`)
 *  })
 *  return <div>当前路由参数ID：{route.params.id}</div>
 * }
 * ```
 *
 * @return {RouteLocation} - 只读的`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例或路由没有就绪，则会抛出异常
 */
export function useRoute(): DeepReadonly<RouteLocation>

/**
 * 获取当前`RouteLocation`对象
 *
 * @param {boolean} global - 是否返回全局路由对象
 * @return {RouteLocation} - 只读的`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例或路由没有就绪，则会抛出异常
 */
export function useRoute(global: false): DeepReadonly<RouteLocation>

/**
 * 获取全局`RouteLocation`对象
 *
 * @param {boolean} global - 是否返回全局路由对象
 * @return {RouteLocation} - 只读的全局`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例或路由没有就绪，则会抛出异常
 */
export function useRoute(global: true): DeepReadonly<RouteLocation>

/**
 * 获取当前`RouteLocation`对象
 *
 * @param {boolean} global - 是否返回全局路由对象，默认为 false
 * @return {RouteLocation} - 只读的`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例或路由没有就绪，则会抛出异常
 */
export function useRoute(global: boolean = false): DeepReadonly<RouteLocation> {
  const router = useRouter()
  const route = router.route

  if (global) {
    return route
  }

  const depth = inject(__ROUTER_VIEW_DEPTH_KEY__, -1) + 1

  if (depth === 0 || depth >= route.matched.length) {
    return route
  }

  const record = route.matched[depth]

  if (!record) return route

  return createRouteProxy(route, record)
}
