import type { PageNode } from './page.js'
import type { RouteNode } from './route.js'

/**
 * 扩展路由的钩子
 *
 * 支持对 route 的数据直接进行修改，但不可修改 children ！
 *
 * @param route - 路由节点
 * @param page - 页面节点
 */
export type ExtendRouteHook = (route: RouteNode, page: Readonly<PageNode>) => void

/**
 * 代码转换函数
 *
 * @param content - 代码内容
 * @param file - 文件路径
 * @returns - 转换后的代码内容
 */
export type CodeTransformHook = (content: string, file: string) => string
