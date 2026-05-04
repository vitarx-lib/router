import type { RouteNode } from '../types/index.js'

/**
 * 查找路由
 *
 * @param routes - 路由列表
 * @param path - 路径
 */
export function findRoute(routes: RouteNode[], path: string): RouteNode | null {
  for (const route of routes) {
    if (!route.isGroup && route.fullPath === path) return route
    if (route.isGroup && route.children) {
      for (const child of route.children) {
        if (child.fullPath === path) return route
        if (child.isGroup && child.children) {
          return findRoute(child.children, path)
        }
      }
    }
  }
  return null
}
