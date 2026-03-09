import {
  App,
  type AppObjectPlugin,
  deepClone,
  flushSync,
  isDeepEqual,
  isPlainObject,
  logger,
  markRaw,
  type Reactive,
  readonly,
  shallowReactive
} from 'vitarx'
import { NavigateStatus } from './constant.js'
import RouterRegistry from './router-registry.js'
import type {
  _ScrollBehavior,
  _ScrollOptions,
  BeforeEachCallbackResult,
  HashStr,
  HistoryMode,
  NavigateConfig,
  NavigateResult,
  NavigateTarget,
  ReadonlyRouteLocation,
  ResolvedRouterOptions,
  RouteIndex,
  RouteLocation,
  RouteMetaData,
  RouteNormalized,
  RoutePath,
  RouterOptions,
  ScrollBehaviorHandler,
  ScrollTarget
} from './router-types.js'
import { patchUpdateRoute } from './update.js'
import {
  addPathSuffix,
  checkParams,
  cloneRouteLocation,
  formatHash,
  formatPath,
  getPathSuffix,
  mergePathParams,
  objectToQueryString
} from './utils.js'

/**
 * 路由器核心类
 *
 * 继承自 RouterRegistry，负责处理路由导航、历史记录管理、生命周期等核心功能。
 * 采用单例模式，确保全局只有一个路由器实例。
 */
export default abstract class RouterCore extends RouterRegistry implements AppObjectPlugin {
  // 当前执行的导航任务ID，用于处理并发导航请求
  private _currentTaskId: number | null = null
  // 任务计数器，用于生成唯一的任务ID
  private _taskCounter = 0
  /**
   * 滚动行为处理器
   * 用于自定义路由切换时的滚动行为
   */
  private _scrollBehaviorHandler: ScrollBehaviorHandler | undefined = undefined
  /**
   * 当前路由数据
   * 包含当前路由的完整信息，如路径、参数、查询字符串等
   */
  private readonly _route: Reactive<RouteLocation>
  /**
   * 只读路由位置数据
   *
   * @private
   */
  private readonly _readonlyRouteLocation: ReadonlyRouteLocation

  /**
   * 路由器构造函数
   * 初始化路由器并确保单例
   *
   * @param {RouterOptions} options - 路由器配置选项
   * @throws {Error} 如果已存在路由器实例则抛出错误
   */
  protected constructor(options: RouterOptions) {
    super(options)
    this._route = shallowReactive<RouteLocation>({
      __is_route_location: true,
      index: this._options.base,
      path: this._options.base,
      hash: '',
      fullPath: '',
      params: shallowReactive<Record<string, any>>({}),
      query: shallowReactive<Record<string, any>>({}),
      matched: shallowReactive<RouteNormalized[]>([]),
      meta: markRaw({}),
      suffix: ''
    })
    this._readonlyRouteLocation = readonly(this._route)
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
   * @return {Readonly<ResolvedRouterOptions>} - 初始化配置
   */
  get options(): Readonly<ResolvedRouterOptions> {
    return this._options
  }

  /**
   * 路由器模式
   */
  get mode(): HistoryMode {
    return this._options.mode
  }

  /**
   * 当前路由数据
   *
   * 它是只读的，但它是响应式的，所以你可以在监听其变化。
   *
   * @return {ReadonlyRouteLocation} - 当前路由数据
   */
  public get route(): ReadonlyRouteLocation {
    return this._readonlyRouteLocation
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
   * @param {NavigateConfig} options - 导航选项
   * @param [options.params] - 路由参数对象
   * @param [options.query] - 查询参数对象
   * @param [options.hash] - 哈希值，如：`#hash`
   * @return {Promise<NavigateResult>} - 导航结果
   */
  public replace<T extends RouteIndex>(options: NavigateConfig<T>): Promise<NavigateResult> {
    return this.navigate({ ...options, isReplace: true })
  }

  /**
   * 跳转到新的页面
   *
   * @param {NavigateConfig} options - 导航选项
   * @param options.index - 路由索引
   * @param [options.params] - 路由参数对象
   * @param [options.query] - 查询参数对象
   * @param [options.hash] - 哈希值，如：`#hash`
   * @return {Promise<NavigateResult>} - 导航结果
   */
  public push<T extends RouteIndex>(options: NavigateConfig<T>): Promise<NavigateResult> {
    return this.navigate({ ...options, isReplace: false })
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
    // 初始化路由表
    this.setupRoutes(this._options.routes)
    if (typeof this.options.scrollBehavior === 'function') {
      this._scrollBehaviorHandler = this.options.scrollBehavior
    } else {
      this._scrollBehavior = this.options.scrollBehavior
    }
    // 初始化路由器
    this.initializeRouter()
    return this
  }

  /**
   * 此方法用于浏览器端滚动到指定位置
   *
   * @param scrollTarget
   */
  public scrollTo(scrollTarget: ScrollTarget | undefined): void {
    if (!this.isBrowser || !scrollTarget || typeof scrollTarget !== 'object') return
    try {
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
        }
        return
      }
      window.scrollTo({ behavior: this.scrollBehavior, ...scrollTarget })
    } catch (e) {
      logger.error(
        '[Router] Failed to scroll to specified position, please check scroll target parameters',
        e
      )
    }
  }

