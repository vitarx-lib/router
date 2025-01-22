// noinspection JSUnusedGlobalSymbols

import {
  createElement,
  deepClone,
  isDeepEqual,
  LazyWidget,
  markRaw,
  reactive,
  type Reactive,
  shallowReactive,
  type VNode,
  type WidgetType
} from 'vitarx'
import {
  type _ScrollBehavior,
  type _ScrollToOptions,
  type BeforeEachCallbackResult,
  type DynamicRouteRecord,
  type HashStr,
  type HistoryMode,
  type InitializedRouterOptions,
  type MatchResult,
  type NavigateResult,
  NavigateStatus,
  type Route,
  type RouteIndex,
  type RouteLocation,
  type RouteMeta,
  type RouteName,
  type RouteNormalized,
  type RoutePath,
  type RouterOptions,
  type RouteTarget,
  type ScrollBehaviorHandler,
  type ScrollTarget
} from './type.js'
import { patchUpdate } from './update.js'
import {
  createDynamicPattern,
  formatHash,
  formatPath,
  getPathSuffix,
  isLazyLoad,
  isRouteGroup,
  isRouteLocationTypeObject,
  isVariablePath,
  mergePathParams,
  normalizeRoute,
  objectToQueryString,
  optionalVariableCount,
  splitPathAndSuffix
} from './utils.js'

/**
 * 路由器基类
 */
export default abstract class Router {
  /**
   * 路由器实例，单例模式，用于全局获取路由器实例
   */
  static #instance: Router | undefined
  // 配置
  private readonly _options: MakeRequired<
    RouterOptions,
    Exclude<keyof RouterOptions, 'beforeEach' | 'afterEach'>
  >
  // 命名路由映射
  private readonly _namedRoutes = new Map<string, RouteNormalized>()
  // 动态路由正则，按长度分组
  private readonly _dynamicRoutes = new Map<number, DynamicRouteRecord[]>()
  // 路由path映射
  private readonly _pathRoutes = new Map<string, RouteNormalized>()
  // 父路由映射
  private readonly _parentRoute = new WeakMap<RouteNormalized, RouteNormalized>()
  // 当前任务 ID
  private _currentTaskId: number | null = null
  // 用于生成唯一任务 ID
  private _taskCounter = 0
  /**
   * 是否正在执行 replace 操作
   *
   * @private
   */
  private _pendingReplace: RouteLocation | null = null
  /**
   * 是否正在执行 push 操作
   *
   * @private
   */
  private _pendingPush: RouteLocation | null = null
  // 滚动行为处理器
  private _scrollBehaviorHandler: ScrollBehaviorHandler | undefined = undefined
  // 当前路由数据
  private readonly _currentRouteLocation: Reactive<RouteLocation>

