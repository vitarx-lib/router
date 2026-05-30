/**
 * @fileoverview 自动路由模块
 *
 * 该模块重新导出虚拟模块生成的路由配置。
 * 开发者应该从 `vitarx-router/auto-routes` 导入 routes。
 *
 * @example
 * ```typescript
 * import { routes, handleHotUpdate } from 'vitarx-router/auto-routes'
 *
 * const router = createRouter({ routes })
 *
 * if (import.meta.hot) {
 *   handleHotUpdate(router)
 * }
 * ```
 */
import virtualRoutes from 'virtual:vitarx-router:routes'
import type { Route, Router } from '../core/index.js'

/**
 * 自动生成的路线配置
 */
export const routes: Route[] = virtualRoutes

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
        if (typeof window === 'undefined') return
        const matchedRoute = router.matchRoute({
          index: router.route.matched.at(-1)?.name || router.route.path,
          params: { ...router.route.params },
          query: { ...router.route.query },
          hash: router.route.hash
        })
        // 如果没有匹配到路由，则重新加载页面
        if (!matchedRoute) {
          return window.location.reload()
        }
        // 热更新meta信息
        const meta = router['_routeLocation'].meta
        for (const key in meta) {
          if (!(key in matchedRoute.meta)) {
            delete meta[key]
          }
        }
        for (const key in matchedRoute.meta) {
          meta[key] = matchedRoute.meta[key]
        }
      }
    })
  }
}
