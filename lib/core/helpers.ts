import type { LazyLoader, Reactive, WidgetType } from 'vitarx'
import RouterCore from './router-core.js'
import RouterHistory from './router-history.js'
import RouterMemory from './router-memory.js'
import type { LazyLoad, Route, RouteLocation, RouterOptions } from './router-types.js'
import { LAZY_LOADER_SYMBOL } from './utils.js'

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
 * @return {RouterMemory} - 内存路由器实例
 */
export function createRouter(options: RouterOptions & { mode: 'memory' }): RouterMemory

/**
 * 创建History路由器
 *
 * 基于History API实现路由功能，支持浏览器前进后退、刷新等操作。
 *
 * 它与`MemoryRouter`路由不同的是，它不需要初始化过后调用`router.replace(target)`方法来替换默认路由，
 * 内部会自动根据`window.location`去匹配路由。
 *
 * @param {RouterOptions} options - 路由配置
 * @return {RouterHistory} - HistoryRouter实例
 */
export function createRouter(
  options: RouterOptions | (RouterOptions & { mode: 'path' | 'hash' })
): RouterHistory

/**
 * 创建路由器
 *
 * @param {RouterOptions} options - 路由配置
 * @return {RouterCore} - 路由器实例
 */
export function createRouter(options: RouterOptions): RouterCore {
  let router: RouterCore
  // 如果非浏览器端，强制使用内存模式路由
  if (!window?.location && options.mode !== 'memory') {
    console.warn('当前环境非浏览器端，强制使用内存模式路由')
    options.mode = 'memory'
    return new RouterMemory(options as RouterOptions<'memory'>).initialize()
  }
  if (options.mode === 'memory') {
    router = new RouterMemory(options as RouterOptions<'memory'>)
  } else {
    router = new RouterHistory(options as RouterOptions<'path' | 'hash'>)
  }
  return router.initialize()
}

/**
 * 获取路由器实例
 *
 * 与使用`Router.instance`静态属性获取是一致的效果。
 *
 * @return {RouterCore} - 路由器实例
 * @throws {Error} - 如果路由器实例未初始化，则抛出异常
 */
export function useRouter<T extends RouterCore>(): T {
  return RouterCore.instance as T
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
  return RouterCore.instance.currentRouteLocation
}

/**
 * ## 标记延迟加载
 *
 * 由于直接定义`() => import('./xxx.js')`会导致类型与函数式组件冲突，
 * 在未执行函数之前难以有效判断其类型，所以这里使用Symbol标记懒加载器。
 *
 * @example
 * lazy(() => import('./xxx.js'))
 *
 * @template T - WidgetType
 * @param {LazyLoader<T>} lazyLoader - 函数返回的import即是惰性加载器
 */
export function lazy<T extends WidgetType>(lazyLoader: LazyLoader<T>): LazyLoad<T> {
  Object.defineProperty(lazyLoader, LAZY_LOADER_SYMBOL, {
    value: true
  })
  return lazyLoader as LazyLoad<T>
}
