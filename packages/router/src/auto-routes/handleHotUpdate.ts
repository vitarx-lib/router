import type { Route, Router } from '../core/index.js'

export { default as routes } from 'virtual:vitarx-router:routes'
/**
 * 处理路由热更新函数
 *
 * 当路由配置发生变化时，动态更新路由表。
 * 支持传入回调函数，在路由更新后执行自定义逻辑（如添加重定向）。
 *
 * @param router - Vitarx Router 实例
 * @param onRoutesUpdated - 路由更新后的回调函数，接收新路由数组作为参数
 *
 * @example
 * ```TypeScript
 * import { createRouter } from 'vitarx'
 * import { routes, handleHotUpdate } from 'vitarx-router/auto-routes'
 *
 * const router = createRouter({ routes })
 *
 * function addRedirects() {
 *   router.addRoute({
 *     path: '/new-about',
 *     redirect: '/about',
 *   })
 * }
 *
 * if (import.meta.hot) {
 *   handleHotUpdate(router, (newRoutes) => {
 *     addRedirects()
 *   })
 * } else {
 *   addRedirects()
 * }
 * ```
 */
export function handleHotUpdate(
  router: Router,
  onRoutesUpdated?: (newRoutes: Route[]) => void
): void {
  if (import.meta.hot) {
    import.meta.hot.accept('virtual:vitarx-router:routes', newModule => {
      if (!newModule) return
      const routes = newModule.default
      if (routes && typeof routes === 'object') {
        router.manager.clearRoutes()

        for (const route of routes) {
          router.manager.addRoute(route)
        }

        // 路由更新完成后调用回调函数
        if (onRoutesUpdated) {
          onRoutesUpdated(routes)
        }
      }
    })
  }
}
