import {
  type DynamicRouteRecord,
  type HistoryMode,
  type InitializedRouterOptions,
  type MatchResult,
  type Route,
  type RouteIndex,
  type RouteName,
  type RouteNormalized,
  type RoutePath,
  type RouterOptions,
  type RouteTarget
} from './router-types.js'
import {
  createDynamicPattern,
  formatPath,
  isRouteGroup,
  isVariablePath,
  normalizeRoute,
  optionalVariableCount,
  splitPathAndSuffix,
  validateSuffix
} from './utils.js'

/**
 * 路由注册基类
 */
export default abstract class RouterRegistry {
  // 配置
  protected readonly _options: MakeRequired<
    RouterOptions,
    Exclude<keyof RouterOptions, 'beforeEach' | 'afterEach'>
  >
  // 命名路由映射
  protected readonly _namedRoutes = new Map<string, RouteNormalized>()
  // 动态路由正则，按长度分组
  protected readonly _dynamicRoutes = new Map<number, DynamicRouteRecord[]>()
  // 路由path映射
  protected readonly _pathRoutes = new Map<string, RouteNormalized>()
  // 父路由映射
  protected readonly _parentRoute = new WeakMap<RouteNormalized, RouteNormalized>()

  protected constructor(options: RouterOptions) {
    this._options = {
      base: '/',
      strict: false,
      mode: 'path',
      scrollBehavior: 'smooth',
      suffix: '*',
      pattern: /[\w.]+/,
      ...options
    }
    this._options.base = `/${this._options.base.replace(/^\/+|\/+$/g, '')}`
  }

  /**
   * 获取配置
   */
  get options(): Readonly<InitializedRouterOptions> {
    return this._options
  }

  /**
   * 路由器模式
   */
  get mode(): HistoryMode {
    return this._options.mode
  }

  /**
   * 获取所有路由映射
   */
  get pathRoutes(): ReadonlyMap<string, Route> {
    return this._pathRoutes
  }

  /**
   * 获取所有命名路由映射
   */
  get namedRoutes(): ReadonlyMap<string, Route> {
    return this._namedRoutes
  }

  /**
   * 动态路由记录
   */
  get dynamicRoutes(): Map<number, DynamicRouteRecord[]> {
    return this._dynamicRoutes
  }

  /**
   * 获取已规范的路由表
   */
  get routes(): ReadonlyArray<RouteNormalized> {
    return this._options.routes as ReadonlyArray<RouteNormalized>
  }

  /**
   * 基本路径
   */
  get basePath(): `/${string}` {
    return this._options.base
  }

  /**
   * 受支持的`path`后缀名
   */
  get suffix(): RouterOptions['suffix'] {
    return this._options.suffix
  }

  /**
   * 删除路由
   */
  public removeRoute(index: RouteIndex, isRemoveFromRoutes: boolean = true): void {
    const deleteRoute = this.findRoute(index)

    if (!deleteRoute) return

    if (isRouteGroup(deleteRoute)) {
      for (const child of deleteRoute.children) {
        this.removeRoute(child.path, false)
      }
    }

    this._pathRoutes.delete(deleteRoute.path)

    if (deleteRoute.name) {
      this._namedRoutes.delete(deleteRoute.name)
    }

    this.removeDynamicRoute(deleteRoute.path)

    if (isRemoveFromRoutes) this.removedFromRoutes(deleteRoute)
  }

  /**
   * 添加路由
   *
   * @param {Object} route 路由对象
   * @param {string} [parent] 父路由索引，可以是path也可以是name
   * @returns {void}
   */
  public addRoute(route: Route, parent?: string): void {
    if (parent) {
      const parentRoute = this.findRoute(parent)
      if (!parentRoute) throw new Error(`[Vitarx.Router.addRoute][ERROR]：父路由${parent}不存在`)
      this.registerRoute(route, parentRoute)
    } else {
      this.registerRoute(route)
      this._options.routes.push(route)
    }
  }

