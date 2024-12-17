import type { InjectNamedProps, InjectProps, Route } from '../type.js'

/**
 * 验证 injectProps 规则
 *
 * @param rule
 */
function validateInjectPropsRule(rule: any): rule is InjectProps {
  return (
    typeof rule === 'boolean' ||
    typeof rule === 'function' ||
    (typeof rule === 'object' && rule !== null)
  )
}

/**
 * 验证 injectProps 类型
 *
 * @param route
 * @private
 */
export default function validateInjectProps(route: Route): void {
  if (route.widget === undefined) return // 如果没有widget，直接返回

  // 如果没有 injectProps，则根据 widget 数量默认设置 injectProps
  if (!('injectProps' in route)) {
    route.injectProps = generateDefaultInjectProps(route, true)
    return
  }

  const injectProps = route.injectProps
  if (typeof injectProps === 'object') {
    if (isDefaultInjectProps(injectProps)) {
      validateInjectPropsForDefault(route, injectProps)
    } else {
      // 处理多视图命名注入
      validateInjectPropsForNamed(route, injectProps)
    }
  } else if (validateInjectPropsRule(injectProps)) {
    // 如果 injectProps 直接是布尔值、函数或对象，统一规范化
    route.injectProps = generateDefaultInjectProps(route, injectProps)
  } else {
    throw new TypeError(
      `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 injectProps 类型有误，它可以是布尔值、函数，亦或是一个{string:any}类型的对象。`
    )
  }
}

/**
 * 判断是否是默认的 injectProps
 *
 * @param injectProps
 * @private
 */
function isDefaultInjectProps(injectProps: Record<string, any>): boolean {
  return Object.keys(injectProps).length === 1 && 'default' in injectProps
}

/**
 * 处理默认 injectProps 的验证
 *
 * @param route
 * @param injectProps
 * @private
 */
function validateInjectPropsForDefault(route: Route, injectProps: Record<string, any>): void {
  if (!validateInjectPropsRule(injectProps.default)) {
    throw new TypeError(
      `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 injectProps.default 类型有误，它可以是布尔值、函数，亦或是一个{string:any}类型的对象。`
    )
  }
}

/**
 * 处理多视图命名 injectProps 的验证
 *
 * @param route
 * @param injectProps
 * @private
 */
function validateInjectPropsForNamed(route: Route, injectProps: Record<string, any>): void {
  for (const key of Object.keys(route.widget!)) {
    if (key in injectProps) {
      if (!validateInjectPropsRule(injectProps[key])) {
        throw new TypeError(
          `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 injectProps.${key} 类型有误，它可以是布尔值、函数，亦或是一个{string:any}类型的对象。`
        )
      }
    } else {
      injectProps[key] = true // 默认值为 true
    }
  }
}

/**
 * 生成默认的 injectProps 配置
 *
 * @param route
 * @param rule
 * @private
 */
function generateDefaultInjectProps(route: Route, rule: InjectProps): InjectNamedProps {
  const injectProps: InjectNamedProps = {}
  for (const key of Object.keys(route.widget!)) {
    injectProps[key] = rule
  }
  return injectProps
}
