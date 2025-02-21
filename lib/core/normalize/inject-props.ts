import type { InjectProps, Route } from '../router-types.js'

/**
 * 验证 injectProps 类型
 *
 * @param props
 */
const validInjectProps = (props: any) => {
  return ['boolean', 'function'].includes(typeof props)
}

/**
 * 验证 injectProps 类型
 *
 * @param route
 * @private
 */
export default function normalizeInjectProps(route: Route): void {
  if (!route.widget) return // 如果没有widget，直接返回
  const injectProps: Record<string, InjectProps> = {}
  const inputValue: InjectProps = route.injectProps ?? true
  const type = typeof inputValue
  if (type === 'object') {
    for (const name in route.widget) {
      const value = inputValue[name]
      if (value && !validInjectProps(value)) {
        throw new TypeError(
          `[Vitarx.Router][ERROR]：请检查 ${route.path} 路由线路配置，injectProps.${name}值错误，仅支持boolean、function类型`
        )
      }
      injectProps[name] = value ?? true
    }
  } else if (type === 'function' || type === 'boolean') {
    for (const name in route.widget) {
      injectProps[name] = inputValue
    }
  } else {
    throw new TypeError(
      `[Vitarx.Router][ERROR]：请检查 ${route.path} 路由线路配置，injectProps属性配置错误，仅支持boolean、{key:boolean|function}、function类型`
    )
  }
}