  /**
   * 查找路由
   *
   * @param {string|Object} target 路由索引或目标对象
   * @returns {RouteNormalized|undefined} 匹配的路由对象，如果未找到则返回undefined
   */
  public findRoute(target: RouteIndex | RouteTarget): RouteNormalized | undefined {
    const isRouterTarget = typeof target === 'object'
    const index: RouteIndex = isRouterTarget ? target.index : target
    if (typeof index !== 'string') {
      throw new TypeError(
        `[Vitarx.Router.getRoute][ERROR]：路由索引${target}类型错误，必须给定字符串类型`
      )
    }
    if (index.startsWith('/')) {
      const matched = this.matchRoute(index as RoutePath)
      if (!matched) return undefined
      if (matched.params && isRouterTarget) {
        target.params = Object.assign(target.params || {}, matched.params)
      }
      return matched.route
    }
    return this.findNamedRoute(index)
  }

  /**
   * 查找命名路由
   */
  public findNamedRoute(name: RouteName): RouteNormalized | undefined {
    return this._namedRoutes.get(name)
  }

  /**
   * 获取路由的父路由
   */
  public findParentRoute(route: RouteNormalized): RouteNormalized | undefined {
    return this._parentRoute.get(route)
  }

  /**
   * 根据给定的路径匹配相应的路由
   *
   * 此方法首先格式化输入路径，然后根据路径匹配静态路由和动态路由
   * 对于静态路由，直接比较路径是否相等；对于动态路由，使用正则表达式进行匹配
   * 匹配成功后，验证路径的后缀是否符合要求，如果符合则返回匹配结果，包括路由和参数（如果有）
   *
   * @param path 要匹配的路径
   * @returns 如果找到匹配的路由，则返回匹配结果对象；否则返回undefined
   */
  protected matchRoute(path: RoutePath): MatchResult | undefined {
    // 格式化路径，确保路径格式一致
    let formattedPath = formatPath(path)
    // 如果不是严格匹配模式，将路径转换为小写
    if (!this._options.strict) {
      formattedPath = formattedPath.toLowerCase() as RoutePath
    }
    try {
      // 分割路径和后缀
      const { path: shortPath, suffix } = splitPathAndSuffix(formattedPath)

      // 构建可能的路径选项，包括当前路径和去除尾部index的路径
      const staticRoute = this._pathRoutes.get(shortPath)
      if (staticRoute) {
        // 验证后缀，如果匹配成功则返回结果，否则继续查找
        if (validateSuffix(suffix, staticRoute.suffix, formattedPath, staticRoute.path)) {
          return { route: staticRoute, params: undefined }
        }
      }

      // 计算路径段数，用于匹配动态路由
      const segmentCount = shortPath.split('/').filter(Boolean).length
      const candidates = this._dynamicRoutes.get(segmentCount)

      // 如果存在候选动态路由
      if (candidates) {
        // 构建规范化路径，用于动态路由匹配
        const normalizedPath = `${shortPath}/`

        // 缓存正则表达式
        const regexCache = new Map<string, RegExp>()

        // 遍历候选动态路由，尝试匹配
        for (const { regex, route } of candidates) {
          // 使用缓存的正则表达式
          const cachedRegex = regexCache.get(regex.source) || regex
          const match = cachedRegex.exec(normalizedPath)
          if (!match) continue

          // 构建参数对象，存储匹配到的参数
          const params: Record<string, string> = {}
          const keys = Object.keys(route.pattern!)
          for (let i = 0; i < keys.length; i++) {
            params[keys[i]] = match[i + 1]
          }

          // 验证后缀，如果匹配成功则返回结果，包括路由和参数
          if (validateSuffix(suffix, route.suffix, formattedPath, formattedPath)) {
            return { route, params }
          }
        }
      }

      // 如果没有找到匹配的动态路由，且没有使用后缀和/index结尾，尝试匹配index路由
      if (!suffix && !shortPath.endsWith('/index')) {
        const indexRoute = this._pathRoutes.get(`${shortPath === '/' ? '' : shortPath}/index`)
        if (
          indexRoute &&
          validateSuffix(suffix, indexRoute.suffix, formattedPath, indexRoute.path)
        ) {
          return { route: indexRoute, params: undefined }
        }
      } else if (shortPath === '/index') {
        const indexRoute = this._pathRoutes.get('/')
        if (
          indexRoute &&
          validateSuffix(suffix, indexRoute.suffix, formattedPath, indexRoute.path)
        ) {
          return { route: indexRoute, params: undefined }
        }
      }
    } catch (error) {
      console.error('Error in matchRoute:', error)
      return undefined
    }

    // 如果没有找到匹配的路由，返回undefined
    return undefined
  }

