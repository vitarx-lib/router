import RouterCore from './router-core.js'
import RouterHistory from './router-history.js'
import RouterMemory from './router-memory.js'
import type { ReadonlyRouteLocation, Route, RouterOptions } from './router-types.js'

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
 * @return {RouterMemory} - `RouterMemory`内存路由器实例
 */
export function createRouter(options: MakeRequired<RouterOptions<'memory'>, 'mode'>): RouterMemory

/**
 * 创建WebHistory路由器，path模式
 *
 * 基于History API实现路由功能，支持浏览器前进后退、刷新等操作。
 *
 * @remarks
 * 部署到服务器上时需要配置重定向，否则会出现404错误。
 *
 * nginx
 * ```nginx
 * location / {
 *   try_files $uri $uri/ /index.html;
 * }
 * ```
 * Apache
 * ```Apache
 * <IfModule mod_negotiation.c>
 *   Options -MultiViews
 * </IfModule>
 *
 * <IfModule mod_rewrite.c>
 *   RewriteEngine On
 *   RewriteBase /
 *   RewriteRule ^index\.html$ - [L]
 *   RewriteCond %{REQUEST_FILENAME} !-f
 *   RewriteCond %{REQUEST_FILENAME} !-d
 *   RewriteRule . /index.html [L]
 * </IfModule>
 * ```
 *
 * @param {RouterOptions} options - 路由配置
 * @return {RouterHistory} - `RouterHistory`路由器实例
 */
export function createRouter(options: MakeRequired<RouterOptions<'path'>, 'mode'>): RouterHistory

/**
 * 创建history路由器，hash模式
 *
 * 基于History API实现路由功能，支持浏览器前进后退、刷新等操作。
 *
 * @param {RouterOptions} options - 路由配置
 * @return {RouterHistory} - `RouterHistory`路由器实例
 */
export function createRouter(options: MakeRequired<RouterOptions<'hash'>, 'mode'>): RouterHistory

/**
 * 创建history路由器，默认hash模式
 *
 * 基于History API实现路由功能，支持浏览器前进后退、刷新等操作。
 *
 * @param {RouterOptions} options - 路由配置
 * @return {RouterHistory} - `RouterHistory`路由器实例
 */
export function createRouter(options: Omit<RouterOptions, 'mode'>): RouterHistory

/**
 * 创建history路由器，默认hash模式
 *
 * 基于History API实现路由功能，支持浏览器前进后退、刷新等操作。
 *
 * @param {RouterOptions} options - 路由配置
 * @return {RouterHistory|RouterMemory} - 返回对应的路由器实例
 */
export function createRouter(options: RouterOptions): RouterHistory | RouterMemory

export function createRouter(options: RouterOptions): RouterCore {
  let router: RouterCore
  // 如果非浏览器端，强制使用内存模式路由
  if (typeof window === 'undefined' && options.mode !== 'memory') {
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
 * import { useRoute,watch } from 'vitarx-router'
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
 * @return {ReadonlyRouteLocation} - 只读的`RouteLocation`对象
 */
export function useRoute(): ReadonlyRouteLocation {
  return RouterCore.instance.currentRouteLocation
}
