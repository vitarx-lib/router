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
import RouterRegistry from './router-registry.ts'
import {
  type _ScrollBehavior,
  type _ScrollToOptions,
  type BeforeEachCallbackResult,
  type HashStr,
  type HistoryMode,
  type InitializedRouterOptions,
  type NavigateResult,
  NavigateStatus,
  type RouteIndex,
  type RouteLocation,
  type RouteMeta,
  type RouteNormalized,
  type RoutePath,
  type RouterOptions,
  type RouteTarget,
  type ScrollBehaviorHandler,
  type ScrollTarget
} from './router-types.js'
import { patchUpdate } from './update.js'
import {
  formatHash,
  formatPath,
  getPathSuffix,
  isLazyLoad,
  isRouteLocationTypeObject,
  mergePathParams,
  objectToQueryString
} from './utils.js'

/**
 * 路由器核心类
 *
 * 继承自 RouterRegistry，负责处理路由导航、历史记录管理、生命周期等核心功能。
 * 采用单例模式，确保全局只有一个路由器实例。
 */
export default abstract class RouterCore extends RouterRegistry {
  // 当前执行的导航任务ID，用于处理并发导航请求
  private _currentTaskId: number | null = null

  // 任务计数器，用于生成唯一的任务ID
  private _taskCounter = 0

  /**
   * 等待执行的 replace 操作数据
   * 如果不为 null，表示当前有一个等待完成的 replace 导航
   */
  private _pendingReplace: RouteLocation | null = null

  /**
   * 等待执行的 push 操作数据
   * 如果不为 null，表示当前有一个等待完成的 push 导航
   */
  private _pendingPush: RouteLocation | null = null

  /**
   * 滚动行为处理器
   * 用于自定义路由切换时的滚动行为
   */
  private _scrollBehaviorHandler: ScrollBehaviorHandler | undefined = undefined

  /**
   * 当前路由数据
   * 包含当前路由的完整信息，如路径、参数、查询字符串等
   */
  private readonly _currentRouteLocation: Reactive<RouteLocation>

