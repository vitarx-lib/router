import { onScopeDispose } from 'vitarx'
import type { RouteLeaveGuard, RouteLocation, RouteUpdateCallback } from '../types/index.js'
import { useRouter } from './helpers.js'

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
export function onBeforeRouteUpdate(cb: RouteUpdateCallback) {
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

/**
 * 执行路由离开守卫（leave guards）的异步函数
 *
 * @internal
 * @param to - 目标路由位置对象
 * @param from - 当前路由位置对象
 * @returns Promise<boolean> 返回一个布尔值，表示是否允许离开当前路由
 * @description 该函数会依次执行当前路由的所有离开守卫，如果任一守卫返回 false，则阻止路由跳转
 * @example
 * // 示例用法
 * const canLeave = await runLeaveGuards(toRoute, fromRoute)
 * if (!canLeave) {
 *   console.log('路由跳转被阻止')
 * }
 */
export async function runLeaveGuards(to: RouteLocation, from: RouteLocation): Promise<boolean> {
  if (!from.leaveGuards) return true
  for (const guard of from.leaveGuards) {
    const result = await guard(to, from)
    if (result === false) return false
  }
  return true
}
/**
 * 执行路由更新前的钩子函数
 *
 * 该函数会遍历当前路由(from)的 beforeUpdateHooks 数组，并依次执行其中的钩子函数。
 * 每个钩子函数都会接收目标路由(to)和当前路由(from)作为参数。
 *
 * @internal
 * @param to - 目标路由位置对象
 * @param from - 当前路由位置对象
 * @returns void
 */
export function runRouteUpdateHooks(to: RouteLocation, from: RouteLocation): void {
  if (!from.beforeUpdateHooks) return
  for (const hook of from.beforeUpdateHooks) {
    hook(to, from)
  }
}
