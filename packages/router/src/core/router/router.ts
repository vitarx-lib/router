import {
  App,
  type Component,
  getLazyLoader,
  isArray,
  isFunction,
  isPlainObject,
  isString,
  logger,
  markRaw,
  nextTick,
  preloadComponent,
  readonly,
  shallowRef,
  type ShallowRef
} from 'vitarx'
import { __ROUTER_KEY__, NavState } from '../common/constant.js'
import { cloneRouteLocation, normalizePath, stringifyQuery } from '../common/shared.js'
import { isSameRouteLocation, updateRouteLocation } from '../common/update.js'
import {
  checkRouterOptions,
  hasOnlyChangeHash,
  hasValidNavOptions,
  hasValidRouteIndex,
  isPathIndex,
  processGuardResult,
  registerHookTool,
  removePathSuffix,
  resolveNavTarget,
  runLeaveGuards,
  runRouteUpdateHooks
} from '../common/utils.js'
import type {
  AfterCallback,
  NavErrorListener,
  NavigateResult,
  NavigationGuard,
  NavOptions,
  NavTarget,
  NotFoundHandler,
  ResolvedRouterConfig,
  Route,
  RouteIndex,
  RouteLocation,
  RouteLocationRaw,
  RouteMetaData,
  RouteName,
  RoutePath,
  RouteRecord,
  RouterOptions,
  RouteViewComponent,
  ScrollPosition,
  ScrollTarget,
  URLHash,
  URLQuery
} from '../types/index.js'
import { RouteManager, type RouteMatchResult } from './manager.js'

interface Hooks {
  beforeEach: Set<NavigationGuard> | null
  afterEach: Set<AfterCallback> | null
  onError: Set<NavErrorListener> | null
  onNotFound: Set<NotFoundHandler> | null
}

/**
 * 路由器抽象基类
 *
 * 提供路由导航、历史记录管理、守卫钩子等核心功能。
 * 具体实现需继承此类并实现抽象方法。
 *
 * @example
 * ```ts
 * import { createRouter } from 'vitarx-router'
 *
 * const router = createRouter({
 *   routes: [...],
 *   beforeEach: (to, from) => { ... },
 *   afterEach: (to, from) => { ... }
 * })
 * ```
 */
