import type { Route } from '../router-types.js'

const validWidgetType = (widget: any, path: string) => {
  const type = typeof widget
  if (type === 'function') return
  if (type === 'object') {
    if (!widget.default) {
      throw new TypeError(
        `[Vitarx.Router][ERROR]：请检查 ${path} 路由配置，widget传入对象时则认为是命名视图，命名视图必须具有default视图`
      )
    }
    for (const k in widget) {
      validWidgetType(widget[k], path)
    }
    return
  }
  throw new TypeError(`[Vitarx.Router][ERROR]：请检查 ${path} 路由配置，widget配置无效`)
}

/**
 * 验证 widget 配置
 *
 * @param route
 * @private
 */
export default function normalizeRouteWidget(route: Route): void {
  const isGroup = route.children!.length
  // 处理 widget 配置
  if (route.widget) {
    validWidgetType(route.widget, route.path)
  } else if (!isGroup) {
    throw new TypeError(
      `[Vitarx.Router][ERROR]：请检查 ${route.path} 路由配置，widget和children不能同时为空。`
    )
  }
  // 格式化为命名视图
  if (typeof route.widget === 'function') {
    route.widget = { default: route.widget }
  }
}
