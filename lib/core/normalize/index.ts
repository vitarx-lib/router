import type { Route, RouteNormalized, RouterOptions } from '../types/index.js'
import { formatPath } from '../utils.js'
import normalizeInjectProps from './inject-props.js'
import normalizeRouteWidget from './widget.js'

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
      `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置 children 类型错误，它必须是数组类型。`
    )
  }
  if (!route.path.trim()) {
    throw new TypeError(`[Vitarx.Router][TYPE_ERROR]：路由线路配置 path 不能为空`)
  }
  // 格式化路径
  route.path = formatPath(group ? `${group.path}/${route.path}` : route.path)
  // 规范化widget
  normalizeRouteWidget(route)
  // 规范化injectProps
  normalizeInjectProps(route)
  // 合并父级的配置
  route.suffix ??= group?.suffix ?? suffix
  route.afterEnter ??= group?.afterEnter
  route.beforeEnter ??= group?.beforeEnter

  return route as RouteNormalized
}
