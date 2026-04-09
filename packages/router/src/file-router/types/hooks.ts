import type { ParsedNode, RouteNode } from './route.js'

/**
 * 扩展路由的钩子
 *
 * 支持对 route 的数据直接进行修改，但不可修改 children ！
 *
 * @param route - 生成的路由节点
 * @param parsed - 解析的路由节点
 */
export type ExtendRouteHook = (route: RouteNode, parsed: Readonly<ParsedNode>) => void

/**
 * 代码转换函数
 *
 * @param content - 代码内容
 * @param file - 文件路径
 * @returns - 转换后的代码内容
 */
export type CodeTransformHook = (content: string, file: string) => string