  protected constructor(options: RouterOptions) {
    if (Router.#instance) {
      throw new Error(`[Vitarx.Router.constructor]：路由器实例已存在，不能创建多个实例`)
    }
    this._options = {
      base: '/',
      strict: false,
      mode: 'path',
      scrollBehavior: 'smooth',
      suffix: false,
      pattern: /[\w.]+/,
      ...options
    }
    this._options.base = `/${this._options.base.replace(/^\/+|\/+$/g, '')}`
    this._currentRouteLocation = reactive<RouteLocation>({
      index: this._options.base,
      path: this._options.base,
      hash: '',
      fullPath: this._options.base,
      params: {},
      query: {},
      matched: shallowReactive([]),
      meta: markRaw({})
    })
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

  // 是否运行在浏览器端
  private _isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined'

  /**
   * 是否运行在浏览器端
   */
  get isBrowser(): boolean {
    return this._isBrowser
  }

  // 滚动行为
  private _scrollBehavior: _ScrollBehavior = 'auto'

  /**
   * 滚动行为
   *
   * 如果options.scrollBehavior为函数，则scrollBehavior固定为auto'。
   */
  get scrollBehavior(): _ScrollBehavior {
    return this._scrollBehavior
  }

  /**
   * 获取配置
   *
   * @return {Readonly<InitializedRouterOptions>} - 初始化配置
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
   *
   * map键值是path，值是路由对象
   *
   * @return {Map<string, Route>}
   */
  get pathRoutes(): ReadonlyMap<string, Route> {
    return this._pathRoutes
  }

  /**
   * 获取所有命名路由映射
   *
   * map键值是name，值是路由对象
   *
   * @return {Map<string, Route>}
   */
  get namedRoutes(): ReadonlyMap<string, Route> {
    return this._namedRoutes
  }

  /**
   * 动态路由记录
   *
   * map键值是path段长度，值是Array<{regex: RegExp,route:RouteNormalized}>
   */
  get dynamicRoutes(): Map<number, DynamicRouteRecord[]> {
    return this._dynamicRoutes
  }

  /**
   * ## 获取已规范的路由表
   *
   * 它的内存地址始终指向的是初始化时传入的路由表，但它的数据结构是经过内部规范化处理过的。
   *
   * 所有嵌套`Route`的path都会被自动补全为完整的路径
   *
   * > 注意：不要尝试修改已规范化的路由表！请使用`removeRoute`和`addRoute`方法实现路由的变更。
   *
   * @return {RouteNormalized[]}
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
   * 判断路由器是否初始化完成
   *
   * @return {boolean} - 如果初始化完成，返回true，否则返回false
   */
  get initialized(): boolean {
    return Router.#instance !== undefined
  }

  /**
   * 受支持的`path`后缀名
   */
  get suffix(): Exclude<RouterOptions['suffix'], void> {
    return this._options.suffix
  }

  /**
   * 当前路由数据
   *
   * 它是只读的，不要在外部修改它！
   *
   * @return {Readonly<RouteLocation>} - 当前路由数据
   */
  public get currentRouteLocation(): Readonly<Reactive<RouteLocation>> {
    return this._currentRouteLocation
  }

  /**
   * 是否处于等待状态
   *
   * @protected
   */
  protected get isPendingNavigation(): boolean {
    return Boolean(this._pendingReplace || this._pendingPush)
  }

  /**
   * 等待替换完成的数据
   *
   * @protected
   */
  protected get pendingReplaceData(): RouteLocation | null {
    return this._pendingReplace
  }

  /**
   * 等待跳转完成的数据
   *
   * @protected
   */
  protected get pendingPushData(): RouteLocation | null {
    return this._pendingPush
  }

  /**
   * 路由视图
   *
   * 内部方法，用于获取路由线路对应的视图元素虚拟节点。
   *
   * @internal
   * @param {RouteNormalized} route - 路由对象
   * @param {string} name - 视图名称
   * @return {VNode<WidgetType> | undefined} - 视图元素虚拟节点
   */
  static routeView(route: RouteNormalized, name: string): VNode<WidgetType> | undefined {
    const widgetMap = route.widget!
    if (!Object.prototype.hasOwnProperty.call(widgetMap, name)) return undefined
    const widget = widgetMap[name]
    if (isLazyLoad(widget)) {
      return createElement(LazyWidget, { children: widget, key: route.path })
    } else {
      return createElement(widget)
    }
  }

  /**
   * 跳转指定的历史记录位置
   *
   * 如果未向该函数传参或delta相等于 0，则该函数与调用location.reload()具有相同的效果。
   *
   * @param {number} delta - 跳转的步数（正数为前进，负数为后退）
   */
  public abstract go(delta?: number): void

  /**
   * 后退到上一个历史记录
   */
  public back(): void {
    return this.go(-1) // 后退1步
  }

  /**
   * 前进到下一个历史记录
   */
  public forward(): void {
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
   * 删除路由
   *
   * @param {string} index 路由索引，如果/开头则匹配path，其他匹配name
   * @param {boolean} isRemoveFromRoutes 是否从路由表中移除，内部递归时传递的参数，无需外部传入！
   */
  public removeRoute(index: RouteIndex, isRemoveFromRoutes: boolean = true): void {
    const deleteRoute = this.findRoute(index)

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
      const parentRoute = this.findRoute(parent)
      if (!parentRoute) throw new Error(`[Vitarx.Router.addRoute][ERROR]：父路由${parent}不存在`)
      this.registerRoute(route, parentRoute)
    } else {
      this.registerRoute(route)
      this._options.routes.push(route)
    }
  }

  /**
   * 超找路由
   *
   * 传入的是`path`则会调用`matchRoute`方法，传入的是`name`则会调用`getNamedRoute`方法
   *
   * @param {RouteIndex|RouteTarget} target - 路由索引，如果index以/开头则匹配path，其他匹配name
   * @return {RouteNormalized | undefined} - 路由对象，如果不存在则返回undefined
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
      // 将动态路由参数注入到路由目标对象中
      if (matched.params && isRouterTarget) {
        target.params = Object.assign(target.params || {}, matched.params)
      }
      return matched.route
    }
    return this.findNamedRoute(index)
  }

  /**
   * 查找命名路由
   *
   * @param {string} name - 路由名称
   */
  public findNamedRoute(name: RouteName): RouteNormalized | undefined {
    return this._namedRoutes.get(name)
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
    // 初始化路由表
    this.setupRoutes(this._options.routes)
    if (typeof this.options.scrollBehavior === 'function') {
      this._scrollBehaviorHandler = this.options.scrollBehavior
    } else {
      this._scrollBehavior = this.options.scrollBehavior
    }
    // 初始化路由器
    this.initializeRouter()
    // 记录单例
    Router.#instance = this
    return this
  }

  /**
   * 此方法用于浏览器端滚动到指定位置
   *
   * @param scrollTarget
   * @protected
   */
  public scrollTo(scrollTarget: ScrollTarget | undefined): void {
    if (this.isBrowser || !scrollTarget || typeof scrollTarget !== 'object') return
    if ('el' in scrollTarget) {
      const { el, ...rest } = scrollTarget
      const element = typeof el === 'string' ? document.querySelector(el) : el
      if (element && element instanceof Element) {
        if (element.scrollIntoView) {
          element.scrollIntoView({ behavior: this.scrollBehavior, ...rest })
        } else {
          window.scrollTo({
            behavior: this.scrollBehavior,
            top: element.getBoundingClientRect().top + window.scrollY, // 获取元素位置并滚动
            left: element.getBoundingClientRect().left + window.scrollX
          })
        }
      } else {
        console.warn(`[Vitarx.Router.scrollTo][WARN]：元素${el}不存在，无法完成滚动到目标元素操作`)
      }
      return
    }
    window.scrollTo({ behavior: this.scrollBehavior, ...scrollTarget })
  }

  /**
   * 获取路由的父路由
   *
   * @param route - 路由对象
   * @return {RouteNormalized | undefined}
   */
  public findParentRoute(route: RouteNormalized): RouteNormalized | undefined {
    return this._parentRoute.get(route)
  }

  /**
   * 根据路由目标创建导航数据
   *
   * @param {RouteTarget} target - 路由目标
   */
  public createRouteLocation(target: RouteTarget): RouteLocation {
    if (isRouteLocationTypeObject(target)) return target
    // 获取路由对象
    const route = this.findRoute(target)
    const { index, query = {}, params = {}, hash = '' } = target
    let path: RoutePath
    const matched: RouteNormalized[] = []
    if (route) {
      let suffix = getPathSuffix(index)
      if (this.suffix && suffix && !route.path.endsWith(suffix)) {
        path = mergePathParams((route.path + suffix) as RoutePath, params)
      } else {
        path = mergePathParams(route.path, params)
      }
      let parent = this.findParentRoute(route)
      while (parent) {
        // 如果父路由具有`widget`则添加到匹配的路由栈中
        if (parent.widget) matched.unshift(parent)
        parent = this.findParentRoute(parent)
      }
      matched.push(route)
    } else {
      path = formatPath(index)
    }
    const meta: RouteMeta = route?.meta || ({} as RouteMeta)
    const hashStr = formatHash(hash, true)
    const fullPath = this.makeFullPath(path, query, hashStr)
    return { index, path, hash: hashStr, fullPath, params, query, matched, meta }
  }

  /**
   * 路由跳转的通用方法
   *
   * `push`|`replace`方法最终都会调用此方法
   *
   * @protected
   * @param {RouteTarget} target - 目标
   * @return {Promise<NavigateResult>} - 是否导航成功
   */
  public navigate(target: RouteTarget): Promise<NavigateResult> {
    const taskId = ++this._taskCounter // 生成唯一任务 ID
    this._currentTaskId = taskId // 更新当前任务
    const isCurrentTask = () => this._currentTaskId === taskId // 检查任务是否被取消
    const from = deepClone(this.currentRouteLocation)
    const performNavigation = async (
      _target: RouteTarget,
      isRedirect: boolean
    ): Promise<NavigateResult> => {
      const to = this.createRouteLocation(_target)
      // 创建导航结果
      const createNavigateResult = (overrides: Partial<NavigateResult> = {}): NavigateResult => ({
        from,
        to,
        status: NavigateStatus.success,
        message: '导航成功',
        redirectFrom: isRedirect ? target : undefined,
        ...overrides
      })
      // 判断是否为相同的路由
      if (this.isSameNavigate(to, this.currentRouteLocation)) {
        return createNavigateResult({
          status: NavigateStatus.duplicated,
          message: '导航到相同的路由，被系统阻止！'
        })
      }
      try {
        const result = await this.onBeforeEach(
          to as unknown as DeepReadonly<RouteLocation>,
          this.currentRouteLocation as unknown as DeepReadonly<RouteLocation>
        )
        // 前置守卫钩子返回 false，则导航被取消
        if (result === false) {
          return createNavigateResult({
            status: NavigateStatus.aborted,
            message: '导航被前置守卫钩子阻止'
          })
        }
        // 检测任务是否已被取消
        if (!isCurrentTask()) {
          return createNavigateResult({
            status: NavigateStatus.cancelled,
            message: '已被新的导航请求替代，取消此次导航！'
          })
        }
        // 前置守卫钩子返回对象，则导航被重定向
        if (typeof result === 'object' && result.index !== _target.index) {
          result.isReplace ??= false // 确保 isReplace 有默认值
          return performNavigation(result, true)
        }
        // 路由未匹配
        if (!to.matched.length) {
          return createNavigateResult({
            status: NavigateStatus.not_matched,
            message: '未匹配到任何路由规则，被系统阻止！请检测目标索引是否正确。'
          })
        }
        // 更新路由历史
        if (_target.isReplace) {
          this._pendingReplace = to
          this.replaceHistory(to)
        } else {
          this._pendingPush = to
          this.pushHistory(to)
        }
        return createNavigateResult()
      } catch (error) {
        console.error(`[Vitarx.Router.navigate][ERROR]：导航时捕获到了异常`, error)
        return createNavigateResult({
          status: NavigateStatus.exception,
          message: '导航时捕获到了异常',
          error
        })
      }
    }

    return performNavigation(target, false)
  }

  /**
   * 该方法提供给`RouterView`完成渲染时调用
   *
   * @internal
   */
  protected _completeViewRender() {}

  /**
   * 完成导航
   *
   * 所有子类在完成导航的后续处理过后必须调用该方法！
   *
   * @param {RouteLocation} data - 如果是由`replace`或`push`方法发起的导航则无需传入此参数。
   * @param {_ScrollToOptions} savedPosition - 保存的滚动位置信息，用于恢复滚动位置
   * @protected
   */
  protected completeNavigation(data?: RouteLocation, savedPosition?: _ScrollToOptions) {
    const from = this._currentRouteLocation
    // 替换视图渲染完成的回调
    this._completeViewRender = () => {
      // 滚动行为处理
      this.onScrollBehavior(this.currentRouteLocation, from, savedPosition).then()
      // 触发后置钩子
      this.onAfterEach(
        this.currentRouteLocation as unknown as DeepReadonly<RouteLocation>,
        from as unknown as DeepReadonly<RouteLocation>
      )
    }
    if (data) {
      this.updateRouteLocation(data)
    } else if (this._pendingReplace) {
      this.updateRouteLocation(this._pendingReplace)
    } else if (this._pendingPush) {
      this.updateRouteLocation(this._pendingPush)
    } else {
      throw new Error('[Vitarx.Router.completeNavigation][ERROR]：没有处于等待状态的导航请求。')
    }
    this._pendingReplace = null
    this._pendingPush = null
  }

  /**
   * 更新当前导航数据中的query参数
   *
   * 会同步更新`fullPath`
   *
   * @param {Record<string, string>} query - 新的query参数对象
   * @protected
   */
  protected updateQuery(query: Record<string, string>) {
    if (!isDeepEqual(this._currentRouteLocation.query, query)) {
      this._currentRouteLocation.query = query
      this._currentRouteLocation.fullPath = this.makeFullPath(
        this._currentRouteLocation.path,
        query,
        this._currentRouteLocation.hash
      )
    }
  }

  /**
   * 更新当前导航数据中的hash参数
   *
   * 会同步更新`fullPath`
   *
   * @param {`#${string}` | ''} hash - 新的hash参数，如果为空则表示无hash
   * @protected
   */
  protected updateHash(hash: `#${string}` | '') {
    if (typeof hash !== 'string') {
      console.warn(`[Vitarx.Router.updateHash][WARN]：hash值只能是字符串类型，给定${hash}`)
    }
    const newHash = formatHash(hash, true)
    if (newHash !== this._currentRouteLocation.hash) {
      this._currentRouteLocation.hash = newHash
      // 更新完整的path
      this._currentRouteLocation.fullPath = this.makeFullPath(
        this._currentRouteLocation.path,
        this._currentRouteLocation.query,
        newHash
      )
    }
  }

  /**
   * 初始化路由器
   *
   * 子类可重写此方法以完成路由器的初始化
   *
   * @private
   */
  protected abstract initializeRouter(): void

  /**
   * 路由匹配
   *
   *
   * @param {string} path - 路径
   *
   * @return {MatchResult} 如果匹配失败则返回undefined
   */
  protected matchRoute(path: RoutePath): MatchResult {
    // 格式化path
    path = formatPath(path)
    // 转换为小写
    if (!this._options.strict) path = path.toLowerCase() as RoutePath
    // 后缀支持
    if (this.suffix) {
      const { path: realPath, suffix } = splitPathAndSuffix(path)
      // 如果后缀不匹配，直接返回 undefined
      if (!this.isAllowedSuffix(suffix)) {
        return undefined // 后缀不匹配，返回 undefined
      }
      // 更新路径为去掉后缀后的路径
      path = realPath as RoutePath
    }
    // 优先匹配静态路由
    if (this._pathRoutes.has(path)) {
      return { route: this._pathRoutes.get(path)!, params: undefined }
    }
    // 路径段长度
    const length = path.split('/').filter(Boolean).length
    // 动态路由列表
    const candidates = this._dynamicRoutes.get(length)
    if (!candidates) return undefined
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
    return undefined
  }

  /**
   * 创建完整路径
   *
   * @protected
   * @param path - 路径
   * @param query - ?查询参数
   * @param hash - #哈希值
   * @return {string}
   */
  protected makeFullPath(
    path: string,
    query: `?${string}` | '' | Record<string, string>,
    hash: HashStr
  ): `/${string}` {
    if (hash && !hash.startsWith('#')) hash = `#${hash}`
    if (typeof query === 'object') query = objectToQueryString(query)
    return this.mode === 'hash'
      ? formatPath(`${this.basePath}/#${path}${query}${hash}`)
      : formatPath(`${this.basePath}${path}${query}${hash}`)
  }

  /**
   * 添加历史记录
   *
   * 子类必须实现该方法
   *
   * @param data
   * @protected
   */
  protected abstract pushHistory(data: RouteLocation): void

  /**
   * 替换历史记录
   *
   * 子类必须实现该方法
   *
   * @param {RouteLocation} data - 目标路由
   * @protected
   */
  protected abstract replaceHistory(data: RouteLocation): void

  /**
   * 判断是否相同的导航请求
   *
   * @param to
   * @param from
   * @protected
   */
  protected isSameNavigate(to: RouteLocation, from: RouteLocation): boolean {
    return isDeepEqual(to, from)
  }

  /**
   * 触发路由前置守卫
   *
   * @param {DeepReadonly<RouteLocation>} to - 路由目标对象
   * @param {DeepReadonly<RouteLocation>} from - 前路由对象
   * @return {false | RouteTarget} - 返回false表示阻止导航，返回新的路由目标对象则表示导航到新的目标
   */
  protected onBeforeEach(
    to: DeepReadonly<RouteLocation>,
    from: DeepReadonly<RouteLocation>
  ): BeforeEachCallbackResult {
    return this._options.beforeEach?.call(this, to, from)
  }

  /**
   * 触发路由后置守卫
   *
   * @param {DeepReadonly<RouteLocation>} to - 路由目标对象
   * @param {DeepReadonly<RouteLocation>} from - 前路由对象
   */
  protected onAfterEach(to: DeepReadonly<RouteLocation>, from: DeepReadonly<RouteLocation>): void {
    return this._options.afterEach?.call(this, to, from)
  }

  /**
   * 更新路由数据
   *
   * @private
   * @param {RouteLocation} newLocation - 新的路由数据对象
   */
  private updateRouteLocation(newLocation: RouteLocation): void {
    patchUpdate(this._currentRouteLocation, newLocation)
  }

  /**
   * 判断是否为允许的后缀
   *
   * @param suffix
   * @private
   */
  private isAllowedSuffix(suffix: string): boolean {
    if (!suffix) return true
    if (!this.suffix) return false
    if (this.suffix === '*') return true
    if (Array.isArray(this.suffix)) {
      return this.suffix.includes(suffix)
    }
    return this.suffix === suffix
  }

  /**
   * 触发滚动行为
   *
   * @param {RouteLocation} to - 目标导航数据对象
   * @param {RouteLocation} from - 前导航数据对象
   * @param {_ScrollToOptions | undefined} savedPosition - 保存的滚动位置
   * @private
   */
  private async onScrollBehavior(
    to: RouteLocation,
    from: RouteLocation,
    savedPosition: _ScrollToOptions | undefined
  ): Promise<void> {
    try {
      if (this._scrollBehaviorHandler) {
        const scrollTarget = await this._scrollBehaviorHandler(to, from, savedPosition)
        if (scrollTarget) this.scrollTo(scrollTarget)
      } else {
        this.scrollTo(savedPosition)
      }
    } catch (e) {
      console.error("[Vitarx.Router.onScrollBehavior]['ERROR']：处理滚动行为时捕获到了异常", e)
    }
  }

  /**
   * 从源路由表中删除路由
   *
   * @param route
   * @protected
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
   *
   * @param path
   * @protected
   */
  private removeDynamicRoute(path: string): void {
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
    const count = optionalVariableCount(path)
    // 如果是可选参数路由，删除对应短路径的路由
    if (count > 0) {
      for (let i = 1; i <= count; i++) {
        removeRouteFromRecords(length - i)
      }
    }
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
   * @param {RouteNormalized} group - 路由所在的分组
   * @protected
   */
  private registerRoute(route: Route, group?: RouteNormalized) {
    const normalizedRoute = normalizeRoute(route)
    if (group) {
      normalizedRoute.path = formatPath(`${group.path}/${normalizedRoute.path}`)
      this._parentRoute.set(normalizedRoute, group) // 记录当前路由于父路由的映射关系
    }

    if (isRouteGroup(normalizedRoute)) {
      // 如果是路由组并且有 widget，则将分组自身作为路由记录
      if (route.widget) {
        this.recordRoute(normalizedRoute) // 记录分组路由
      }
      // 遍历子路由并递归注册
      for (const child of normalizedRoute.children) {
        this.registerRoute(child, normalizedRoute) // 递归注册子路由
      }
    } else {
      // 记录路由
      this.recordRoute(normalizedRoute)
    }
  }

  /**
   * 如果路径是严格匹配，则转换为小写
   *
   * @param path
   * @private
   */
  private strictPath(path: string): RoutePath {
    return (this._options.strict ? path : path.toLowerCase()) as RoutePath
  }

  /**
   * 记录路由
   *
   * @param {Route} route - 路由对象
   * @protected
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
