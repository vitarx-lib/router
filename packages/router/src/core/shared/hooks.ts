import { onScopeDispose } from 'vitarx'
import { useRouter } from '../router/helpers.js'
import type { RouteLeaveGuard, RouteUpdateCallback } from '../types/index.js'

/**
 * 注册一个路由离开守卫（Route Leave Guard），在当前路由即将离开时触发。
 * 该守卫会在组件卸载时自动清理。
 *
 * @param guard - 路由离开守卫函数，用于控制路由是否允许离开
 * @returns void
 *
 * @remarks
 * - 该函数依赖于当前活动的路由器实例，如果没有活动的路由器会发出警告
 * - 守卫函数会被添加到当前路由的 leaveGuards 集合中
 * - 当组件作用域销毁时，会自动移除该守卫
 *
 * @example
 * ```typescript
 * onBeforeRouteLeave((to, from) => {
 *   const answer = window.confirm('确定要离开吗？')
 *   // 返回 false 将阻止路由离开
 *   if (!answer) return false
 * })
 * ```
 */
export function onBeforeRouteLeave(guard: RouteLeaveGuard): void {
  const router = useRouter(true)
  if (!router) {
    console.warn('[Router]: onBeforeRouteLeave is called but there is no active router.')
    return void 0
  }
  const route = router['_routeLocation'].value
  if (route.leaveGuards) {
    route.leaveGuards.add(guard)
  } else {
    route.leaveGuards = new Set([guard])
  }
  onScopeDispose(() => route.leaveGuards?.delete(guard))
}

/**
 * 注册一个在路由更新之前执行的回调函数
 *
 * @internal
 * @param cb - 路由更新前执行的回调函数
 * @returns void
 *
 * @remarks
 * 该函数用于在路由更新前添加钩子函数，当路由即将更新时会被调用。
 * 如果没有活动的路由器实例，会在控制台输出警告信息。
 *
 * @example
 * ```typescript
 * onBeforeRouteUpdate((to, from) => {
 *   console.log('参数 id 从', from.params.id, '更新到', to.params.id)
 * })
 * ```
 */
export function onBeforeRouteUpdate(cb: RouteUpdateCallback): void {
  const router = useRouter(true)
  if (!router) {
    console.warn('[Router]: onBeforeRouteUpdate is called but there is no active router.')
    return void 0
  }
  const route = router['_routeLocation'].value
  if (route.beforeUpdateHooks) {
    route.beforeUpdateHooks.add(cb)
  } else {
    route.beforeUpdateHooks = new Set([cb])
  }
  onScopeDispose(() => route.beforeUpdateHooks?.delete(cb))
}
