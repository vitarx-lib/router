import type { RouteNode } from '../types/index.js'

/**
 * 查找路由
 *
 * @param routes - 路由列表
 * @param path - 路径
 */
export function findRoute(routes: RouteNode[], path: string): RouteNode | null {
  for (const route of routes) {
    if (!route.isGroup) {
      if (route.fullPath === path) return route
    } else if (route.children) {
      const result = findRoute(route.children, path)
      if (result) return result
    }
  }
  return null
}
