import { inject, logger } from 'vitarx'
import { __ROUTER_KEY__, type NavState } from '../common/constant.js'
import type { NavigateResult, Route, RouteLocation, RouterOptions } from '../types/index.js'
import { RouteManager, type RouteManagerOptions } from './manager.js'
import { MemoryRouter } from './memory.js'
import type { Router } from './router.js'
import { WebRouter } from './web.js'

/**
 * 定义路由表
 *
 * 使用defineRoutes定义路由表可以获得更好的代码提示。
 *
 * @param {Route[]} routes - 路由配置表
 * @return {Route[]} - 路由配置表
 */
export function defineRoutes(...routes: Route[]): Route[] {
  return routes
}

/**
 * 创建并返回一个新的路由管理器实例
 *
 * @param routes - 路由配置数组，包含应用的所有路由信息
 * @param options - 可选的路由管理器配置选项，用于自定义路由管理器的行为
 * @returns {RouteManager} - 返回一个新创建的 RouteManager 实例
 */
export function createRouteManager(routes: Route[], options?: RouteManagerOptions): RouteManager {
  return new RouteManager(routes, options)
}
/**
 * 创建路由实例的工厂函数
 *
 * @param {RouterOptions} options - 路由配置选项
 * @param options.routes - 路由配置表或管理器
 * @param [options.base='/'] - 基础路径
 * @param [options.mode='hash'] - URL模式
 * @param [options.suffix=''] - 强制后缀
 * @param [options.scrollBehavior] - 滚动行为
 * @param [options.beforeEach] - 全局前置钩子
 * @param [options.afterEach] - 全局后置钩子
 * @param [options.missing] - 未匹配时要渲染的组件
 * @param [options.onNotFound] - 导航不匹配时触发的回调函数
 * @param {boolean} [skipEnvWarn=false] - 是否跳过浏览器检查
 * @returns {Router} 返回路由实例，根据环境返回不同类型的路由
 *
 */
export function createRouter(options: RouterOptions, skipEnvWarn: boolean = false): Router {
  // 如果非浏览器端，强制使用内存模式路由
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
    // 记录警告日志，提示当前为非浏览器环境
    if (!skipEnvWarn) {
      logger.warn(
        '[Router] createRouter() - Non-browser environment detected, forcing memory mode routing, please use createMemoryRouter'
      )
    }
    return new MemoryRouter(options)
  }
  return new WebRouter(options)
}

/**
 * 创建Web模式路由实例
 *
 * @param options - 路由配置选项
 * @param {RouterOptions} options - 路由配置选项
 * @param options.routes - 路由配置表或管理器
 * @param [options.base] - 基础路径
 * @param [options.mode] - URL模式
 * @param [options.suffix] - 强制后缀
 * @param [options.scrollBehavior] - 滚动行为
 * @param [options.beforeEach] - 全局前置钩子
 * @param [options.afterEach] - 全局后置钩子
 * @param [options.missing] - 未匹配时要渲染的组件
 * @param [options.onNotFound] - 导航不匹配时触发的回调函数
 * @returns {WebRouter} 返回Web模式路由实例
 */
export function createWebRouter(options: RouterOptions): WebRouter {
  return new WebRouter(options)
}

/**
 * 创建内存模式路由实例
 *
 * @param options - 路由配置选项
 * @param {RouterOptions} options - 路由配置选项
 * @param options.routes - 路由配置表或管理器
 * @param [options.base] - 基础路径
 * @param [options.mode] - URL模式
 * @param [options.suffix] - 强制后缀
 * @param [options.scrollBehavior] - 滚动行为
 * @param [options.beforeEach] - 全局前置钩子
 * @param [options.afterEach] - 全局后置钩子
 * @param [options.missing] - 未匹配时要渲染的组件
 * @param [options.onNotFound] - 导航不匹配时触发的回调函数
 * @returns {MemoryRouter} 返回内存模式路由实例
 */
export function createMemoryRouter(options: RouterOptions): Router {
  return new MemoryRouter(options)
}

/**
 * 获取路由器实例
 *
 * 可以传入一个 `true` 来抑制抛出异常，未找到路由器时返回 null
 *
 * @return {Router} - 路由器实例
 * @throws {Error} - 如果未创建路由器实例，则会抛出异常
 */
export function useRouter<T extends Router>(): T

/**
 * 获取路由器实例
 *
 *
 * @param {boolean} allowEmpty - 是否允许返回空值
 * @return {Router | null} - 如果存在则返回路由器实例
 */
export function useRouter<T extends Router>(allowEmpty: false): T | null

/**
 * 获取路由器实例
 *
 * @param {boolean} allowEmpty - 是否允许返回空值
 * @return {Router} - 路由器实例
 * @throws {Error} - 如果未创建路由器实例，则会抛出异常
 */
export function useRouter<T extends Router>(allowEmpty: true): T

/**
 * 获取路由器实例
 *
 * @param allowEmpty - 是否允许返回空值
 * @return {Router | null} - 如果存在则返回路由器实例，否则返回 null
 * @throws {Error} - 如果未创建路由器实例且不允许返回空值，则会抛出异常
 */
export function useRouter<T extends Router>(allowEmpty: boolean = false): T | null {
  const router = inject<T | null>(__ROUTER_KEY__, null)
  if (!allowEmpty && !router) {
    throw new Error('[Router] Router instance not found')
  }
  return router
}

/**
 * 获取当前`RouteLocation`对象
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
 * @return {RouteLocation} - 只读的`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例，则会抛出异常
 */
export function useRoute(): RouteLocation {
  return useRouter().currentRoute
}

/**
 * 检查导航结果是否包含指定的状态
 * 支持 "按位或" 操作符进行多状态检查
 *
 * @param result - 导航结果
 * @param status - 要检查的状态
 * @returns {boolean} - 如果导航结果包含指定状态则返回true，否则返回false
 */
export function hasNavState(result: NavigateResult, status: NavState): boolean {
  // 导航状态检查函数，接收导航结果和状态作为参数
  return (result.state & status) === result.state
}
