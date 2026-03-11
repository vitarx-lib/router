import { isPlainObject } from 'vitarx'
import type { InjectProps, Route } from '../router-types.js'

/**
 * 验证 injectProps 类型
 *
 * @param props
 */
const validInjectProps = (props: any): boolean => {
  return ['boolean', 'function'].includes(typeof props) || isPlainObject(props)
}

/**
 * 抛出类型错误
 *
 * @param path 路由路径
 * @param message 错误消息
 */
const throwInjectPropsError = (path: string, message: string): never => {
  throw new TypeError(`[Router] Invalid route configuration for "${path}": ${message}`)
}

/**
 * 验证 injectProps 类型
 *
 * @param route
 * @private
 */
export default function normalizeInjectProps(route: Route): void {
  if (!route.component) return

  const injectProps: Record<string, InjectProps> = {}
  const inputValue: InjectProps = route.props ?? true
  const isObjectInput = typeof inputValue === 'object'
  const isObjectWidget = typeof route.component === 'object'

  if (isObjectWidget) {
    if (isObjectInput) {
      for (const name in route.component) {
        const value = (inputValue as Record<string, any>)[name]
        if (value !== undefined && !validInjectProps(value)) {
          throwInjectPropsError(
            route.path,
            `"props.${name}" has invalid type, only boolean, object, or function types are supported`
          )
        }
        injectProps[name] = value ?? true
      }
    } else {
      if (!validInjectProps(inputValue)) {
        throwInjectPropsError(
          route.path,
          '"props" must be a boolean, object, or function type when using named views'
        )
      }
      for (const name in route.component) {
        injectProps[name] = inputValue
      }
    }
  } else {
    if (!validInjectProps(inputValue)) {
      throwInjectPropsError(
        route.path,
        '"props" has invalid type, only boolean, object, or function types are supported'
      )
    }
    injectProps['default'] = inputValue
  }

  route.props = injectProps
}
