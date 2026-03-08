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
export { default as routes } from 'virtual:vitarx-router:routes'
export { handleHotUpdate } from './handleHotUpdate.js'
export { definePage } from './definePage.js'
