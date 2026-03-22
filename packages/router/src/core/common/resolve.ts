import { isComponent, isPlainObject } from 'vitarx'
import type {
  InjectProps,
  InjectPropsHandler,
  NamedRouteComponent,
  ResolvedPattern,
  Route
} from '../types/index.js'

/**
 * 抛出类型错误
 *
 * @param path 路由路径
 * @param message 错误消息
 */
const throwRouteConfigError = (path: string, message: string): never => {
  throw new TypeError(`[Router] Invalid route configuration for "${path}": ${message}`)
}

/**
 * 验证并解析路由的 Component 配置
 *
 * 该函数用于验证路由配置中的 component 属性是否符合规范，并将其转换为统一的命名视图组件格式。
 * 支持以下三种情况：
 * 1. 当 component 是一个有效的组件时，返回包含 default 属性的对象
 * 2. 当 component 是一个对象（命名视图）时，验证其结构并返回原对象
 * 3. 其他情况抛出类型错误
 *
 * @param route - 路由配置对象，包含 component、path、children 和 redirect 等属性
 * @param path - 当前路由的路径，用于错误信息提示
 * @returns 返回符合 NamedRouteComponent 接口的规范化组件配置
 * @throws {TypeError} 当路由配置不符合规范时抛出错误，包括：
 *   - 路由没有子路由且没有配置组件时
 *   - 命名视图对象缺少 default 属性时
 *   - 命名视图中的某个视图不是有效组件时
 *   - component 配置无效时
 *
 * @example
 * // 简单组件
 * resolveComponent({ path: '/home', component: HomeComponent })
 * // 返回: { default: HomeComponent }
 *
 * // 命名视图
 * resolveComponent({
 *   path: '/dashboard',
 *   component: {
 *     default: DashboardMain,
 *     sidebar: DashboardSidebar
 *   }
 * })
 * // 返回: { default: DashboardMain, sidebar: DashboardSidebar }
 */
export function resolveComponent(route: Route, path: string): NamedRouteComponent | undefined {
  const { component, children, redirect } = route
  if (isComponent(component)) {
    return { default: component }
  }
  if (typeof component === 'object') {
    if (!component.default) {
      throwRouteConfigError(
        path,
        'when "component" is an object (named views), it must have a "default" view'
      )
    }
    for (const k in component) {
      if (!isComponent(component[k])) {
        throwRouteConfigError(path, `named view "${k}" must be a valid component`)
      }
    }
    return component
  }
  if (!children?.length && redirect) {
    throwRouteConfigError(
      path,
      'when "component" is not present, "children" and "redirect" must be configured'
    )
  }
  return void 0
}

/**
 * 生成动态路由匹配正则
 *
 * @param {string} path - 路径字符串
 * @param {Record<string, any>} pattern - 自定义的正则规则集合
 * @param {boolean} strict - 是否严格匹配
 * @param {boolean} ignoreCase - 是否忽略大小写
 * @param defaultPattern - 默认正则规则
 * @return { {regex: RegExp length: number; optional: number} } - 返回动态匹配的正则表达式
 */
export function resolvePattern(
  path: string,
  pattern: Record<string, RegExp>,
  strict: boolean,
  ignoreCase: boolean,
  defaultPattern: RegExp
): { regex: RegExp; pattern: ResolvedPattern[] } {
  let optionalCount = 0
  const resolvedPattern: ResolvedPattern[] = []
  const names = new Set<string>()
  const processVariable = (name: string, optional: boolean): string => {
    if (names.has(name)) {
      throwRouteConfigError(path, `duplicate parameter name "${name}"`)
    }
    names.add(name)
    // 1. 获取正则，优先使用自定义，否则用默认
    let regex = pattern[name]
    if (!regex || !(regex instanceof RegExp)) {
      regex = defaultPattern
    }
    // 2. 校验可选参数位置（必填不能跟在可选后面）
    if (!optional && optionalCount > 0) {
      throwRouteConfigError(path, 'required variables cannot follow optional variables')
    }
    resolvedPattern.push({ regex, name, optional })
    // 3. 移除正则表达式中的 ^ 和 $ 锚点，因为在路径参数中不需要这些锚点
    let source = regex.source.replace(/^\^|\$$/g, '')

    if (optional) {
      optionalCount++
      // 4. 使用局部变量 regex，且建议给捕获组一个默认匹配逻辑防止 undefined
      return `(?:(${source}))?`
    }

    return `(${source})`
  }

  // 4. 路径处理
  let processedPath = path
    .replace(/{([^}?]+)\?}/g, (_, varName) => processVariable(varName, true))
    .replace(/{([^}]+)}/g, (_, varName) => processVariable(varName, false))
    .replace(/\//g, '\\/')

  // 5. 严格模式与结尾处理
  // 如果是 strict: true，结尾不能有斜杠；false 则可选
  processedPath += (strict ? '' : '\\/?') + '$'

  return {
    regex: new RegExp(`^${processedPath}`, ignoreCase ? 'i' : ''),
    pattern: resolvedPattern
  }
}

/**
 * 验证并解析路由的 props 配置
 *
 * @param {Route} route - 路由配置对象
 * @param path - 当前路由的路径，用于错误信息提示
 * @return {Record<string, InjectProps> | undefined} - 返回解析后的 props 配置，如果没有有效配置则返回 undefined
 */
export function resolveProps(route: Route, path: string): Record<string, InjectProps> | undefined {
  // 如果路由没有组件配置，直接返回 undefined
  if (!route.component) return
  // 如果路由没有 props 配置或 props 为 undefined，直接返回 undefined
  if (!('props' in route) || route.props === undefined) return

  /**
   * 验证 injectProps 类型是否合法
   * 合法类型包括：boolean、function 或普通对象
   *
   * @param {any} props - 待验证的 props 配置
   * @return {props is boolean | InjectPropsHandler} - 返回 props 是否为合法类型
   */
  const validInjectProps = (props: any): props is boolean | InjectPropsHandler => {
    return ['boolean', 'function'].includes(typeof props) || isPlainObject(props)
  }

  // 初始化解析后的 props 对象
  const resolvedProps: Record<string, InjectProps> = {}
  // 获取原始的 props 配置
  const rawProps: InjectProps = route.props

  // 处理命名视图的情况
  if (isPlainObject(route.component)) {
    // 如果使用命名视图但 props 不是对象类型，抛出错误
    if (!isPlainObject(rawProps)) {
      throwRouteConfigError(path, '"props" must be a object type when using named views')
    }
    const namedProps = rawProps as Record<string, any>
    // 遍历命名视图组件
    for (const name in route.component) {
      // 检查命名视图是否有对应的 props 配置
      if (name in namedProps && namedProps[name] !== undefined) {
        const props = namedProps[name]
        // 验证 props 类型是否合法
        if (!validInjectProps(props)) {
          throwRouteConfigError(
            path,
            `"props.${name}" has invalid type, only boolean, object, or function types are supported`
          )
        }
        // 将合法的 props 配置添加到解析结果中
        resolvedProps[name] = props
      }
    }
  } else {
    // 处理单个组件的情况
    if (validInjectProps(rawProps)) {
      // 如果 props 类型合法，添加到解析结果中
      resolvedProps['default'] = rawProps
    } else {
      // 如果 props 类型不合法，抛出错误
      throwRouteConfigError(
        path,
        '"props" has invalid type, only boolean, object, or function types are supported'
      )
    }
  }

  // 如果解析结果为空对象则返回 undefined，否则返回解析结果
  return Object.keys(resolvedProps).length > 0 ? resolvedProps : undefined
}
