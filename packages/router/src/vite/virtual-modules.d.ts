/**
 * @fileoverview 虚拟模块类型声明
 *
 * 为 virtual:vitarx-router:routes 和 virtual:vitarx-router:types 虚拟模块提供类型声明。
 */

declare module 'virtual:vitarx-router:routes' {
  import type { Route } from '../../core/index.js'
  const routes: Route[]
  export default routes
}

declare module 'virtual:vitarx-router:types' {
  export interface RouteIndexMap {
    [key: string]: {
      params?: Record<string, string | number>
    }
  }
}
