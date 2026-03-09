import type { Route } from '../router-types.js'

const validComponentType = (component: any, path: string) => {
  const type = typeof component
  if (type === 'function') return
  if (type === 'object') {
    if (!component.default) {
      throw new TypeError(
        `[Router] Invalid route configuration for "${path}": when "component" is an object (named views), it must have a "default" view`
      )
    }
    for (const k in component) {
      validComponentType(component[k], path)
    }
    return
  }
  throw new TypeError(`[Router] Invalid "component" configuration for route "${path}"`)
}

/**
 * 验证 Component 配置
 *
 * @param route
 * @private
 */
export default function normalizeRouteComponent(route: Route): void {
  const isGroup = route.children?.length
  // 处理 widget 配置
  if (route.component) {
    validComponentType(route.component, route.path)
  } else if (!isGroup) {
    throw new TypeError(
      `[Router] Route "${route.path}" must have either "component" or "children" configured`
    )
  }
  // 格式化为命名视图
  if (typeof route.component === 'function') {
    route.component = { default: route.component }
  }
}