export abstract class Router {
  /**
   * 当前路由位置 - 仅内部使用
   * @private
   */
  private readonly _routeLocation: ShallowRef<RouteLocationRaw>
  /**
   * 缓存路由位置对象
   * @private
   */
  private readonly _cache: Map<string, RouteLocationRaw> = new Map()
  /**
   * 存储就绪状态的 Promise
   * @private
   */
  private readonly _readyPromise: Promise<NavigateResult>
  /**
   *  resolve 函数引用
   * @private
   */
  private _resolveReadyPromise!: (value: NavigateResult) => void
  /**
   * reject 函数引用
   * @private
   */
  private _rejectReadyPromise!: (reason: unknown) => void
  /**
   * 钩子函数
   * @private
   */
  private readonly _hooks: Hooks = {
    beforeEach: null,
    afterEach: null,
    onError: null,
    onNotFound: null
  }
  /**
   * 当前执行的导航任务ID，用于处理并发导航请求
   * @private
   */
  private _currentTaskId: number | null = null
  /**
   * 任务计数器，用于生成唯一的任务ID
   * @private
   */
  private _taskCounter = 0
  /**
   * 等待滚动目标
   * @private
   */
  private _scrollTaskID: number = 0
  /**
   * 路由器配置
   */
  public readonly config: ResolvedRouterConfig
  /**
   * 路由线路管理器
   *
   * @see {@link RouteManager}
   */
  public readonly manager: RouteManager
  constructor(options: RouterOptions) {
    if (__VITARX_DEV__) checkRouterOptions(options)
    const { routes, beforeEach, afterEach, onError, onNotFound, ...userConfig } = options
    this.config = {
      base: '/',
      mode: 'path',
      ...userConfig
    }
    if (isFunction(beforeEach)) {
      this._hooks.beforeEach = new Set([beforeEach])
    } else if (isArray(beforeEach)) {
      this._hooks.beforeEach = new Set(beforeEach)
    }
    if (isFunction(afterEach)) {
      this._hooks.afterEach = new Set([afterEach])
    } else if (isArray(afterEach)) {
      this._hooks.afterEach = new Set(afterEach)
    }
    if (isFunction(onError)) {
      this._hooks.onError = new Set([onError])
    } else if (isArray(onError)) {
      this._hooks.onError = new Set(onError)
    }
    if (isFunction(onNotFound)) {
      this._hooks.onNotFound = new Set([onNotFound])
    } else if (isArray(onNotFound)) {
      this._hooks.onNotFound = new Set(onNotFound)
    }
    if (isArray(routes)) {
      this.manager = new RouteManager(routes)
    } else {
      this.manager = routes
    }
    this._routeLocation = shallowRef(
      markRaw({
        path: '/',
        hash: '',
        href: '/',
        params: {},
        query: {},
        matched: [],
        meta: {}
      })
    )
    this._readyPromise = new Promise<NavigateResult>((resolve, reject) => {
      this._resolveReadyPromise = resolve
      this._rejectReadyPromise = reject
    })
  }
  /**
   * 获取当前路由位置对象
   */
  get currentRoute(): RouteLocation {
    return readonly(this._routeLocation.value)
  }
  /**
   * 判断路由器是否已准备就绪
   *
   * 返回一个 Promise，它会在路由器完成初始导航之后被解析，
   * 如果初始导航已经发生，则该 Promise 会被立刻解析。
   *
   * @returns {Promise<NavigateResult>} - 导航结果
   */
  public isReady(): Promise<NavigateResult> {
    // 如果没有初始化直接 reject
    if (this._currentTaskId === null) {
      return Promise.reject(new Error('Router is not initialized.'))
    }
    return this._readyPromise
  }
  /**
   * 安装路由器
   *
   * 此方法用于安装路由器，将路由器实例添加到应用程序中。
   *
   * 安装路由器后，应用程序下的组件就可以使用 `useRouter()` 访问路由器实例。
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
  public install(app: App): void {
    app.provide(__ROUTER_KEY__, this)
  }
  /**
   * 释放路由器
   *
   * 此方法用于释放路由器，通常仅用于单元测试中。
   *
   * @returns {void}
   */
  public destroy(): void {
    this.manager.clearRoutes()
  }
  /**
   * 添加后置回调函数
   *
   * @param hook
   */
  public afterEach(hook: AfterCallback): void {
    registerHookTool(this._hooks, 'afterEach', hook)
  }
  /**
   * 添加导航守卫
   * @param guard
   */
  public beforeEach(guard: NavigationGuard): void {
    registerHookTool(this._hooks, 'beforeEach', guard)
  }
  /**
   * 跳转指定的历史记录位置
   *
   * 如果delta == 0，则没有任何效果。
   *
   * @param {number} delta - 跳转的步数（正数为前进，负数为后退）
   */
  abstract go(delta: number): void
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
   * @param {NavOptions} target - 导航目标对象 / 路由索引
   * @param [target.params] - 路由参数对象
   * @param [target.query] - 查询参数对象
   * @param [target.hash] - 哈希值，如：`#hash`
   * @return {Promise<NavigateResult>} - 导航结果
   */
  public replace<T extends RouteIndex>(
    target: T | NavOptions<T> | RouteLocation
  ): Promise<NavigateResult> {
    const resolved = { ...resolveNavTarget(target), replace: true }
    // 如果是首次导航，走特殊处理通道
    if (this._currentTaskId === null) {
      return this.initialNavigation(resolved)
    }
    return this.navigate(resolved)
  }
  /**
   * 跳转到新的页面
   *
   * @param {NavOptions} target - 导航目标对象 / 路由索引
   * @param target.index - 路由索引
   * @param [target.params] - 路由参数对象
   * @param [target.query] - 查询参数对象
   * @param [target.hash] - 哈希值，如：`#hash`
   * @return {Promise<NavigateResult>} - 导航结果
   */
  public push<T extends RouteIndex>(
    target: T | NavOptions<T> | RouteLocation
  ): Promise<NavigateResult> {
    const resolved = { ...resolveNavTarget(target), replace: false }
    // 如果是首次导航，走特殊处理通道
    if (this._currentTaskId === null) {
      return this.initialNavigation(resolved)
    }
    return this.navigate(resolved)
  }
  /**
   * 添加路由
   *
   * @param route - 路由对象
   * @param parent - 父路由索引
   * @see {@link RouteManager#addRoute}
   */
  public addRoute(route: Route, parent?: RouteIndex): void {
    this.manager.addRoute(route, parent)
  }
  /**
   * 移除路由
   *
   * @param index - 路由的索引，可以是path或name
   * @see {@link RouteManager#removeRoute}
   */
  public removeRoute(index: RouteIndex): void {
    this.manager.removeRoute(index)
  }
  /**
   * 检查路由是否存在
   *
   * @param index - 路由的索引，可以是path或name
   * @returns {boolean} - 如果路由存在则返回true，否则返回false
   * @see {@link RouteManager#find}
   */
  public hasRoute(index: RouteIndex): boolean {
    return !!this.manager.find(index)
  }
  /**
   * 解析路由匹配到的所有异步组件
   *
   * 此方法会确保所有匹配到的异步组件加载完成（无论成功或失败）。
   * 采用 allSettled 策略：即使部分组件加载失败，也不会阻断路由导航。
   * 组件加载的具体错误应由视图层捕获和处理。
   *
   * @param route - 可选的路由位置，默认使用当前路由
   * @returns {Promise<void>} 等待所有加载任务结束
   */
  public async resolveComponents(route?: RouteLocation): Promise<void> {
    // 创建一个空数组来存储加载任务
    const loadTask: Promise<Component>[] = []
    // 获取路由匹配项，如果传入route则使用其matched属性，否则使用当前路由的matched属性
    const matched = route?.matched || this._routeLocation.value.matched
    // 遍历目标路由的所有匹配项
    for (const route of matched) {
      // 遍历路由中的所有组件
      for (const component of Object.values(route.component!)) {
        // 获取组件的懒加载器
        const loader = getLazyLoader(component)
        if (loader) {
          // 预加载组件并添加到任务列表
          loadTask.push(preloadComponent(loader))
        }
      }
    }
    // 等待所有加载任务完成
    if (loadTask.length) {
      await Promise.allSettled(loadTask)
    }
    return void 0
  }
  /**
   * 添加历史记录
   *
   * @protected
   * @param to
   */
  protected abstract pushHistory(to: RouteLocation): ScrollPosition | void
  /**
   * 替换历史记录
   *
   * @param to
   */
  protected abstract replaceHistory(to: RouteLocation): ScrollPosition | void
  /**
   * 滚动到指定位置
   *
   * @param target
   */
  protected scrollTo?(target: ScrollTarget): void
  /**
   * 更新 hash 值
   *
   * @param route - 路由
   */
  protected hashUpdate?(route: RouteLocation): void
  /**
   * 导航到指定位置
   * @param target - 导航目标对象 | 路由位置对象
   * @param fromRoute - 来源路由对象
   * @param redirectFrom - 重定向来源对象
   * @returns - 返回导航结果
   */
  protected async navigate(
    target: NavTarget,
    fromRoute?: RouteLocation,
    redirectFrom?: RouteLocation
  ): Promise<NavigateResult> {
    // 0. 生成任务ID并开始导航
    const taskId = ++this._taskCounter
    this._currentTaskId = taskId
    const hasChanged = (): boolean => {
      if (this._currentTaskId === taskId) return false
      result.state = NavState.cancelled
      result.message = 'Navigation superseded by a newer navigation'
      return true
    }
    // 1. 解析目标路由
    const to = this.matchRoute(target, redirectFrom)
    // 2. 确保 from 对象存在
    const from = fromRoute ?? cloneRouteLocation(this._routeLocation.value)
    // 3. 构建 NavigationResult 基础对象
    const result: NavigateResult = {
      state: NavState.success, // 初始状态
      to, // 最终导航位置
      from, // 来源位置
      redirectFrom, // 最初的导航位置
      message: 'Navigation successful'
    }
    // ----------------------------------------------------------------
    // 4. 场景 A: 路由未匹配 (404)
    // ----------------------------------------------------------------
    if (!to) {
      // 触发全局 onNotFound 钩子
      const notFoundResult = this.runNotFoundHook(target)
      // 如果钩子返回了新的目标，进行重定向
      if (notFoundResult) {
        return this.navigate(notFoundResult, from)
      }
      result.message = `No match found for target: ${JSON.stringify((target as NavTarget).to)}`
      result.state = NavState.notfound
      return result
    }
    // ----------------------------------------------------------------
    // 5. 场景 B: 仅hash变化 / 重复路由
    // ----------------------------------------------------------------
    // 5.1 重复路由
    if (to.href === from.href && to.matched.length === from.matched.length) {
      result.state = NavState.duplicated
      result.message = 'Navigation aborted due to the same route'
      return result
    }
    // 5.2 仅hash变化
    if (hasOnlyChangeHash(to, from)) {
      this.hashUpdate?.(to)
      this._routeLocation.value.href = to.href
      result.state = NavState.success
      result.message = 'Navigation succeeded: only hash changed'
      return result
    }
    // ----------------------------------------------------------------
    // 6. 场景 C: 路由重定向
    // ----------------------------------------------------------------
    const matched = to.matched.at(-1)!
    const redirect = isFunction(matched.redirect)
      ? matched.redirect.call(this, to)
      : matched.redirect
    if (redirect) {
      if (hasValidRouteIndex(redirect)) {
        return this.navigate({ to: redirect }, from, redirectFrom ?? to)
      } else if (hasValidNavOptions(redirect)) {
        return this.navigate(redirect, from, redirectFrom ?? to)
      } else if (!matched.component) {
        throw new Error(
          `[Router] Navigation failed: The redirect configuration for the matching destination route is invalid and the components are not defined, check the configuration of the ${to.path} route`
        )
      }
    }
    // ----------------------------------------------------------------
    // 7. 场景 D: 路由匹配成功，执行守卫流程
    // ----------------------------------------------------------------
    try {
      // 执行全局前置守卫
      const guardResult = await this.runBeforeGuards(to, from)

      // 7.1 并发竞争检查
      if (hasChanged()) return result

      if (guardResult === 'same') {
        result.state = NavState.success
        result.message = 'Navigation succeeded: params or query changed'
        return result
      }
      // 7.2 守卫拦截
      if (guardResult === false) {
        result.state = NavState.aborted
        result.message = 'Navigation aborted by before guard'
        return result
      }
      // 7.3 守卫重定向
      if (hasValidNavOptions(guardResult)) {
        // 直接返回递归结果，如果内部 Reject 会自动向上传播
        return this.navigate(guardResult, from, redirectFrom ?? to)
      }
      // 7.4 离开守卫
      const leaveGuardResult = await runLeaveGuards(to, from)

      if (hasChanged()) return result

      if (!leaveGuardResult) {
        result.state = NavState.aborted
        result.message = 'Navigation aborted by leave guard'
        return result
      }
    } catch (error: unknown) {
      // 捕获守卫内部的同步/异步错误
      this.reportError(error, to, from)
      return Promise.reject(error)
    }
    const scrollPosition = this[target.replace ? 'replaceHistory' : 'pushHistory'](to)
    this.completeNavigation(to, from, scrollPosition ?? null)
    return result
  }
  /**
   * 处理首次导航
   * 它会拦截 navigate 的结果，仅在首次调用时生效，用于控制 isReady 状态
   *
   * @param target - 导航目标
   * @returns 返回标准的导航结果 Promise
   */
  private async initialNavigation(target: NavTarget): Promise<NavigateResult> {
    try {
      // 1. 执行底层导航
      const result = await this.navigate(target)

      // 2. 只有导航真正成功，才去加载组件并 resolve isReady
      if (result.state === NavState.success) {
        try {
          await this.resolveComponents(result.to!)
          this._resolveReadyPromise(result)
        } catch (error) {
          this._rejectReadyPromise(result)
          return Promise.reject(error)
        }
      } else {
        // 3. 如果首次导航结果是 aborted/duplicated/notfound，视为初始化失败
        this._rejectReadyPromise(result)
      }
      return result
    } catch (error) {
      // 4. 如果 navigate 本身抛出异常
      this._rejectReadyPromise(error)
      // 继续向上抛出，让调用者能捕获到
      return Promise.reject(error)
    }
  }
  /**
   * 完成导航过程
   * 更新路由状态并触发相关的生命周期钩子
   *
   * @param to - 目标路由
   * @param from - 当前路由
   * @param {ScrollOptions} savedPosition - 保存的滚动位置
   * @protected
   */
  private completeNavigation(
    to: RouteLocation,
    from: RouteLocation,
    savedPosition: ScrollPosition | null = null
  ): void {
    // 1. 确认导航：更新路由状态
    this._routeLocation.value = updateRouteLocation(this._cache, to)
    // 2. 触发全局后置钩子
    this.runAfterHooks(to, from)
    // 3. 处理滚动行为
    this.runScrollBehavior(to, from, savedPosition)
  }
  /**
   * 执行滚动行为的私有方法
   * @param to - 目标路由位置
   * @param from - 来源路由位置
   * @param savedPosition - 保存的滚动位置
   */
  private runScrollBehavior(
    to: RouteLocation,
    from: RouteLocation,
    savedPosition: ScrollPosition | null
  ): void {
    // 如果在 SSR 环境下，或者没有配置 scrollTo 函数，则直接返回
    if (__VITARX_SSR__) return
    // 没有滚动行为函数，则直接返回
    if (!this.scrollTo) return
    const defaultTarget = to.hash ? { el: to.hash } : { top: 0, left: 0 }
    // 初始化目标滚动位置为保存的位置
    let target: ScrollTarget = savedPosition || defaultTarget
    // 检查是否配置了自定义滚动行为函数
    if (isFunction(this.config.scrollBehavior)) {
      try {
        // 调用自定义滚动行为函数
        const result = this.config.scrollBehavior(to, from, savedPosition)
        if (result === false) return // 如果返回 false，则不进行滚动
        if (isPlainObject(result)) target = result // 如果有返回值，则更新目标位置
      } catch (e) {
        // 捕获并记录自定义滚动行为函数中的错误
        logger.error('[Router] Error in scrollBehavior callback:', e)
      }
    }
    const id = this._scrollTaskID++
    // 等待路由组件解析完成后滚动
    this.resolveComponents().then(async () => {
      await nextTick()
      // 确保滚动目标未改变
      if (id === this._scrollTaskID) {
        // 执行滚动到目标位置
        this.scrollTo?.(target)
      }
    })
  }
  /**
   * 处理 404 错误
   * @param target - 导航目标对象
   * @returns - 返回处理结果
   */
  private runNotFoundHook(target: NavTarget): NavTarget | void {
    if (!this._hooks.onNotFound) return
    for (const hook of this._hooks.onNotFound) {
      try {
        const result = hook.call(this, target)
        if (hasValidNavOptions(result)) return result
        if (isString(result) || typeof result === 'symbol') {
          return {
            to: result
          }
        }
      } catch (e) {
        logger.error('[Router] Error in onNotFound callback:', e)
      }
    }
  }
  /**
   * 执行全局后置钩子
   * @param to - 目标路由
   * @param from - 来源路由
   */
  private runAfterHooks(to: RouteLocation, from: RouteLocation): void {
    if (!this._hooks.afterEach) return
    for (const hook of this._hooks.afterEach) {
      try {
        hook.call(this, to, from)
      } catch (e) {
        this.reportError(e, to, from)
      }
    }
  }
  /**
   * 报告错误
   *
   * @param error - 错误对象
   * @param to - 目标路由
   * @param from - 来源路由
   * @private
   */
  private reportError(error: unknown, to: RouteLocation, from: RouteLocation): void {
    if (this._hooks.onError) {
      for (const hook of this._hooks.onError) {
        if (isFunction(hook)) {
          hook.call(this, error, to, from)
        }
      }
    } else {
      logger.error('[Router] Error:', error)
    }
  }
  /**
   * 执行前置守卫 (异步执行)
   * 顺序：全局 -> 父 -> 子
   * 注意：守卫内的异常会直接向上抛出，由 navigate 方法捕获
   */
  private async runBeforeGuards(
    to: RouteLocation,
    from: RouteLocation
  ): Promise<boolean | NavTarget | void | 'same'> {
    // 执行全局前置守卫
    if (this._hooks.beforeEach) {
      for (const guard of this._hooks.beforeEach) {
        const result = await guard.call(this, to, from)
        const processedResult = processGuardResult(result)
        if (processedResult !== true) return processedResult
      }
      return true
    }

    // 如果是相同路由，则执行路由更新钩子
    if (isSameRouteLocation(to, from)) {
      try {
        runRouteUpdateHooks(to, from)
      } catch (e) {
        this.reportError(e, to, from)
      }
      return 'same'
    }

    // 执行路由独享守卫 (顺序：父 -> 子)
    for (const record of to.matched) {
      if (isFunction(record.beforeEnter)) {
        const result = await record.beforeEnter.call(this, to, from)
        const processedResult = processGuardResult(result)
        if (processedResult !== true) return processedResult
      } else if (Array.isArray(record.beforeEnter)) {
        for (const guard of record.beforeEnter) {
          const result = await guard.call(this, to, from)
          const processedResult = processGuardResult(result)
          if (processedResult !== true) return processedResult
        }
      }
    }
    // 全部通过，放行
    return true
  }
  /**
   * 创建缺失的路由
   * @param component - 路由组件
   * @param path - 路径
   * @param query - 查询参数
   * @param hash - 哈希值
   * @returns {RouteLocationRaw} - 返回创建的路由位置对象
   */
  private createMissingRoute(
    component: RouteViewComponent,
    path: RouteLocationRaw['path'],
    query: RouteLocationRaw['query'] = {},
    hash: RouteLocationRaw['hash'] = ''
  ): RouteLocationRaw {
    return {
      href: this.buildUrl(path, query, hash),
      path,
      hash,
      params: {},
      query,
      meta: {},
      matched: [{ path, isGroup: false, component: { default: component } }]
    }
  }
  /**
   * 构建完整URL路径
   *
   * @param path - 路径
   * @param [query] - 查询参数
   * @param [hash] - 哈希值
   * @returns {string} - 返回完整路径
   */
  public buildUrl(path: string, query: URLQuery = {}, hash: URLHash | '' = ''): `/${string}` {
    const suffix = this.config.suffix
    if (suffix && !path.endsWith('/') && !path.includes('.')) {
      path += suffix.startsWith('.') ? suffix : `.${suffix}`
    }
    const hashStr = isString(hash) && hash.startsWith('#') && hash.length > 1 ? hash.trim() : ''
    const queryStr = stringifyQuery(query)
    const href = `${path}${queryStr}${hashStr}`
    return this.config.mode === 'hash'
      ? normalizePath(`${this.config.base}/#${href}`, true)
      : normalizePath(`${this.config.base}${href}`)
  }
  /**
   * 匹配路由
   *
   * @param target 导航目标对象，包含目标路径、参数、查询和哈希信息
   * @param [redirectFrom] - 重定向来源对象
   * @returns {RouteLocationRaw | null} 返回路由位置对象，如果无法匹配则返回null
   */
  public matchRoute(target: NavTarget, redirectFrom?: RouteLocation): RouteLocation | null {
    let matchTarget = target.to
    const isPath = isPathIndex(matchTarget)
    // 如果配置了后缀且目标是路径，则去除后缀
    if (this.config.suffix && isPath) {
      // 去除路径后缀
      matchTarget = removePathSuffix(target.to as string, this.config.suffix)
    }
    // 在路由注册表中匹配目标路径
    let match: RouteMatchResult | null
    if (isPath) {
      match = this.manager.matchByPath(matchTarget as RoutePath)
    } else {
      match = this.manager.matchByName(matchTarget as RouteName, target.params)
    }
    // 如果没有匹配的路由，则返回null
    if (!match) {
      const component = this.config.missing
      if (component && isString(target.to) && target.to.startsWith('/')) {
        return this.createMissingRoute(
          component,
          target.to as `/${string}`,
          target.query,
          target.hash
        )
      }
      return null
    }
    // 获取匹配的路由信息
    const route = match.route
    const path = match.path
    // 合并匹配到的参数和目标参数
    const params = match.params
    // 使用目标的查询参数，如果没有则使用空对象
    const query = target.query || {}
    // 使用目标的哈希值，如果没有则使用空字符串
    const hash = target.hash || ''
    // 初始化匹配的路由记录数组，包含当前路由
    const matched: RouteRecord[] = [route]
    // 初始化元数据，使用当前路由的元数据
    let meta: RouteMetaData = route.meta ?? {}
    // 创建完整路径，包含路径、查询、哈希和配置信息
    const href = this.buildUrl(path, query, hash)
    // 向上遍历父路由
    let parent = route.parent
    while (parent) {
      // 如果父路由具有`component`则添加到匹配的路由栈中
      if (parent.component) {
        matched.unshift(parent)
      }
      // 合并父路由的元数据，子路由的元数据优先
      meta = { ...parent.meta, ...meta }
      parent = parent.parent
    }
    // 返回路由位置对象
    return {
      path,
      href,
      params,
      query,
      hash,
      matched,
      meta,
      redirectFrom
    }
  }
}
