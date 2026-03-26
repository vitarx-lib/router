import { logger } from 'vitarx'
import { RouteManager, type RouteManagerOptions } from '../router/manager.js'
import { MemoryRouter } from '../router/memory.js'
import { WebRouter } from '../router/web.js'
import type { Route, RouterOptions } from '../types/index.js'

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
export function createMemoryRouter(options: RouterOptions): MemoryRouter {
  return new MemoryRouter(options)
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
export function createRouter(
  options: RouterOptions,
  skipEnvWarn: boolean = false
): WebRouter | MemoryRouter {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
    if (!skipEnvWarn) {
      logger.warn(
        '[Router] createRouter() - Non-browser environment detected, forcing memory mode routing, please use createMemoryRouter'
      )
    }
    return createMemoryRouter(options)
  }
  return createWebRouter(options)
}
