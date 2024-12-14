// noinspection JSUnusedGlobalSymbols

import {
  type BeforeEachCallbackResult,
  type DynamicRouteRecord,
  type HistoryMode,
  type InitializedRouterOptions,
  type NavigateData,
  type NavigateResult,
  NavigateStatus,
  type Route,
  type RouteGroup,
  type RouteIndex,
  type RoutePath,
  type RouterOptions,
  type RouteTarget
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
} from './utils.js'

// 路由匹配结果
type MatchResult = {
  route: Route
  params: Record<string, string> | null
} | null

/**
 * 路由器基类
 */
export default abstract class Router {
  /**
   * 路由器实例，单例模式，用于全局获取路由器实例
   */
  static #instance: Router | undefined
  // 配置
  readonly #options: Required<RouterOptions>
  // 命名路由映射
  private readonly _namedRoutes = new Map<string, Route>()
  // 动态路由正则，按长度分组
  private readonly _dynamicRoutes = new Map<number, DynamicRouteRecord[]>()
  // 路由path映射
  private readonly _pathRoutes = new Map<string, Route>()
  // 父路由映射
  private readonly _parentRoute = new WeakMap<Route, RouteGroup>()
  // 当前任务 ID
  private _currentTaskId: number | null = null
  // 用于生成唯一任务 ID
  private _taskCounter = 0
  // 活跃的路由列表
  // #activeRoutes = shallowRef<MakeRequired<Route, 'widget'>[]>([])