  /**
   * 创建路由位置对象
   * 根据导航目标创建标准化的路由位置信息
   *
   * @param {NavigateTarget} target - 导航目标
   * @return {RouteLocation} 路由位置对象
   */
  public createRouteLocation(target: NavigateTarget | RouteLocation): RouteLocation {
    if ('__is_route_location' in target) return target
    // 获取路由对象
    const route = this.findRoute(target)
    const { index, query = {}, params = {}, hash = '' } = target
    const path: RoutePath = route ? mergePathParams(route.path, params) : formatPath(index)
    const matched: RouteNormalized[] = []
    if (route && checkParams(route, params)) {
      let parent = this.findParentRoute(route)
      while (parent) {
        // 如果父路由具有`component`则添加到匹配的路由栈中
        if (parent.component) matched.unshift(parent)
        parent = this.findParentRoute(parent)
      }
      matched.push(route)
    }
    const meta: RouteMetaData = route?.meta ? deepClone(route.meta) : ({} as RouteMetaData)
    const hashStr = formatHash(hash, true)
    const suffix = getPathSuffix(index)
    const fullPath = this.makeFullPath(path, query, hashStr, suffix)
    return {
      index,
      path,
      hash: hashStr,
      fullPath,
      params,
      query,
      matched,
      meta,
      suffix,
      __is_route_location: true
    }
  }

