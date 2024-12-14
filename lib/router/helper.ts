import type { Route, RouterOptions } from './type.js'
import Router from './router.js'
import HistoryRouter from './history-router.js'
import MemoryRouter from './memory-router.js'
import HashRouter from './hash-router.js'

/**
 * 定义路由表
 *
 * 使用defineRoutes定义路由表可以获得更好的代码提示。
 *
 * @param {Route[]} routes - 路由配置表
 */
export function defineRoutes(...routes: Route[]): Route[] {
  return routes
}

/**
 * 定义路由
 *
 * 使用defineRoute定义路由可以获得更好的代码提示。
 *
 * @param {Route} route - 路由配置
 */
export function defineRoute(route: Route): Route {
  return route
}

/**
 * 创建内存路由器
 *
 * 不支持浏览器的前进后退等操作，只能通过实例中的方法来管理路由。
 *
 * 你必须调用一次`router.replace(target)`方法来跳转到目标路由。
 *
 * @param {RouterOptions} options - 配置
 * @return {MemoryRouter} - 内存路由器实例
 */
export function createRouter(options: RouterOptions & { mode: 'memory' }): MemoryRouter
/**
 * 创建Hash路由器
 *
 *
 * @param {RouterOptions} options - 配置
 * @return {HashRouter} - hash路由器实例
 */
export function createRouter(options: RouterOptions & { mode: 'hash' }): HashRouter
/**
 * 创建History路由器
 *
 * 基于History API实现路由功能，支持浏览器前进后退、刷新等操作。
 *
 * 它与`MemoryRouter`路由不同的是，它不需要初始化过后调用`router.replace(target)`方法来替换默认路由，
 * 内部会自动根据`window.location`去匹配路由。
 *
 * @param {RouterOptions} options - 路由配置
 * @return {HistoryRouter} - HistoryRouter实例
 */
export function createRouter(
  options:
    | RouterOptions
    | (RouterOptions & {
        mode: 'path'
      })
): HistoryRouter
export function createRouter(options: RouterOptions): Router {
  let router: Router
  switch (options.mode) {
    case 'memory':
      router = new MemoryRouter(options)
      break
    case 'hash':
      router = new HashRouter(options)
      break
    default:
      return new HistoryRouter(options)
  }
  return router.initialize()
}

/**
 * 获取路由器实例
 *
 * 与使用`Router.instance`静态属性获取是一致的效果。
 *
 * @return {Router} - 路由器实例
 * @throws {Error} - 如果路由器实例未初始化，则抛出异常
 */
export function useRouter<T extends Router>(): T {
  return Router.instance as T
}
