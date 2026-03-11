import type { Route, Router } from '../../core/index.js'

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
    import.meta.hot!.accept('virtual:vitarx-router:routes', newRoutes => {
      if (newRoutes && typeof newRoutes === 'object' && 'default' in newRoutes) {
        const routes = newRoutes.default as Route[]
        const existingRoutes = [...router.routes]

        for (const route of existingRoutes) {
          if (route.name) {
            router.removeRoute(route.name)
          } else {
            router.removeRoute(route.path)
          }
        }

        for (const route of routes) {
          router.addRoute(route)
        }

        // 路由更新完成后调用回调函数
        if (onRoutesUpdated) {
          onRoutesUpdated(routes)
        }

        // 强制重新导航到当前路由，跳过重复检查
        router.navigate({
          index: router.route.index,
          params: { ...router.route.params },
          query: { ...router.route.query },
          hash: router.route.hash,
          replace: true,
          force: true
        })
      }
    })
  }
}
