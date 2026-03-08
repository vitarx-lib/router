import type { Route } from '../../core/index.js'
import type Router from '../../core/router-core.js'

export function handleHotUpdate(router: Router): void {
  if (import.meta.hot) {
    import.meta.hot!.accept('virtual:vitarx-router:routes', newRoutes => {
      if (newRoutes && typeof newRoutes === 'object' && 'routes' in newRoutes) {
        const routes = newRoutes.routes as Route[]
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
      }
    })
  }
}