  constructor(options: RouterOptions) {
    if (Router.#instance) {
      throw new Error(`[Vitarx.Router.constructor]：路由器实例已存在，不能创建多个实例`)
    }
    this.#options = {
      base: '/',
      strict: false,
      beforeEach: () => void 0,
      mode: 'path',
      ...options
    }
  }

  /**
   * 获取单例实例
   *
   * @return {Router} - 路由器实例
   */
  static get instance(): Router {
    if (!Router.#instance) {
      throw new Error(`[Vitarx.Router.instance]：路由器实例未初始化`)
    }
    return Router.#instance
  }

  /**
   * 获取配置
   *
   * @return {InitializedRouterOptions} - 初始化配置
   */
  get options(): InitializedRouterOptions {
    return this.#options
  }

  /**
   * 路由器模式
   */
  get mode(): HistoryMode {
    return this.#options.mode
  }

  /**
   * 获取所有路由映射
   *
   * map键值是path，值是路由对象
   *
   * @return {Map<string, Route>}
   */
  get routeMaps(): ReadonlyMap<string, Route> {
    return this._pathRoutes
  }

  /**
   * 获取所有命名路由映射
   *
   * map键值是name，值是路由对象
   *
   * @return {Map<string, Route>}
   */
  get namedRouteMaps(): ReadonlyMap<string, Route> {
    return this._namedRoutes
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
    return this.#options.routes
  }

  /**
   * 基本路径
   */
  get basePath(): `/${string}` {
    return this.#options.base
  }

  /**
   * 获取当前路由数据
   *
   * @return {Readonly<NavigateData>} - 当前路由数据对象
   */
  abstract get currentNavigateData(): Readonly<NavigateData>

  /**
   * 判断路由器是否初始化完成
   *
   * @return {boolean} - 如果初始化完成，返回true，否则返回false
   */
  get initialized(): boolean {
    return Router.#instance !== undefined
  }

  /**
   * 跳转指定的历史记录位置
   *
   * @param {number} [delta=1] - 跳转的步数（正数为前进，负数为后退）
   * @return {boolean} - 如果存在记录，返回true，否则返回false，非内存模式始终返回true
   */
  public abstract go(delta?: number): boolean

  /**
   * 后退到上一个历史记录
   *
   * @return {boolean} - 如果存在记录，返回true，否则返回false，非内存模式始终返回true
   */
  public back(): boolean {
    return this.go(-1) // 后退1步
  }

  /**
   * 前进到下一个历史记录
   *
   * @return {boolean} -如果存在记录，返回true，否则返回false，非内存模式始终返回true
   */
  public forward(): boolean {
    return this.go(1) // 前进1步
  }

  /**
   * 替换当前页面
   *
   * @param {RouteTarget} target - 目标
   * @return {boolean} - 是否跳转成功，非内存模式始终返回true
   */
  public replace(target: RouteTarget | RouteIndex): Promise<NavigateResult> {
    if (typeof target === 'string') {
      return this.navigate({ index: target, isReplace: true })
    }
    target.isReplace = true
    return this.navigate(target)
  }

  /**
   * 跳转到新的页面
   *
   * @param {RouteTarget} target - 目标
   * @return {boolean} - 是否跳转成功，非内存模式始终返回true
   */
  public push(target: RouteTarget | RouteIndex): Promise<NavigateResult> {
    if (typeof target === 'string') {
      return this.navigate({ index: target, isReplace: false })
    }
    target.isReplace = false
    return this.navigate(target)
  }

  /**
   * 路由前置守卫
   *
   * @param {NavigateData} to - 路由目标对象
   * @param {NavigateData} from - 前路由对象
   * @return {false | RouteTarget} - 返回false表示阻止导航，返回新的路由目标对象则表示导航到新的目标
   */
  public onBeforeEach(to: NavigateData, from: NavigateData): BeforeEachCallbackResult {
    return this.#options.beforeEach.call(this, to, from)
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
    this._pathRoutes.delete(deleteRoute.path)
    if (deleteRoute.name) {
      this._namedRoutes.delete(deleteRoute.name)
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
      const parentRoute = this.getRoute(parent) as Route
      if (!parentRoute) throw new Error(`[Vitarx.Router.addRoute][ERROR]：父路由${parent}不存在`)
      parentRoute.children = parentRoute.children || []
      this.registerRoute(route, parentRoute as RouteGroup)
    } else {
      this.registerRoute(route)
      this.#options.routes.push(route)
    }
  }

  /**
   * 获取路由
   *
   * @param {string} index - 路由索引，如果/开头则匹配path，其他匹配name
   */
  public getRoute(index: RouteIndex): Readonly<Route> | undefined {
    if (typeof index !== 'string') {
      throw new TypeError(
        `[Vitarx.Router.getRoute][ERROR]：路由索引${index}类型错误，必须给定字符串类型`
      )
    }
    if (index.startsWith('/')) {
      const route = this._pathRoutes.get(this.strictPath(index))
      if (route) return route
      const matched = this.matchRoute(index as RoutePath)
      if (matched) return matched.route
    }
    return this._namedRoutes.get(index)
  }

  /**
   * 初始化路由器
   *
   * 只能初始化一次，多次初始化无效。
   *
   * 如果你使用的`createRouter(options)`助手函数创建的路由器实例则无需调用该方法。
   *
   * @return {this} - 返回当前路由器实例
   */
  public initialize(): this {
    if (Router.#instance) return this
    const { base, routes } = this.#options
    // 初始化基础路径
    this.setupBasePath(base)
    // 初始化路由表
    this.setupRoutes(routes)
    // 记录单例
    Router.#instance = this
    return this
  }

  /**
   * 获取路由的父路由
   *
   * @param route - 路由对象
   * @return {RouteGroup | undefined}
   */
  protected getParentRoute(route: Route): RouteGroup | undefined {
    return this._parentRoute.get(route)
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
    if (!this.#options.strict) {
      path = path.toLowerCase() as RoutePath
    }
    // 格式化path
    path = formatPath(path)
    // 优先匹配静态路由
    if (this._pathRoutes.has(path)) {
      return { route: this._pathRoutes.get(path)!, params: null }
    }

    // 动态路由匹配
    const segments = path.split('/').filter(Boolean)
    // 路径段长度
    const length = segments.length
    // 动态路由列表
    const candidates = this._dynamicRoutes.get(length) || []
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
      const index = this.#options.routes.indexOf(route)
      if (index !== -1) {
        this.#options.routes.splice(index, 1)
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
      const records = this._dynamicRoutes.get(key)
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
   * 创建完整路径
   *
   * @protected
   * @param path - 路径
   * @param query - ?查询参数
   * @param hash - #哈希值
   */
  protected abstract makeFullPath(
    path: string,
    query: `?${string}` | '',
    hash: `#${string}` | ''
  ): `${string}`

  /**
   * 添加历史记录
   *
   * 子类必须重写实现该方法
   *
   * @param data
   * @protected
   */
  protected abstract pushHistory(data: NavigateData): void

  /**
   * 替换历史记录
   *
   * 子类必须重写实现该方法
   *
   * @param {NavigateData} data - 目标路由
   * @protected
   */
  protected abstract replaceHistory(data: NavigateData): void

  /**
   * 路由跳转的通用方法
   *
   * @param {RouteTarget} target - 目标
   * @return {Promise<NavigateResult>} - 是否导航成功
   */
  protected navigate(target: RouteTarget): Promise<NavigateResult> {
    const taskId = ++this._taskCounter // 生成唯一任务 ID
    this._currentTaskId = taskId // 更新当前任务
    const isCurrentTask = () => this._currentTaskId === taskId // 检查任务是否被取消
    const performNavigation = (target: RouteTarget): Promise<NavigateResult> => {
      return new Promise<NavigateResult>(async resolve => {
        const to: NavigateData = this.createNavigateData(target)
        if (to.matched === this.currentNavigateData.matched) {
          return resolve({
            status: NavigateStatus.duplicated,
            message: '重复导航到相同的路由，被系统阻止！'
          })
        }

        const from: NavigateData = this.currentNavigateData
        try {
          const result = await this.onBeforeEach(to, from)

          if (result === false)
            return resolve({
              status: NavigateStatus.aborted,
              message: '导航被前置守卫钩子取消'
            })

          if (typeof result === 'object' && result.index !== target.index) {
            if (result.isReplace !== true) result.isReplace = false
            // 递归调用导航方法，传递当前任务 ID
            return performNavigation(result).then(resolve)
          }

          // 路由未匹配
          if (!to.matched)
            return resolve({
              status: NavigateStatus.not_matched,
              message: '导航目标路由未匹配到任何路由规则，被系统阻止！'
            })

          // 检测任务是否已被取消
          if (!isCurrentTask())
            return resolve({
              status: NavigateStatus.cancelled,
              message: '导航请求已被更新的导航请求替代，取消此次导航！'
            })

          // 根据 isReplace 决定是替换历史记录还是推入新历史记录
          target.isReplace ? this.replaceHistory(to) : this.pushHistory(to)
          return resolve({
            status: NavigateStatus.success,
            message: '导航成功'
          })
        } catch (error) {
          // 如果发生错误，则导航被取消
          return resolve({
            status: NavigateStatus.exception,
            message: '导航时发生异常',
            error
          })
        }
      })
    }
    return performNavigation(target)
  }

  /**
   * 根据路由目标创建导航数据
   *
   * @param target
   * @protected
   */
  protected createNavigateData(target: RouteTarget): NavigateData {
    const { index, query = {}, params = {}, hash = '' } = target
    if (!index) {
      throw new TypeError(`[Vitarx.Router.navigate]：target.index无效，index:${index}`)
    }

    const route = this.getRoute(index) ?? null

    const path = route ? generateRoutePath(route.path, params) : index
    const fullPath = route
      ? this.makeFullPath(path, objectToQueryString(query), formatHash(hash, true) as `#${string}`)
      : index
    return {
      index,
      path: route ? formatPath(this.basePath + path) : index,
      hash: formatHash(hash, false),
      fullPath: fullPath,
      params: params,
      query: query,
      matched: route
    }
  }

  /**
   * 设置基础路径
   *
   * @param base
   */
  private setupBasePath(base: string) {
    this.#options.base = `/${base.replace(/^\/+|\/+$/g, '')}`
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
      this._parentRoute.set(route, group) // 记录当前路由于父路由的映射关系
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
    return (this.#options.strict ? path : path.toLowerCase()) as RoutePath
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

      if (this._namedRoutes.has(route.name)) {
        throw new Error(`[Vitarx.Router][ERROR]：检测到重复的路由名称(name): ${route.name}`)
      }

      // 添加命名路由
      this._namedRoutes.set(route.name, route)
    }

    const path = this.strictPath(route.path)

    if (this._pathRoutes.has(path)) {
      throw new Error(`[Vitarx.Router][ERROR]：检测到重复的路由路径(path): ${route.path}`)
    }

    // 添加路由path映射
    this._pathRoutes.set(path, route)

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
      this.#options.strict
    )
    const addToLengthMap = (len: number) => {
      if (!this._dynamicRoutes.has(len)) {
        this._dynamicRoutes.set(len, [])
      }
      this._dynamicRoutes.get(len)!.push({ regex, route })
    }
    addToLengthMap(length)
    if (isOptional) addToLengthMap(length - 1)
  }
}