  /**
   * 路由导航方法
   *
   * 处理所有的路由跳转请求，包括 push 和 replace
   *
   * @param {NavigateTarget} target - 导航目标
   * @return {Promise<NavigateResult>} 导航结果
   */
  public navigate(target: NavigateTarget | RouteLocation): Promise<NavigateResult> {
    // 生成新的任务ID并更新当前任务
    const taskId = ++this._taskCounter
    this._currentTaskId = taskId

    // 创建任务检查函数
    const isCurrentTask = () => this._currentTaskId === taskId

    // 保存当前路由状态的深拷贝
    const from = cloneRouteLocation(this.route) as RouteLocation

    const performNavigation = async (
      _target: NavigateTarget | RouteLocation,
      isRedirect: boolean
    ): Promise<NavigateResult> => {
      // 创建导航结果对象的工具函数
      const createNavigateResult = (overrides: Partial<NavigateResult> = {}): NavigateResult => ({
        from,
        to,
        status: NavigateStatus.success,
        message: 'Navigation succeeded',
        redirectFrom: isRedirect ? target : undefined,
        ...overrides
      })

      // 创建标准化的路由位置对象
      const to = this.createRouteLocation(_target)

      // 检查是否强制导航（跳过重复检查）
      const isForce = '_force' in _target && _target._force

      // 检查是否导航到相同路由（强制导航时跳过此检查）
      if (
        !isForce &&
        to.fullPath === this.route.fullPath &&
        isDeepEqual(to.params, this.route.params)
      ) {
        return createNavigateResult({
          status: NavigateStatus.duplicated,
          message: 'Navigation blocked: target is the same as current route'
        })
      } else if (
        !isForce &&
        to.matched.at(-1) === this._route.matched.at(-1) &&
        to.path === this._route.path &&
        isDeepEqual(to.query, this._route.query) &&
        to.hash !== this._route.hash
      ) {
        this.updateHash(to.hash)
        return createNavigateResult({
          status: NavigateStatus.success,
          message: 'Navigation succeeded: only hash changed'
        })
      }

      // 获取当前路由的最后一个匹配项
      const matched = to.matched.at(-1)

      // 处理路由重定向
      if (matched?.redirect) {
        let redirectTarget: NavigateTarget | undefined
        if (typeof matched.redirect === 'object' && matched.redirect.index) {
          redirectTarget = matched.redirect
        } else if (typeof matched.redirect === 'string') {
          redirectTarget = { index: matched.redirect }
        } else if (typeof matched.redirect === 'function') {
          const redirectHandleResult = matched.redirect.call(this, to)
          if (isPlainObject(redirectHandleResult)) {
            redirectTarget = redirectHandleResult
          }
        }
        if (redirectTarget?.index) return performNavigation(redirectTarget, true)
      }

      try {
        // 执行前置守卫
        const result = await this.onBeforeEach(to, from)

        // 如果前置守卫返回false，取消导航
        if (result === false) {
          return createNavigateResult({
            status: NavigateStatus.aborted,
            message: `Navigation to "${to.index}" was blocked by beforeEach guard`
          })
        }

        // 检查任务是否已被新的导航取代
        if (!isCurrentTask()) {
          return createNavigateResult({
            status: NavigateStatus.cancelled,
            message: 'Navigation cancelled: replaced by a new navigation request'
          })
        }

        // 处理重定向
        if (typeof result === 'object' && result.index !== _target.index) {
          result.isReplace ??= false
          return performNavigation(result, true)
        } else if (typeof result === 'string' && result !== _target.index) {
          return performNavigation({ index: result, isReplace: false }, true)
        }

        // 检查路由匹配结果
        if (!to.matched.length && !this.missing) {
          return createNavigateResult({
            status: NavigateStatus.not_matched,
            message: `Route not found: "${to.index}" is not registered`
          })
        }

        // 更新路由历史
        if ('isReplace' in _target && _target.isReplace) {
          this.replaceHistory(to, from)
        } else {
          this.pushHistory(to, from)
        }
        return createNavigateResult(
          !to.matched.length && this.missing
            ? {
                status: NavigateStatus.not_matched,
                message: `Route not found: "${to.fullPath}" will render missing component`
              }
            : undefined
        )
      } catch (error) {
        return createNavigateResult({
          status: NavigateStatus.exception,
          message: 'Exception occurred during navigation',
          error
        })
      }
    }

    return performNavigation(target, false)
  }

