import type { Route, RouteNormalized, RouterOptions } from '../types/index.js'
import { formatPath } from '../utils.js'
import normalizeRouteComponent from './component.js'
import normalizeInjectProps from './inject-props.js'

/**
 * 规范化路由对象
 *
 * @param route
 * @param group
 * @param suffix
 * @internal
 */
export default function normalizeRoute(
  route: Route,
  group: RouteNormalized | undefined,
  suffix: RouterOptions['suffix']
): RouteNormalized {
  // 初始化必要的属性
  route.meta = route.meta || {}
  route.pattern = route.pattern || {}
  route.children = route.children || []

  // 验证 children 是否为数组
  if (!Array.isArray(route.children)) {
    throw new TypeError(
      `[Router] Route "${route.path}" has invalid "children" configuration, it must be an array type.`
    )
  }
  if (!route.path.trim()) {
    throw new TypeError(`[Router] Route configuration "path" cannot be empty`)
  }
  // 格式化路径
  route.path = formatPath(group ? `${group.path}/${route.path}` : route.path)
  // 规范化injectProps
  normalizeInjectProps(route)
  // 规范化widget
  normalizeRouteComponent(route)
  // 合并父级的配置
  route.suffix ??= group?.suffix ?? suffix
  route.afterEnter ??= group?.afterEnter
  route.beforeEnter ??= group?.beforeEnter

  return route as RouteNormalized
}
