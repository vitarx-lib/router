// noinspection JSUnusedGlobalSymbols

import type {
  DynamicRouteRecord,
  Route,
  RouteData,
  RouteGroup,
  RouteIndex,
  RoutePath,
  RouterOptions,
  RouteTarget
} from './type.js'
import {
  createDynamicPattern,
  formatHash,
  formatPath,
  generateRoutePath,
  isOptionalVariablePath,
  isRouteGroup,
  isVariablePath,
  objectToQueryString
} from './utils.js' // 路由匹配结果

// 路由匹配结果
type MatchResult = {
  route: Route
  params: Record<string, string> | null
} | null

/**
 * 路由器基类
 */
export class Router {
  // 配置
  private readonly options: Required<RouterOptions>
  // 命名路由映射
  private readonly namedRoutes = new Map<string, Route>()
  // 动态路由正则，按长度分组
  private readonly dynamicRoutes = new Map<number, DynamicRouteRecord[]>()
  // 路由path映射
  private readonly pathRoutes = new Map<string, Route>()
  // 父路由映射
  private readonly parentRoute = new WeakMap<Route, RouteGroup>()
  // 当前路由
  #currentRoute: RouteData = {
    index: '',
    fullPath: '',
    hash: '',
    href: '',
    params: {},
    query: {},
    matched: null
  }
  // 路由历史
  #history: Array<RouteData> = [this.#currentRoute]

  constructor(options: RouterOptions) {
    this.options = {
      base: '/',
      strict: false,
      beforeEach: () => void 0,
      ...options
    }
    this.initialize()
  }

  /**
   * 获取所有路由映射
   *
   * map键值是path，值是路由对象
   *
   * @return {Map<string, Route>}
   */
  get routeMaps(): ReadonlyMap<string, Route> {
    return this.pathRoutes
  }

  /**
   * 获取所有命名路由映射
   *
   * map键值是name，值是路由对象
   *
   * @return {Map<string, Route>}
   */
  get namedRouteMaps(): ReadonlyMap<string, Route> {
    return this.namedRoutes
  }

  /**
   * 获取路由表
   *
   * 它始终指向的是初始化时传入的路由表，但它的数据可能有被修改，例如调用了`removeRoute`或`addRoute`方法。
   *
   * 值得注意的是，所有嵌套`Route`的path都会被补全为完整的路径。
   *
   * @return {Route[]}
   */
  get routes(): ReadonlyArray<Route> {
    return this.options.routes
  }

  /**
   * 当前路由数据
   *
   * @return {RouteData | null} - 路由数据
   */
  get currentRoute(): Readonly<RouteData> {
    return this.#currentRoute
  }

  /**
   * 基本路径
   */
  get basePath(): `/${string}` {
    return this.options.base
  }

  /**
   * 跳转指定的历史记录位置
   *
   * @param {number} delta - 跳转的步数（正数为前进，负数为后退）
   * @return {boolean} - 如果存在记录，返回true，否则返回false
   */
  go(delta: number = 1): boolean {
    const targetIndex = this.#history.length - 1 + (delta || 0)

    // 如果目标索引在有效范围内
    if (targetIndex >= 0 && targetIndex < this.#history.length) {
      this.#currentRoute = this.#history[targetIndex]
      return true
    }
    return false
  }

  /**
   * 后退到上一个历史记录
   *
   * @return {boolean} - 是否后退成功
   */
  back(): boolean {
    return this.go(-1) // 后退1步
  }

  /**
   * 前进到下一个历史记录
   *
   * @return {boolean} - 是否前进成功
   */
  forward(): boolean {
    return this.go(1) // 前进1步
  }

  /**
   * 替换当前页面
   *
   * @param {RouteTarget} target - 目标
   * @return {boolean} - 是否跳转成功
   */
  replace(target: RouteTarget): boolean {
    return this.#navigate(target, true)
  }

  /**
   * 跳转到新的页面
   *
   * @param {RouteTarget} target - 目标
   * @return {boolean} - 是否跳转成功
   */
  push(target: RouteTarget): boolean {
    return this.#navigate(target, false)
  }

  /**
   * 路由前置守卫
   *
   * @param {RouteData} to - 路由目标对象
   * @param {RouteData} from - 前路由对象
   * @return {false | RouteTarget} - 返回false表示阻止导航，返回新的路由目标对象则表示导航到新的目标
   */
  onBeforeEach(to: RouteData, from: RouteData): boolean | RouteTarget | void {
    return this.options.beforeEach.call(this, to, from)
  }

  /**
   * 删除路由
   *
   * @param {string} index 路由索引，如果/开头则匹配path，其他匹配name
   * @param {boolean} isRemoveFromRoutes 是否从路由表中移除，内部递归时传递的参数，无需外部传入！
   */
  public removeRoute(index: RouteIndex, isRemoveFromRoutes: boolean = true): void {
    const deleteRoute = this.getRoute(index)

    if (!deleteRoute) return

    // 如果有子路由，则递归删除
    if (isRouteGroup(deleteRoute)) {
      for (const child of deleteRoute.children) {
        this.removeRoute(child.path, false)
      }
    }

    // 删除通用映射关系
    this.pathRoutes.delete(deleteRoute.path)
    if (deleteRoute.name) {
      this.namedRoutes.delete(deleteRoute.name)
    }

    // 删除动态路由
    this.removeDynamicRoute(deleteRoute.path)

    // 从路由表中移除
    if (isRemoveFromRoutes) this.removedFromRoutes(deleteRoute)
  }

  /**
   * 添加路由
   *
   * @param {Route} route - 路由描述对象
   * @param {string} parent - 父路由的path或name，不传入则添加至路由表根节点
   */
  public addRoute(route: Route, parent?: string) {
    if (parent) {
      const parentRoute = this.getRoute(parent)
      if (!parentRoute) throw new Error(`[Vitarx.Router.addRoute][ERROR]：父路由${parent}不存在`)
      parentRoute.children = parentRoute.children || []
      this.registerRoute(route, parentRoute as RouteGroup)
    } else {
      this.registerRoute(route)
      this.options.routes.push(route)
    }
  }

  /**
   * 获取路由
   *
   * @param {string} index - 路由索引，如果/开头则匹配path，其他匹配name
   */
  public getRoute(index: RouteIndex): Route | undefined {
    if (typeof index !== 'string') {
      throw new TypeError(
        `[Vitarx.Router.getRoute][ERROR]：路由索引${index}类型错误，必须给定字符串类型`
      )
    }
    if (index.startsWith('/')) {
      return this.pathRoutes.get(this.strictPath(index))
    }
    return this.namedRoutes.get(index)
  }

  /**
   * 获取路由的父路由
   *
   * @param route - 路由对象
   * @return {RouteGroup | undefined}
   */
  public getParentRoute(route: Route): RouteGroup | undefined {
    return this.parentRoute.get(route)
  }

  /**
   * 添加历史记录
   *
   *
   * @param data
   * @protected
   */
  protected pushHistory(data: RouteData): void {
    if (!data.matched) {
      throw new Error(`[Vitarx.Router.push][ERROR]：路由${data.index}不存在`)
    }
    this.#history.push(data)
    this.#currentRoute = data
  }

  /**
   * 路由匹配
   *
   *
   * @param {string} path - 路径
   *
   * @return {{route: Route, params: Record<string, string> | null} | null} - 路由对象和参数，如果匹配失败则返回null
   */
  protected matchRoute(path: RoutePath): MatchResult {
    // 转换为小写
    if (!this.options.strict) {
      path = path.toLowerCase() as RoutePath
    }

    // 格式化path
    path = formatPath(path)

    // 优先匹配静态路由
    if (this.pathRoutes.has(path)) {
      return { route: this.pathRoutes.get(path)!, params: null }
    }

    // 动态路由匹配
    const segments = path.split('/').filter(Boolean)
    // 路径段长度
    const length = segments.length
    // 动态路由列表
    const candidates = this.dynamicRoutes.get(length) || []
    // 添加尾部斜杠 兼容可选参数 路径匹配
    path = `${path}/`
    // 遍历动态路由
    for (const { regex, route } of candidates) {
      const match = regex.exec(path)
      if (match) {
        const params: Record<string, string> = {}

        // 提取动态参数
        const keys = Object.keys(route.pattern!)
        keys.forEach((key, index) => {
          params[key] = match[index + 1] // +1 因为匹配结果的第一个元素是完整匹配
        })
        return { route, params }
      }
    }
    return null
  }

  /**
   * 从源路由表中删除路由
   *
   * @param route
   * @protected
   */
  protected removedFromRoutes(route: Route) {
    const parent = this.getParentRoute(route)
    if (parent?.children) {
      const index = parent.children.indexOf(route)
      if (index !== -1) {
        parent.children.splice(index, 1)
      }
    } else {
      const index = this.options.routes.indexOf(route)
      if (index !== -1) {
        this.options.routes.splice(index, 1)
      }
    }
  }

  /**
   * 删除动态路由映射
   *
   * @param path
   * @protected
   */
  protected removeDynamicRoute(path: string): void {
    if (!isVariablePath(path)) return

    const segments = path.split('/').filter(Boolean)
    const length = segments.length

    /**
     * 根据动态路径长度删除匹配的记录
     *
     * @param key 动态路径的长度
     */
    const removeRouteFromRecords = (key: number) => {
      const records = this.dynamicRoutes.get(key)
      if (records) {
        for (let i = 0; i < records.length; i++) {
          if (records[i].route.path === path) {
            records.splice(i, 1) // 删除匹配的记录
            break // 找到后立即停止循环
          }
        }
      }
    }

    // 删除匹配路径的动态路由
    removeRouteFromRecords(length)

    // 如果是可选参数路由，删除对应短路径的路由
    if (isOptionalVariablePath(path)) {
      removeRouteFromRecords(length - 1)
    }
  }

  /**
   * 初始化路由器
   */
  protected initialize() {
    const { base, routes } = this.options
    // 初始化基础路径
    this.setupBasePath(base)
    // 初始化当前路由
    this.setupCurrentRoute()
    // 初始化路由表
    this.setupRoutes(routes)
  }

  /**
   * 创建完整路径
   *
   * @protected
   * @param path - 路径
   * @param query - ?查询参数
   * @param hash - #哈希值
   */
  protected makeHref(path: string, query: string, hash: string) {
    return formatPath(`${this.basePath}${path}${query}${hash}`)
  }

  /**
   * 设置当前路由
   *
   * @protected
   */
  private setupCurrentRoute() {
    this.#currentRoute.index = this.basePath
    this.#currentRoute.fullPath = this.basePath
    this.#currentRoute.href = this.basePath
  }

  /**
   * 设置基础路径
   *
   * @param base
   */
  private setupBasePath(base: string) {
    this.options.base = `/${base.replace(/^\/+|\/+$/g, '')}`
  }

  /**
   * 初始化路由表
   *
   * @param routes
   */
  private setupRoutes(routes: Route[]) {
    for (const route of routes) {
      this.registerRoute(route)
    }
  }

  /**
   * 路由跳转的通用方法
   *
   * @param {RouteTarget} target - 目标
   * @param {boolean} isReplace - 是否替换当前历史记录
   * @return {boolean} - 是否导航成功
   */
  #navigate(target: RouteTarget, isReplace: boolean): boolean {
    const { index, query = {}, params = {}, hash = '' } = target
    if (!index) {
      throw new TypeError(`[Vitarx.Router.navigate]：target.index无效，index:${index}`)
    }

    const route = this.getRoute(index) ?? null

    // 如果当前路由就是目标路由，则不处理
    if (this.currentRoute.matched && this.currentRoute.matched === route) return false
    const path = route ? generateRoutePath(route.path, params) : index
    const href = route
      ? this.makeHref(path, objectToQueryString(query), formatHash(hash, true))
      : index
    const to: RouteData = {
      index,
      fullPath: route ? formatPath(this.basePath + path) : index,
      hash: formatHash(hash, false),
      href: href,
      params: params,
      query: query,
      matched: route
    }

    const from: RouteData = this.currentRoute
    const result = this.onBeforeEach(to, from)

    if (result === false) return false

    if (typeof result === 'object' && result.index !== target.index) {
      // 如果跳转结果有修改，则递归调用导航方法
      return this.#navigate(result, isReplace)
    }
    // 根据 isReplace 来决定是替换历史记录还是推入新历史记录
    isReplace ? this.replaceHistory(to) : this.pushHistory(to)
    return true
  }

  /**
   * 注册路由
   *
   * @param {Route} route - 路由对象
   * @param {RouteGroup} group - 路由所在的分组
   * @protected
   */
  private registerRoute(route: Route, group?: RouteGroup) {
    if (group) {
      // 处理路径拼接，避免多余的斜杠
      route.path = formatPath(`${group.path}/${route.path}`)
      this.parentRoute.set(route, group) // 记录当前路由于父路由的映射关系
    } else {
      // 规范化路由路径，去除空格
      route.path = formatPath(route.path)
    }

    if (isRouteGroup(route)) {
      // 如果是路由组并且有 widget，则将分组自身作为路由记录
      if (route.widget) {
        this.recordRoute(route) // 记录分组路由
      }

      // 遍历子路由并递归注册
      for (const child of route.children) {
        this.registerRoute(child, route) // 递归注册子路由
      }
    } else {
      if (typeof route.widget !== 'function') {
        throw new TypeError(
          `[Vitarx.Router][ERROR]：路由${route.path}的widget配置无效，${route.widget}`
        )
      }
      // 记录路由
      this.recordRoute(route)
    }
  }

  /**
   * 如果路径是严格匹配，则转换为小写
   *
   * @param path
   * @private
   */
  private strictPath(path: string): RoutePath {
    return (this.options.strict ? path : path.toLowerCase()) as RoutePath
  }

  /**
   * 记录路由
   *
   * @param {Route} route - 路由对象
   * @protected
   */
  private recordRoute(route: Route) {
    if (route.name) {
      if (route.name.startsWith('/')) {
        route.name = route.name.replace(/^\//, '')
        console.warn(
          `[Vitarx.Router][WARN]：命名路由(name)不要以/开头: ${route.name}，因为内部需要使用/区分path、name`
        )
      }

      if (this.namedRoutes.has(route.name)) {
        throw new Error(`[Vitarx.Router][ERROR]：检测到重复的路由名称(name): ${route.name}`)
      }

      // 添加命名路由
      this.namedRoutes.set(route.name, route)
    }

    const path = this.strictPath(route.path)

    if (this.pathRoutes.has(path)) {
      throw new Error(`[Vitarx.Router][ERROR]：检测到重复的路由路径(path): ${route.path}`)
    }

    // 添加路由path映射
    this.pathRoutes.set(path, route)

    // 添加动态路由
    if (isVariablePath(route.path)) {
      this.recordDynamicRoute(route)
    }
  }

  /**
   * 添加动态路由
   * @param route
   */
  private recordDynamicRoute(route: Route) {
    route.pattern = route.pattern || {}
    const { regex, length, isOptional } = createDynamicPattern(
      route.path,
      route.pattern,
      this.options.strict
    )
    const addToLengthMap = (len: number) => {
      if (!this.dynamicRoutes.has(len)) {
        this.dynamicRoutes.set(len, [])
      }
      this.dynamicRoutes.get(len)!.push({ regex, route })
    }
    addToLengthMap(length)
    if (isOptional) addToLengthMap(length - 1)
  }

  /**
   * 替换历史记录
   *
   * @param {RouteData} data - 目标路由
   * @private
   */
  private replaceHistory(data: RouteData): void {
    if (!data.matched) {
      throw new Error(`[Vitarx.Router.replace][ERROR]：路由${data.index}不存在`)
    }
    const index = this.#history.lastIndexOf(this.currentRoute)
    this.#history[index] = data
    this.#currentRoute = data
  }
}

/**
 * 定义路由表
 *
 * 使用defineRoutes定义路由表可以获得更好的代码提示。
 *
 * @param {Route[]} routes - 路由配置表
 */
export function defineRoutes(...routes: Route[]): Route[] {
  return routes
}

/**
 * 定义路由
 *
 * 使用defineRoute定义路由可以获得更好的代码提示。
 *
 * @param {Route} route - 路由配置
 */
export function defineRoute(route: Route): Route {
  return route
}