  /**
   * 更新当前导航数据中的query参数
   *
   * 会同步更新`fullPath`
   *
   * @param {Record<string, string>} query - 新的query参数对象
   * @public
   */
  public updateQuery(query: Record<string, string>) {
    if (!isDeepEqual(this._route.query, query)) {
      this._route.query = query
      this._route.fullPath = this.makeFullPath(
        this._route.path,
        query,
        this._route.hash,
        this._route.suffix
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
  public updateHash(hash: `#${string}` | '') {
    if (typeof hash !== 'string') {
      throw new TypeError(
        `[Router] updateHash() expects a string value, but received ${typeof hash}`
      )
    }
    const newHash = formatHash(hash, true)
    if (newHash !== this._route.hash) {
      this._route.hash = newHash
      // 更新完整的path
      this._route.fullPath = this.makeFullPath(
        this._route.path,
        this._route.query,
        newHash,
        this._route.suffix
      )
    }
  }

  /**
   * 完成导航过程
   * 更新路由状态并触发相关的生命周期钩子
   *
   * @param to - 目标路由
   * @param from - 当前路由
   * @param {_ScrollOptions} savedPosition - 保存的滚动位置
   * @protected
   */
  protected completeNavigation(
    to: RouteLocation,
    from: RouteLocation,
    savedPosition?: _ScrollOptions
  ) {
    patchUpdateRoute(this._route, to)
    // 刷新视图
    flushSync()
    // 处理滚动行为
    this.onScrollBehavior(this.route, from, savedPosition).then()
    // 触发后置守卫
    this.onAfterEach(this.route, from)
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
   * @param suffix - 路径后缀
   * @return {string}
   */
  protected makeFullPath(
    path: string,
    query: `?${string}` | '' | Record<string, string>,
    hash: HashStr,
    suffix: string
  ): `/${string}` {
    if (hash && !hash.startsWith('#')) hash = `#${hash}`
    if (typeof query === 'object') query = objectToQueryString(query)
    path = addPathSuffix(path, suffix || this._options.defaultSuffix)
    return this.mode === 'hash'
      ? formatPath(`${this.basePath}/${query}#${path}${hash}`)
      : formatPath(`${this.basePath}${path}${query}${hash}`)
  }

  /**
   * 添加历史记录
   *
   * 子类必须实现该方法，且需要调用`this.completeNavigation(to,from)`方法完成导航！
   *
   * @protected
   * @param to
   * @param from
   */
  protected abstract pushHistory(to: RouteLocation, from: RouteLocation): void

  /**
   * 替换历史记录
   *
   * 子类必须实现该方法，且需要调用`this.completeNavigation(to,from)`方法完成导航！
   *
   * @protected
   * @param to
   * @param from
   */
  protected abstract replaceHistory(to: RouteLocation, from: RouteLocation): void

  /**
   * 触发路由前置守卫
   *
   * @param {RouteLocation} to - 路由目标对象
   * @param {RouteLocation} from - 前路由对象
   * @return {false | NavigateTarget} - 返回false表示阻止导航，返回新的路由目标对象则表示导航到新的目标
   */
  protected onBeforeEach(to: RouteLocation, from: RouteLocation): BeforeEachCallbackResult {
    const matched = to.matched.at(-1)
    if (matched && 'beforeEnter' in matched && typeof matched.beforeEnter === 'function') {
      return matched.beforeEnter.call(this, to, from)
    }
    return this._options.beforeEach?.call(this, to, from)
  }

  /**
   * 触发路由后置守卫
   *
   * @param {ReadonlyRouteLocation} to - 路由目标对象
   * @param {ReadonlyRouteLocation} from - 前路由对象
   */
  protected onAfterEach(to: ReadonlyRouteLocation, from: ReadonlyRouteLocation): void {
    const matched = to.matched.at(-1)
    // 未匹配到路由时不触发后置守卫
    if (!matched) return void 0
    if ('afterEnter' in matched && typeof matched.afterEnter === 'function') {
      return matched.afterEnter.call(this, to, from)
    }
    return this._options.afterEach?.call(this, to, from)
  }

  /**
   * 处理滚动行为
   * 根据配置和保存的位置信息处理页面滚动
   *
   * @param {ReadonlyRouteLocation} to - 目标路由
   * @param {ReadonlyRouteLocation} from - 当前路由
   * @param {_ScrollOptions} savedPosition - 保存的滚动位置
   * @private
   */
  protected async onScrollBehavior(
    to: ReadonlyRouteLocation,
    from: ReadonlyRouteLocation,
    savedPosition: _ScrollOptions | undefined
  ): Promise<void> {
    try {
      if (this._scrollBehaviorHandler) {
        const scrollTarget = await this._scrollBehaviorHandler(to, from, savedPosition)
        if (scrollTarget) this.scrollTo(scrollTarget)
      } else {
        if (!savedPosition && !to.hash) {
          this.scrollTo({ left: 0, top: 0 })
        } else {
          this.scrollTo(savedPosition ?? { el: to.hash })
        }
      }
    } catch (e) {
      logger.error('[Router] Exception caught while handling scroll behavior', e)
    }
  }

  /**
   * 安装路由器
   *
   * 此方法用于安装路由器，将路由器实例添加到应用程序中。
   *
   * 安装路由器后，应用程序就可以使用 `inject('router')` 访问路由器实例。
   *
   * @example
   * import { createApp } from 'vitarx'
   * import { createRouter } from 'vitarx'
   * import AppHome from './App.js'
   *
   * const router = createRouter({// 相关配置})
   * const app = createApp(AppHome).use(router)
   * app.mount('#root')
   *
   * @param {App} app - 应用程序实例
   * @returns {void}
   */
  install(app: App): void {
    app.provide('router', this)
  }

  /**
   * 销毁路由器
   *
   * 子类可重写此方法以清理资源（如移除事件监听器）
   */
  public destroy(): void {}
}
