import type { RouteNode } from './route.js'

/**
 * 扩展路由的钩子
 *
 * 支持对 route 的数据直接进行修改，
 * 但此时分组路由的children还未赋值！
 * 特殊需求可通过BeforeWriteRoutesHook钩子处理。
 *
 * @param route - 生成的路由节点
 * @param parsed - 解析的路由节点
 *
 * @example
 * ```js
 * {
 *   extendRoute(route) {
 *     if (route.path === '/home') {
 *       route.meta ??= { auth: true }
 *     }
 *   }
 * }
 * ```
 */
export type ExtendRouteHook = (route: RouteNode) => void
/**
 * 写入路由文件前的钩子
 *
 * 支持对 routes 直接进行修改亦可以返回新的路由数组。
 *
 * @param routes - 路由数组
 *
 * @example
 * ```js
 * {
 *   beforeWriteRoutes(routes) {
 *     routes.forEach(route => {
 *       if (route.path === '/') {
 *         route.path = '/home'
 *       }
 *     })
 *   }
 * }
 * ```
 */
export type BeforeWriteRoutesHook = (routes: RouteNode[]) => void | RouteNode[]
/**
 * 代码转换函数
 *
 * @param content - 代码内容
 * @param file - 文件路径
 * @returns - 转换后的代码内容
 */
export type CodeTransformHook = (content: string, file: string) => string
