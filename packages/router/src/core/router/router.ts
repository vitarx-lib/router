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
  type ShallowReactive,
  shallowReactive
} from 'vitarx'
import { __ROUTER_KEY__, NavState } from '../common/constant.js'
import { cloneRouteLocation, normalizePath, stringifyQuery } from '../common/shared.js'
import { updateRouteLocation } from '../common/update.js'
import {
  checkRouterOptions,
  hasOnlyChangeHash,
  isNavigateTarget,
  isPathIndex,
  processGuardResult,
  removePathSuffix
} from '../common/utils.js'
import type {
  AfterCallback,
  NavigateResult,
  NavigationGuard,
  NavTarget,
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
  TypedNavOptions,
  URLHash,
  URLParams,
  URLQuery
} from '../types/index.js'
import { hasNavState } from './helpers.js'
import { RouteManager, type RouteMatchResult } from './manager.js'

export abstract class Router {
  // 导航守卫
  private _beforeGuards: Set<NavigationGuard> | null = null
  // 后置钩子
  private _afterHooks: Set<AfterCallback> | null = null
  // 当前执行的导航任务ID，用于处理并发导航请求
  private _currentTaskId: number | null = null
  // 任务计数器，用于生成唯一的任务ID
  private _taskCounter = 0
  // 等待滚动目标
  private _pendingScrollTarget: ScrollTarget | null = null
  // 存储就绪状态的 Promise
  private readonly _readyPromise: Promise<NavigateResult>
  //  resolve 函数引用
  private _resolveReadyPromise!: (value: NavigateResult) => void
  // reject 函数引用
  private _rejectReadyPromise!: (reason: NavigateResult) => void
  // 当前路由位置 - 仅内部使用
  private readonly _routeLocation: ShallowReactive<RouteLocationRaw>
  /**
   * 路由位置 - 只读
   */
  public readonly currentRoute: RouteLocation
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
    const { routes, beforeEach, afterEach, ...userConfig } = options
    this.config = {
      base: '/',
      mode: 'path',
      ...userConfig
    }
    if (isFunction(beforeEach)) {
      this._beforeGuards = new Set([beforeEach])
    } else if (isArray(beforeEach)) {
      this._beforeGuards = new Set(beforeEach)
    }
    if (isFunction(afterEach)) {
      this._afterHooks = new Set([afterEach])
    } else if (isArray(afterEach)) {
      this._afterHooks = new Set(afterEach)
    }
    if (isArray(routes)) {
      this.manager = new RouteManager(routes)
    } else {
      this.manager = routes
    }
    this._routeLocation = shallowReactive<RouteLocationRaw>({
      path: '' as RoutePath,
      hash: '',
      href: '' as RoutePath,
      params: shallowReactive<URLParams>({}),
      query: shallowReactive<URLQuery>({}),
      matched: shallowReactive<RouteRecord[]>([]),
      meta: markRaw({})
    })
    this.currentRoute = readonly(this._routeLocation)
    this._readyPromise = new Promise<NavigateResult>((resolve, reject) => {
      this._resolveReadyPromise = resolve
      this._rejectReadyPromise = reject
    })
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
    this._beforeGuards = null
    this._afterHooks = null
  }
  /**
   * 添加后置回调函数
   *
   * @param hook
   */
  public afterEach(hook: AfterCallback): void {
    if (!isFunction(hook)) {
      throw new TypeError('The "hook" argument must be a function')
    }
    if (!this._afterHooks) {
      this._afterHooks = new Set()
    }
    this._afterHooks!.add(hook)
  }
  /**
   * 添加导航守卫
   * @param guard
   */
  public beforeEach(guard: NavigationGuard): void {
    if (!isFunction(guard)) {
      throw new TypeError('The "guard" argument must be a function')
    }
    if (!this._beforeGuards) {
      this._beforeGuards = new Set()
    }
    this._beforeGuards!.add(guard)
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
   * @param {TypedNavOptions} options - 导航选项
   * @param [options.params] - 路由参数对象
   * @param [options.query] - 查询参数对象
   * @param [options.hash] - 哈希值，如：`#hash`
   * @return {Promise<NavigateResult>} - 导航结果
   */
  public replace<T extends RouteIndex>(options: TypedNavOptions<T>): Promise<NavigateResult> {
    const target = { ...options, replace: true }
    // 如果是首次导航，走特殊处理通道
    if (this._currentTaskId === null) {
      return this.initialNavigation(target)
    }
    return this.navigate(target)
  }
  /**
   * 跳转到新的页面
   *
   * @param {TypedNavOptions} options - 导航选项
   * @param options.index - 路由索引
   * @param [options.params] - 路由参数对象
   * @param [options.query] - 查询参数对象
   * @param [options.hash] - 哈希值，如：`#hash`
   * @return {Promise<NavigateResult>} - 导航结果
   */
  public push<T extends RouteIndex>(options: TypedNavOptions<T>): Promise<NavigateResult> {
    const target = { ...options, replace: false }
    // 如果是首次导航，走特殊处理通道
    if (this._currentTaskId === null) {
      return this.initialNavigation(target)
    }
    return this.navigate(target)
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
   * 等待要渲染的异步组件被解析完成
   *
   * 此方法仅保证当前路由匹配的组件被加载完成，不保证其百分百渲染完成，
   * 可以额外 `await nextTick()` 来确保组件百分百渲染完成。
   *
   * @param route - 可选的路由位置参数，如果未提供则使用当前路由位置
   * @returns Promise<void> - 无返回值的Promise
   */
  public async resolveComponents(route?: RouteLocation): Promise<void> {
    // 创建一个空数组来存储加载任务
    const loadTask: Promise<Component>[] = []
    // 获取路由匹配项，如果传入route则使用其matched属性，否则使用当前路由的matched属性
    const matched = route?.matched || this._routeLocation.matched
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
    // 1. 解析目标路由
    const resolvedRoute = this.matchRoute(target, redirectFrom)
    // 2. 确保 from 对象存在
    const from = fromRoute ?? cloneRouteLocation(this._routeLocation)
    // 3. 构建 NavigationResult 基础对象
    const result: NavigateResult = {
      state: NavState.success, // 初始状态
      to: resolvedRoute, // 最终导航位置
      from, // 来源位置
      redirectFrom, // 最初的导航位置
      message: 'Navigation successful'
    }
    // ----------------------------------------------------------------
    // 4. 场景 A: 路由未匹配 (404)
    // ----------------------------------------------------------------
    if (!resolvedRoute) {
      // 触发全局 onNotFound 钩子
      const notFoundResult = await this.runNotFoundHook(target as NavTarget)

      //  并发竞争检查
      if (this._currentTaskId !== taskId) {
        result.state = NavState.aborted
        result.message = 'Navigation superseded by a newer navigation'
        return Promise.resolve(result)
      }

      // 如果钩子返回了新的目标，进行重定向
      if (notFoundResult) {
        return this.navigate(notFoundResult, from)
      }
      result.message = `No match found for target: ${JSON.stringify((target as NavTarget).to)}`
      // 如果钩子未处理，标记为失败
      result.state = NavState.notfound
      return result
    }
    // 4.1 处理仅哈希变化的情况
    if (hasOnlyChangeHash(from, resolvedRoute)) {
      this.hashUpdate?.(resolvedRoute)
      this._routeLocation.href = resolvedRoute.href
      result.state = NavState.success
      result.message = 'Navigation succeeded: only hash changed'
      return Promise.resolve(result)
    }
    // 4.2 非替换路由导航时进行重复路由检测
    if (!target.replace) {
      if (resolvedRoute.href === from.href) {
        result.state = NavState.duplicated
        result.message = 'Navigation aborted due to the same route'
        return Promise.resolve(result)
      }
    }
    // ----------------------------------------------------------------
    // 5. 场景 B: 路由匹配成功，执行守卫流程
    // ----------------------------------------------------------------
    try {
      // 执行全局前置守卫
      const guardResult = await this.runBeforeGuards(resolvedRoute, from)

      // 5.1 守卫拦截
      if (guardResult === false) {
        result.state = NavState.aborted
        result.message = 'Navigation aborted by guard'
        // 这里不抛错，属于正常中止，最后会 Resolve
      }
      // 5.2 守卫重定向
      else if (isNavigateTarget(guardResult)) {
        // 直接返回递归结果，如果内部 Reject 会自动向上传播
        return this.navigate(guardResult, from, redirectFrom ?? resolvedRoute)
      }

      // 5.3 并发竞争检查
      if (this._currentTaskId !== taskId) {
        result.state = NavState.aborted
        result.message = 'Navigation superseded by a newer navigation'
      }
    } catch (error: unknown) {
      // 捕获守卫内部的同步/异步错误
      if (isFunction(this.config.onError)) {
        this.config.onError.call(this, error, resolvedRoute, from)
      }
      result.state = NavState.exception
      result.error = error
      result.message = error instanceof Error ? error.message : 'Unknown error'

      // 【优化】直接在这里返回 Reject，逻辑更清晰，不再走后面的流程
      return Promise.reject(result)
    }

    // ----------------------------------------------------------------
    // 6. 决定最终状态：更新历史 & 完成导航
    // ----------------------------------------------------------------

    // 只有成功才更新历史和触发 complete
    if (result.state === NavState.success) {
      const scrollPosition = this[target.replace ? 'replaceHistory' : 'pushHistory'](resolvedRoute)
      this.completeNavigation(resolvedRoute, from, scrollPosition ?? null)
    }

    // ----------------------------------------------------------------
    // 7. 根据状态决定 Resolve 还是 Reject
    // ----------------------------------------------------------------

    // 关键修正：
    // 1. exception (异常) -> Reject (触发 isReady 报错)
    // 2. notfound (未找到) -> Reject (触发 isReady 报错)
    // 3. aborted (取消/替代) -> Resolve (正常结束，业务判断 state 即可)
    // 4. duplicated (重复)  -> Resolve (正常结束)
    // 5. success (成功)     -> Resolve
    if (hasNavState(result, NavState.exception | NavState.notfound)) {
      return Promise.reject(result)
    }

    return Promise.resolve(result)
  }
  /**
   * 处理首次导航
   * 它会拦截 navigate 的结果，仅在首次调用时生效，用于控制 isReady 状态
   *
   * @param target - 导航目标
   * @returns 返回标准的导航结果 Promise
   */
  private async initialNavigation(target: NavTarget): Promise<NavigateResult> {
    // 双重检查：如果已经初始化过，直接执行普通导航，不再处理 isReady 逻辑
    // 注意：这里利用 _currentTaskId 作为初始化标志位是非常合适的
    if (this._currentTaskId !== null) {
      return this.navigate(target)
    }

    try {
      // 1. 执行底层导航
      const result = await this.navigate(target)

      // 2. 只有导航真正成功，才去加载组件并 resolve isReady
      if (result.state === NavState.success) {
        try {
          await this.resolveComponents(result.to!)
          this._resolveReadyPromise(result)
        } catch (error) {
          // 组件加载失败，转为异常状态
          result.state = NavState.exception
          result.error = error
          result.message = 'Initial navigation failed: async component load error'
          this._rejectReadyPromise(result)
          // 注意：这里需要将成功的结果转为 reject 抛出，告知调用者实际上失败了
          return Promise.reject(result)
        }
      } else {
        // 3. 如果首次导航结果是 aborted/duplicated/notfound，视为初始化失败
        this._rejectReadyPromise(result)
      }
      return result
    } catch (error) {
      // 4. 如果 navigate 本身抛出异常
      this._rejectReadyPromise(error as NavigateResult)
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
    updateRouteLocation(this._routeLocation, to)
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
    this._pendingScrollTarget = target
    // 等待路由组件解析完成后滚动
    this.resolveComponents().then(async () => {
      await nextTick()
      // 确保滚动目标未改变
      if (this._pendingScrollTarget === target) {
        // 清除待处理的滚动目标
        this._pendingScrollTarget = null
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
  private async runNotFoundHook(target: NavTarget): Promise<NavTarget | void> {
    if (isFunction(this.config.onNotFound)) {
      const res = await this.config.onNotFound.call(this, target)
      if (isNavigateTarget(res)) return res
    }
  }
  /**
   * 执行全局后置钩子
   * @param to - 目标路由
   * @param from - 来源路由
   */
  private runAfterHooks(to: RouteLocation, from: RouteLocation): void {
    if (!this._afterHooks) return
    for (const hook of this._afterHooks) {
      if (!isFunction(hook)) continue
      try {
        hook.call(this, to, from)
      } catch (e) {
        if (this.config.onError) {
          this.config.onError.call(this, e, to, from)
        } else {
          logger.error('[Router] Error in after hook:', e)
        }
      }
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
  ): Promise<boolean | NavTarget | void> {
    // 执行全局前置守卫
    if (this._beforeGuards) {
      for (const guard of this._beforeGuards) {
        const result = await guard.call(this, to, from)
        const processedResult = processGuardResult(result)
        if (processedResult !== true) return processedResult
      }
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
    const fullPath = this.buildUrl(path, query, hash)
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
      href: fullPath,
      params,
      query,
      hash,
      matched,
      meta,
      redirectFrom
    }
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
    const hashStr = isString(hash) && hash.startsWith('#') ? hash.trim() : ''
    const queryStr = stringifyQuery(query)
    const href = `${path}${queryStr}${hashStr}`
    return this.config.mode === 'hash'
      ? normalizePath(`${this.config.base}/#${href}`, true)
      : normalizePath(`${this.config.base}${href}`)
  }
}