  /**
   * 路由器构造函数
   * 初始化路由器并确保单例
   *
   * @param {RouterOptions} options - 路由器配置选项
   * @throws {Error} 如果已存在路由器实例则抛出错误
   */
  protected constructor(options: RouterOptions) {
    if (RouterCore._instance) {
      throw new Error(`[Vitarx.Router.constructor]：路由器实例已存在，不能创建多个实例`)
    }
    super(options)
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
   * 路由器单例实例
   * 用于全局存储唯一的路由器实例
   */
  private static _instance: RouterCore | undefined

  /**
   * 获取路由器单例实例
   *
   * @throws {Error} 如果路由器未初始化则抛出错误
   * @return {RouterCore} 路由器实例
   */
  static get instance(): RouterCore {
    if (!RouterCore._instance) {
      throw new Error(`[Vitarx.Router.instance]：路由器实例未初始化`)
    }
    return RouterCore._instance
  }

  /**
   * 是否运行在浏览器环境
   * 用于区分服务端渲染和客户端渲染
   */
  private _isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined'

  /**
   * 是否运行在浏览器端
   */
  get isBrowser(): boolean {
    return this._isBrowser
  }

  /**
   * 滚动行为
   * 定义路由切换时的滚动效果
   */
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
   * 判断路由器是否初始化完成
   *
   * @return {boolean} - 如果初始化完成，返回true，否则返回false
   */
  get initialized(): boolean {
    return RouterCore._instance !== undefined
  }

  /**
   * 当前路由数据
   *
   * 它是只读的，不要在外部修改它！
   *
   * @return {Readonly<RouteLocation>} - 当前路由数据
   */
  public get currentRouteLocation(): Reactive<Readonly<RouteLocation>> {
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
    const widgetMap = route.widget
    if (!widgetMap) return undefined
    if (!(name in widgetMap)) return undefined
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
   * 初始化路由器
   *
   * 只能初始化一次，多次初始化无效。
   *
   * 如果你使用的`createRouter(options)`助手函数创建的路由器实例则无需调用该方法。
   *
   * @return {this} - 返回当前路由器实例
   */
  public initialize(): this {
    if (RouterCore._instance) return this
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
    RouterCore._instance = this
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
   * 创建路由位置对象
   * 根据导航目标创建标准化的路由位置信息
   *
   * @param {RouteTarget} target - 导航目标
   * @return {RouteLocation} 路由位置对象
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
   * 路由导航方法
   * 处理所有的路由跳转请求，包括 push 和 replace
   *
   * @param {RouteTarget} target - 导航目标
   * @return {Promise<NavigateResult>} 导航结果
   */
  public navigate(target: RouteTarget): Promise<NavigateResult> {
    // 生成新的任务ID并更新当前任务
    const taskId = ++this._taskCounter
    this._currentTaskId = taskId

    // 创建任务检查函数
    const isCurrentTask = () => this._currentTaskId === taskId

    // 保存当前路由状态的深拷贝
    const from = deepClone(this.currentRouteLocation)

    const performNavigation = async (
      _target: RouteTarget,
      isRedirect: boolean
    ): Promise<NavigateResult> => {
      // 创建标准化的路由位置对象
      const to = this.createRouteLocation(_target)
      const matched = to.matched.at(-1)

      // 处理路由重定向
      if (matched?.redirect) {
        if (typeof matched.redirect === 'string') {
          return performNavigation({ index: matched.redirect }, true)
        } else if (typeof matched.redirect === 'function') {
          return performNavigation(matched.redirect.call(this, to), true)
        }
      }

      // 创建导航结果对象的工具函数
      const createNavigateResult = (overrides: Partial<NavigateResult> = {}): NavigateResult => ({
        from,
        to,
        status: NavigateStatus.success,
        message: '导航成功',
        redirectFrom: isRedirect ? target : undefined,
        ...overrides
      })

      // 检查是否导航到相同路由
      if (this.isSameNavigate(to, this.currentRouteLocation)) {
        return createNavigateResult({
          status: NavigateStatus.duplicated,
          message: '导航到相同的路由，被系统阻止！'
        })
      }

      try {
        // 执行前置守卫
        const result = await this.onBeforeEach(to, this.currentRouteLocation)

        // 如果前置守卫返回false，取消导航
        if (result === false) {
          return createNavigateResult({
            status: NavigateStatus.aborted,
            message: '导航被前置守卫钩子阻止'
          })
        }

        // 检查任务是否已被新的导航取代
        if (!isCurrentTask()) {
          return createNavigateResult({
            status: NavigateStatus.cancelled,
            message: '已被新的导航请求替代，取消此次导航！'
          })
        }

        // 处理重定向
        if (typeof result === 'object' && result.index !== _target.index) {
          result.isReplace ??= false
          return performNavigation(result, true)
        }

        // 检查路由匹配结果
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
   * 完成导航过程
   * 更新路由状态并触发相关的生命周期钩子
   *
   * @param {RouteLocation} data - 新的路由数据
   * @param {_ScrollToOptions} savedPosition - 保存的滚动位置
   * @protected
   */
  protected completeNavigation(data?: RouteLocation, savedPosition?: _ScrollToOptions) {
    // 保存当前路由状态用于后续钩子
    const from = this._currentRouteLocation

    // 设置视图渲染完成后的回调
    this._completeViewRender = () => {
      // 处理滚动行为
      this.onScrollBehavior(this.currentRouteLocation, from, savedPosition).then()
      // 触发后置守卫
      this.onAfterEach(this.currentRouteLocation, from)
    }

    // 根据不同情况更新路由状态
    if (data) {
      this.updateRouteLocation(data)
    } else if (this._pendingReplace) {
      this.updateRouteLocation(this._pendingReplace)
    } else if (this._pendingPush) {
      this.updateRouteLocation(this._pendingPush)
    } else {
      throw new Error('[Vitarx.Router.completeNavigation][ERROR]：没有处于等待状态的导航请求。')
    }

    // 清理等待状态
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
   * @param {Required<RouteLocation>} to - 路由目标对象
   * @param {Required<RouteLocation>} from - 前路由对象
   * @return {false | RouteTarget} - 返回false表示阻止导航，返回新的路由目标对象则表示导航到新的目标
   */
  protected onBeforeEach(
    to: Required<RouteLocation>,
    from: Required<RouteLocation>
  ): BeforeEachCallbackResult {
    const matched = to.matched.at(-1)
    if (matched && 'beforeEnter' in matched && typeof matched.beforeEnter === 'function') {
      return matched.beforeEnter.call(this, to as any, from as any)
    }
    return this._options.beforeEach?.call(this, to as any, from as any)
  }

  /**
   * 触发路由后置守卫
   *
   * @param {Required<RouteLocation>} to - 路由目标对象
   * @param {Required<RouteLocation>} from - 前路由对象
   */
  protected onAfterEach(to: Required<RouteLocation>, from: Required<RouteLocation>): void {
    const matched = to.matched.at(-1)
    if (matched && 'afterEnter' in matched && typeof matched.afterEnter === 'function') {
      return matched.afterEnter.call(this, to as any, from as any)
    }
    return this._options.afterEach?.call(this, to as any, from as any)
  }

  /**
   * 更新路由数据
   * 使用补丁更新的方式更新路由状态
   *
   * @param {RouteLocation} newLocation - 新的路由数据
   * @private
   */
  private updateRouteLocation(newLocation: RouteLocation): void {
    patchUpdate(this._currentRouteLocation, newLocation)
  }

  /**
   * 处理滚动行为
   * 根据配置和保存的位置信息处理页面滚动
   *
   * @param {RouteLocation} to - 目标路由
   * @param {RouteLocation} from - 当前路由
   * @param {_ScrollToOptions} savedPosition - 保存的滚动位置
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
}
