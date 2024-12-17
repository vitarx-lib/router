import type { Route, RouteLocation, RouterOptions } from './type.js'
import Router from './router.js'
import WebHistoryRouter from './web-history-router.js'
import MemoryRouter from './memory-router.js'
import type { Reactive } from 'vitarx'

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
 * 创建History路由器
 *
 * 基于History API实现路由功能，支持浏览器前进后退、刷新等操作。
 *
 * 它与`MemoryRouter`路由不同的是，它不需要初始化过后调用`router.replace(target)`方法来替换默认路由，
 * 内部会自动根据`window.location`去匹配路由。
 *
 * @param {RouterOptions} options - 路由配置
 * @return {WebHistoryRouter} - HistoryRouter实例
 */
export function createRouter(
  options:
    | RouterOptions
    | (RouterOptions & {
        mode: 'path' | 'hash'
      })
): WebHistoryRouter
export function createRouter(options: RouterOptions): Router {
  let router: Router
  // 如果非浏览器端，强制使用内存模式路由
  if (!window?.location && options.mode !== 'memory') {
    console.warn('当前环境非浏览器端，强制使用内存模式路由')
    options.mode = 'memory'
    return new MemoryRouter(options as RouterOptions<'memory'>).initialize()
  }
  if (options.mode === 'memory') {
    router = new MemoryRouter(options as RouterOptions<'memory'>)
  } else {
    router = new WebHistoryRouter(options as RouterOptions<'path' | 'hash'>)
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

/**
 * 获取当前`RouteLocation`对象
 *
 * 它是`Router.instance.currentRouteLocation`属性的助手函数，优化函数式编程体验。
 *
 * 简单示例：
 * ```jsx
 * import { useRoute } from 'vitarx-router'
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
 * @return {Readonly<Reactive<RouteLocation>>} - 只读的`RouteLocation`对象
 */
export function useRoute(): Readonly<Reactive<RouteLocation>> {
  return Router.instance.currentRouteLocation
}