  /**
   * 初始化路由表
   */
  protected setupRoutes(routes: Route[]) {
    for (const route of routes) {
      this.registerRoute(route)
    }
  }

  /**
   * 从源路由表中删除路由
   */
  private removedFromRoutes(route: RouteNormalized) {
    const parent = this.findParentRoute(route)
    if (parent?.children) {
      const index = parent.children.indexOf(route)
      if (index !== -1) {
        parent.children.splice(index, 1)
      }
    } else {
      const index = this._options.routes.indexOf(route)
      if (index !== -1) {
        this._options.routes.splice(index, 1)
      }
    }
  }

  /**
   * 删除动态路由映射
   */
  private removeDynamicRoute(path: string): void {
    if (!isVariablePath(path)) return

    const segments = path.split('/').filter(Boolean)
    const length = segments.length

    const removeRouteFromRecords = (key: number) => {
      const records = this._dynamicRoutes.get(key)
      if (records) {
        for (let i = 0; i < records.length; i++) {
          if (records[i].route.path === path) {
            records.splice(i, 1)
            break
          }
        }
      }
    }

    removeRouteFromRecords(length)
    const count = optionalVariableCount(path)
    if (count > 0) {
      for (let i = 1; i <= count; i++) {
        removeRouteFromRecords(length - i)
      }
    }
  }

  /**
   * 注册路由
   */
  private registerRoute(route: Route, group?: RouteNormalized) {
    const normalizedRoute = normalizeRoute(route, group, this.suffix)
    if (group) this._parentRoute.set(normalizedRoute, group)
    if (isRouteGroup(normalizedRoute)) {
      if (route.widget) {
        this.recordRoute(normalizedRoute)
      }
      for (const child of normalizedRoute.children) {
        this.registerRoute(child, normalizedRoute)
      }
      if (!normalizedRoute.redirect) {
        normalizedRoute.redirect = function (to) {
          // 如果没有widget，尝试找到第一个有widget的路由作为重定向目标
          let first = normalizedRoute.children[0]
          while (first) {
            if (first.redirect) {
              return typeof first.redirect === 'function'
                ? first.redirect.call(this, to)
                : first.redirect
            }
            if (first.widget) return { index: first.path }
            first = first.children?.[0]
          }
          console.error(
            `[Vitarx.Router][ERROR]：${normalizedRoute.path} 分组路由在没有配置重定向的情况下，它的第一个子路由必须具有widget或redirect，否则无法匹配视图`,
            normalizedRoute
          )
        }
      }
    } else {
      this.recordRoute(normalizedRoute)
    }
  }

  /**
   * 如果路径是严格匹配，则转换为小写
   */
  private strictPath(path: string): RoutePath {
    return (this._options.strict ? path : path.toLowerCase()) as RoutePath
  }

  /**
   * 记录路由
   */
  private recordRoute(route: RouteNormalized) {
    if (route.name) {
      if (route.name.startsWith('/')) {
        route.name = route.name.replace(/^\//, '')
        console.warn(
          `[Vitarx.Router][WARN]：命名路由(name)不要以/开头: ${route.name}，因为内部需要使用/区分path、name`
        )
      }

      if (this._namedRoutes.has(route.name)) {
        throw new Error(`[Vitarx.Router][ERROR]：检测到重复的路由名称(name): ${route.name}`)
      }

      this._namedRoutes.set(route.name, route)
    }

    const path = this.strictPath(route.path)

    if (this._pathRoutes.has(path)) {
      throw new Error(`[Vitarx.Router][ERROR]：检测到重复的路由路径(path): ${route.path}`)
    }

    this._pathRoutes.set(path, route)

    if (isVariablePath(route.path)) {
      this.recordDynamicRoute(route)
    }
  }

  /**
   * 添加动态路由
   */
  private recordDynamicRoute(route: RouteNormalized) {
    const { regex, length, optional } = createDynamicPattern(
      route.path,
      route.pattern,
      this.options.strict,
      this.options.pattern
    )
    const addToLengthMap = (len: number) => {
      if (!this._dynamicRoutes.has(len)) {
        this._dynamicRoutes.set(len, [])
      }
      this._dynamicRoutes.get(len)!.push({ regex, route })
    }
    addToLengthMap(length)
    if (optional > 0) {
      for (let i = 1; i <= optional; i++) {
        addToLengthMap(length - i)
      }
    }
  }
}
