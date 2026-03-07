import type { Route } from '../router-types.js'

const validComponentType = (component: any, path: string) => {
  const type = typeof component
  if (type === 'function') return
  if (type === 'object') {
    if (!component.default) {
      throw new TypeError(
        `[Router]：请检查 ${path} 路由配置，component 传入对象时则认为是命名视图，命名视图必须具有default视图`
      )
    }
    for (const k in component) {
      validComponentType(component[k], path)
    }
    return
  }
  throw new TypeError(`[Router]：请检查 ${path} 路由配置，component 配置无效`)
}

/**
 * 验证 Component 配置
 *
 * @param route
 * @private
 */
export default function normalizeRouteComponent(route: Route): void {
  const isGroup = route.children!.length
  // 处理 widget 配置
  if (route.component) {
    validComponentType(route.component, route.path)
  } else if (!isGroup) {
    throw new TypeError(`[Router]：请检查 ${route.path} 路由配置，widget和children不能同时为空。`)
  }
  // 格式化为命名视图
  if (typeof route.component === 'function') {
    route.component = { default: route.component }
  }
}
