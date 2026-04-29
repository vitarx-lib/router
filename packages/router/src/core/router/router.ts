import {
  App,
  type Component,
  getLazyLoader,
  isArray,
  isFunction,
  isPlainObject,
  isPromise,
  isString,
  logger,
  nextTick,
  preloadComponent,
  readonly,
  type ReadonlyObject,
  shallowReactive
} from 'vitarx'
import { __ROUTER_KEY__, NavState } from '../common/constant.js'
import { updateRouteLocation } from '../common/update.js'
import {
  hasOnlyChangeHash,
  hasValidNavTarget,
  hasValidPath,
  hasValidRouteIndex,
  processGuardResult,
  registerHookTool,
  removePathSuffix,
  resolveNavTarget
} from '../common/utils.js'
import { cloneRouteLocation, normalizePath, stringifyQuery } from '../shared/utils.js'
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
import { checkRouterOptions } from './checkOptions.js'
import { RouteManager, type RouteMatchResult } from './manager.js'

/**
 * 钩子函数集合
 *
 * 存储路由器生命周期中各阶段的回调函数，
 * 每个阶段的钩子以 Set 形式存储，支持动态添加和移除。
 */
interface Hooks {
  /** 全局前置守卫集合，在路由匹配成功后、导航确认前执行 */
  beforeEach: Set<NavigationGuard> | null
  /** 全局后置钩子集合，在导航成功结束后执行 */
  afterEach: Set<AfterCallback> | null
  /** 错误处理钩子集合，在导航过程中发生错误时执行 */
  onError: Set<NavErrorListener> | null
  /** 未匹配路由钩子集合，在路由匹配失败（404）时执行 */
  onNotFound: Set<NotFoundHandler> | null
}

/**
 * 导航上下文
 *
 * 在每次导航过程中创建，封装该次导航所需的所有状态和操作。
 * 作为各导航阶段处理方法之间的共享数据载体，避免方法间传递大量独立参数。
 *
 * @internal
 */
export interface NavigationContext {
  /** 当前导航任务的唯一标识，用于并发导航竞争检测 */
  taskId: number
  /** 导航结果对象，各阶段处理方法可修改其 state 和 message */
  result: NavigateResult
  /** 目标路由位置，匹配失败时为 null */
  to: RouteLocation | null
  /** 来源路由位置 */
  from: RouteLocation
  /** 重定向来源路由位置，仅在重定向链中存在 */
  redirectFrom: RouteLocation | undefined
  /** 是否替换当前历史记录（而非推入新记录） */
  replace: boolean
  /**
   * 检测重定向循环
   *
   * 每次重定向时调用，递增重定向计数器。
   * 当重定向次数超过最大限制时抛出错误，防止无限循环。
   *
   * @param path - 重定向目标路径，用于错误信息
   * @throws {Error} 当重定向次数超过 MAX_REDIRECTS 时
   */
  checkRedirectLoop: (path: string) => void
  /**
   * 检测并发导航竞争
   *
   * 判断当前导航任务是否已被更新的导航任务取代。
   * 如果已被取代，则将结果状态标记为 cancelled。
   *
   * @returns true 表示当前导航已被新导航取代，应中止执行
   */
  hasChanged: () => boolean
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
   * 最大重定向次数限制
   * @private
   */
  public static readonly MAX_REDIRECTS = 16
  /**
   * 当前路由位置 - 仅内部使用
   * @private
   */
  private readonly _routeLocation: RouteLocation
  /**
   * 只读路由位置对象
   * @private
   */
  private readonly _readonlyLocation: ReadonlyObject<RouteLocation, true>
  /**
   * 存储就绪状态的 Promise（延迟创建）
   * @private
   */
  private _readyPromise: Promise<void> | null = null
  /**
   * 是否已完成初始导航
   * @private
   */
  private _isInitialized: boolean = false
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
   * 重定向计数器，用于检测无限重定向循环
   * @private
   */
  private _redirectCount = 0
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
      mode: 'hash',
      ...userConfig
    }
    if (beforeEach) {
      this._hooks.beforeEach = new Set(isArray(beforeEach) ? beforeEach : [beforeEach])
    }
    if (afterEach) {
      this._hooks.afterEach = new Set(isArray(afterEach) ? afterEach : [afterEach])
    }
    if (onError) {
      this._hooks.onError = new Set(isArray(onError) ? onError : [onError])
    }
    if (onNotFound) {
      this._hooks.onNotFound = new Set(isArray(onNotFound) ? onNotFound : [onNotFound])
    }
    this.manager = isArray(routes) ? new RouteManager(routes) : routes
    this._routeLocation = shallowReactive({
      path: '/',
      hash: '',
      href: '/',
      params: shallowReactive({}),
      query: shallowReactive({}),
      matched: shallowReactive([]),
      meta: shallowReactive({})
    })
    this._readonlyLocation = readonly(this._routeLocation)
  }
  /**
   * 获取当前路由位置对象
   */
  get route(): ReadonlyObject<RouteLocation, true> {
    return this._readonlyLocation
  }
  /**
   * 获取解析后的路由记录数组
   */
  get routes(): RouteRecord[] {
    return Array.from(this.manager.routes)
  }
  /**
   * 判断路由器是否已准备就绪
   *
   * 返回一个 Promise，它会在路由器完成初始导航之后被解析，
   * 如果初始导航已经完成，则该 Promise 会被立刻解析。
   *
   * @returns {Promise<void>} - 导航结果
   */
  public async isReady(): Promise<void> {
    if (!this._isInitialized) {
      return Promise.reject(new Error('Router is not initialized.'))
    }
    return this._readyPromise ?? void 0
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
    this._readyPromise = null
    this._isInitialized = false
    this._currentTaskId = null
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
    if (!this._isInitialized) {
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
    if (!this._isInitialized) {
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
   * 等待视图渲染完成。
   *
   * 该方法会等待异步组件解析完成以及 DOM 更新周期结束。
   * 如果在导航后立即调用，可确保视图过渡所需的 DOM 已渲染；
   * 如果在页面稳定后调用，则等待下一个微任务周期。
   *
   * @param [navResult] - 可选的异步导航结果（由 router.push/replace 返回）
   * @returns {Promise<void>}
   * @example
   * // 方式一：链式调用（推荐，性能更佳）
   * // 不必等待 push 完成，直接传入，减少等待延迟
   * await router.waitViewRender(router.push('/foo'))
   *
   * // 方式二：分步调用
   * await router.push('/foo')
   * await router.waitViewRender()
   *
   * // 此时 DOM 已更新
   * console.log(document.querySelector('#app').innerHTML)
   */
  public async waitViewRender(navResult?: Promise<NavigateResult>): Promise<void> {
    // 兼容处理：如果传入了导航结果，先等待导航成功
    if (isPromise(navResult)) await navResult

    // 核心逻辑：等待异步组件加载 + 框架调度器更新 DOM
    await this.resolveComponents()
    await nextTick()
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

  // ============================================================
  // 导航流程
  // ============================================================

  /**
   * 处理首次导航
   * 它会拦截 navigate 的结果，仅在首次调用时生效，用于控制 isReady 状态
   *
   * @param target - 导航目标
   * @returns 返回标准的导航结果 Promise
   */
  private initialNavigation(target: NavTarget): Promise<NavigateResult> {
    this._isInitialized = true
    const result = this.navigate(target)
    this._readyPromise = result
      .then(() => void 0)
      .finally(() => {
        this._readyPromise = null
      })
    return result
  }

  /**
   * 创建导航上下文
   *
   * 在每次导航开始时构建上下文对象，封装该次导航所需的所有状态：
   * - 生成唯一任务ID，用于并发导航竞争检测
   * - 重置重定向计数器（非重定向场景下）
   * - 执行路由匹配，确定目标路由位置
   * - 构建 NavigateResult 基础对象
   * - 提供 checkRedirectLoop 和 hasChanged 闭包方法
   *
   * @param target - 导航目标
   * @param fromRoute - 来源路由，默认使用当前路由位置
   * @param redirectFrom - 重定向来源路由
   * @returns 导航上下文对象
   */
  private createNavigationContext(
    target: NavTarget,
    fromRoute?: RouteLocation,
    redirectFrom?: RouteLocation
  ): NavigationContext {
    // 生成任务ID并标记为当前任务
    const taskId = ++this._taskCounter
    this._currentTaskId = taskId
    // 新的导航任务（非重定向）重置重定向计数器
    if (!redirectFrom) {
      this._redirectCount = 0
    }
    // 解析目标路由
    const to = this.matchRoute(target, redirectFrom)
    // 确定来源路由
    const from = fromRoute ?? cloneRouteLocation(this._routeLocation)
    // 构建导航结果基础对象
    const result: NavigateResult = {
      state: NavState.success,
      to,
      from,
      redirectFrom,
      message: 'Navigation successful'
    }
    return {
      taskId,
      result,
      to,
      from,
      redirectFrom,
      replace: !!target.replace,
      /**
       * 重定向循环检测闭包
       * 每次重定向时递增计数器，超过最大限制时抛出错误
       */
      checkRedirectLoop: (path: string) => {
        this._redirectCount++
        if (this._redirectCount > Router.MAX_REDIRECTS) {
          throw new Error(
            `[Router] Detected infinite redirect loop: exceeded maximum redirects (${Router.MAX_REDIRECTS}). Last redirect was to "${path}". Check your route configuration or navigation guards.`
          )
        }
      },
      /**
       * 并发竞争检测闭包
       * 比较当前任务ID与最新任务ID，判断当前导航是否已被新导航取代
       */
      hasChanged: () => {
        if (this._currentTaskId === taskId) return false
        result.state = NavState.cancelled
        result.message = 'Navigation superseded by a newer navigation'
        return true
      }
    }
  }

  /**
   * 处理路由未匹配（404）场景
   *
   * 当目标路由无法匹配时执行：
   * 1. 触发全局 onNotFound 钩子
   * 2. 如果钩子返回了新的导航目标，进行重定向
   * 3. 否则返回 notfound 状态
   *
   * @param context - 导航上下文
   * @param target - 原始导航目标
   * @returns 导航结果
   */
  private handleNotFound(
    context: NavigationContext,
    target: NavTarget
  ): Promise<NavigateResult> | NavigateResult {
    const notFoundResult = this.runNotFoundHook(target)
    // 钩子返回了新的导航目标，进行重定向
    if (notFoundResult) {
      context.checkRedirectLoop(String(notFoundResult.index))
      return this.navigate(notFoundResult, context.from)
    }
    // 无钩子处理，返回未匹配结果
    context.result.message = `No match found for target: ${JSON.stringify((target as NavTarget).index)}`
    context.result.state = NavState.notfound
    return context.result
  }

  /**
   * 处理重复路由场景
   *
   * 当目标路由与当前路由的 href 和最终匹配记录完全相同时，
   * 视为重复导航，返回 duplicated 状态，不执行后续流程。
   *
   * @param context - 导航上下文
   * @returns 重复路由结果，或 null 表示非重复路由
   */
  private handleDuplicatedRoute(context: NavigationContext): NavigateResult | null {
    if (!context.to) return null
    if (
      context.to.href === context.from.href &&
      context.to.matched.at(-1) === context.from.matched.at(-1)
    ) {
      context.result.state = NavState.duplicated
      context.result.message = 'Navigation aborted due to the same route'
      return context.result
    }
    return null
  }

  /**
   * 处理仅 hash 变化场景
   *
   * 当路由路径和查询参数相同，仅 hash 部分发生变化时，
   * 直接更新 hash 值并触发 hashUpdate 回调，不执行完整的导航流程。
   *
   * @param context - 导航上下文
   * @returns hash 变化结果，或 null 表示非仅 hash 变化
   */
  private handleHashOnlyChange(context: NavigationContext): NavigateResult | null {
    if (!context.to) return null
    if (hasOnlyChangeHash(context.to, context.from)) {
      this._routeLocation.href = context.to.href
      this.hashUpdate?.(context.to)
      context.result.state = NavState.success
      context.result.message = 'Navigation succeeded: only hash changed'
      return context.result
    }
    return null
  }

  /**
   * 处理路由重定向场景
   *
   * 当目标路由配置了 redirect 字段时，解析重定向目标并递归执行导航：
   * 1. 支持 redirect 为函数（动态重定向）或静态值
   * 2. 重定向目标可以是路由索引（RouteIndex）或导航目标（NavTarget）
   * 3. 如果重定向配置无效且无组件定义，抛出错误
   *
   * @param context - 导航上下文
   * @returns 重定向导航结果，或 null 表示无需重定向
   */
  private handleRedirect(
    context: NavigationContext
  ): Promise<NavigateResult> | NavigateResult | null {
    if (!context.to) return null
    const to = context.to
    const matched = to.matched.at(-1)!
    // 解析重定向配置：支持函数和静态值
    const redirect = isFunction(matched.redirect)
      ? matched.redirect.call(this, to)
      : matched.redirect
    if (!redirect) return null
    // 重定向目标为路由索引（路径或名称）
    if (hasValidRouteIndex(redirect)) {
      context.checkRedirectLoop(String(redirect))
      return this.navigate({ index: redirect }, context.from, context.redirectFrom ?? to)
    }
    // 重定向目标为完整的导航目标对象
    if (hasValidNavTarget(redirect)) {
      context.checkRedirectLoop(String(redirect.index))
      return this.navigate(redirect, context.from, context.redirectFrom ?? to)
    }
    // 重定向配置无效且无组件定义，抛出错误
    if (!matched.component) {
      throw new Error(
        `[Router] Navigation failed: The redirect configuration for the matching destination route is invalid and the components are not defined, check the configuration of the ${to.path} route`
      )
    }
    return null
  }

  /**
   * 执行守卫流程
   *
   * 按顺序执行路由离开守卫和全局前置守卫，
   * 在每个异步守卫执行后进行并发竞争检测。
   * 如果守卫拦截导航或触发重定向，返回对应结果；
   * 如果守卫全部通过，返回 null 表示继续导航。
   *
   * @param context - 导航上下文
   * @returns 守卫拦截/重定向结果，或 null 表示守卫全部通过
   */
  private async executeGuards(context: NavigationContext): Promise<NavigateResult | null> {
    if (!context.to) return null
    try {
      // 执行离开守卫（从内到外）
      const leaveGuardResult = await this.runRouteLeaveGuards(context.to, context.from)
      // 并发竞争检测：离开守卫是异步的，执行期间可能有新导航
      if (context.hasChanged()) return context.result
      // 离开守卫拦截
      if (!leaveGuardResult) {
        context.result.state = NavState.aborted
        context.result.message = 'Navigation aborted by leave guard'
        return context.result
      }
      // 执行前置守卫（全局 → 路由独享）
      const guardResult = await this.runBeforeGuards(context.to, context.from)
      // 并发竞争检测：前置守卫也是异步的
      if (context.hasChanged()) return context.result
      // 处理前置守卫结果
      return this.handleGuardResult(context, guardResult)
    } catch (error: unknown) {
      // 捕获守卫内部的同步/异步错误
      this.reportError(error, context.to, context.from)
      return Promise.reject(error)
    }
  }

  /**
   * 处理前置守卫执行结果
   *
   * 根据守卫返回值决定导航走向：
   * - false: 拦截导航，返回 aborted 状态
   * - NavTarget: 重定向到新目标
   * - 其他（true/void）: 放行，继续导航
   *
   * @param context - 导航上下文
   * @param guardResult - 前置守卫的返回值
   * @returns 拦截/重定向结果，或 null 表示守卫通过
   */
  private handleGuardResult(
    context: NavigationContext,
    guardResult: boolean | NavTarget | void
  ): NavigateResult | Promise<NavigateResult> | null {
    // 守卫拦截
    if (guardResult === false) {
      context.result.state = NavState.aborted
      context.result.message = 'Navigation aborted by before guard'
      return context.result
    }
    // 守卫重定向
    if (hasValidNavTarget(guardResult)) {
      context.checkRedirectLoop(String(guardResult.index))
      return this.navigate(
        guardResult,
        context.from,
        context.redirectFrom ?? context.to ?? undefined
      )
    }
    // 守卫通过，继续导航
    return null
  }

  /**
   * 完成导航流程
   *
   * 守卫全部通过后执行最后的导航确认：
   * 1. 根据替换标记更新历史记录（push 或 replace）
   * 2. 调用 completeNavigation 更新路由状态、触发后置钩子和滚动行为
   *
   * @param context - 导航上下文
   * @returns 导航成功结果
   */
  private finalizeNavigation(context: NavigationContext): NavigateResult {
    if (!context.to) return context.result
    const scrollPosition = this[context.replace ? 'replaceHistory' : 'pushHistory'](context.to)
    this.completeNavigation(context.to, context.from, scrollPosition ?? null)
    return context.result
  }

  /**
   * 导航到指定位置
   *
   * 作为导航流程的编排器，按顺序协调各场景处理方法的执行：
   * 1. 创建导航上下文（路由匹配、并发控制初始化）
   * 2. 处理 404 场景（路由未匹配）
   * 3. 处理重复路由场景
   * 4. 处理仅 hash 变化场景
   * 5. 处理路由重定向场景
   * 6. 执行守卫流程（离开守卫 → 前置守卫）
   * 7. 完成导航（更新历史记录、触发后置钩子）
   *
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
    // 创建导航上下文
    const context = this.createNavigationContext(target, fromRoute, redirectFrom)
    // 场景1: 路由未匹配 (404)
    if (!context.to) {
      return this.handleNotFound(context, target)
    }
    // 仅在路由第一次路由后检测重复路由
    if (context.from.matched.length) {
      // 场景2: 重复路由
      const duplicatedResult = this.handleDuplicatedRoute(context)
      if (duplicatedResult) return duplicatedResult
      // 场景3: 仅hash变化
      const hashOnlyResult = this.handleHashOnlyChange(context)
      if (hashOnlyResult) return hashOnlyResult
    }
    // 场景4: 路由重定向
    const redirectResult = await this.handleRedirect(context)
    if (redirectResult) return redirectResult
    // 场景5: 执行守卫流程
    const guardResult = await this.executeGuards(context)
    if (guardResult) return guardResult
    // 场景6: 完成导航
    return this.finalizeNavigation(context)
  }

  // ============================================================
  // 导航完成与滚动行为
  // ============================================================

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
    // 没有滚动行为函数，则直接返回
    if (!this.scrollTo) return
    const id = ++this._scrollTaskID
    // 等待路由组件解析完成后滚动
    this.waitViewRender().then(async () => {
      // 确保滚动目标未改变
      if (id === this._scrollTaskID) {
        // 执行滚动到目标位置
        this.scrollTo?.(target)
      }
    })
  }

  // ============================================================
  // 守卫与钩子执行
  // ============================================================

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
        if (hasValidNavTarget(result)) return result
        if (isString(result) || typeof result === 'symbol') {
          return {
            index: result
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
   * 执行前置守卫 (异步执行)
   * 顺序：全局 -> 父 -> 子
   * 注意：守卫内的异常会直接向上抛出，由 navigate 方法捕获
   */
  private async runBeforeGuards(
    to: RouteLocation,
    from: RouteLocation
  ): Promise<boolean | NavTarget | void> {
    // 执行全局前置守卫
    if (this._hooks.beforeEach) {
      for (const guard of this._hooks.beforeEach) {
        const result = await guard.call(this, to, from)
        const processedResult = processGuardResult(result)
        if (processedResult !== true) return processedResult
      }
      return true
    }

    try {
      this.runRouteUpdateHooks(to, from)
    } catch (e) {
      this.reportError(e, to, from)
    }

    // 执行路由独享守卫 (顺序：父 -> 子)
    for (const record of to.matched) {
      if (from.matched.includes(record)) continue
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
   * 执行路由离开守卫（leave guards）的异步函数
   *
   * @internal
   * @param to - 目标路由位置对象
   * @param from - 当前路由位置对象
   * @returns Promise<boolean> 返回一个布尔值，表示是否允许离开当前路由
   * @description
   * 该方法通过对比 to.matched 和 from.matched 路由匹配数组的差异，
   * 识别出所有需要离开的路由层级，并按从内到外的顺序执行相应的离场钩子。
   * 如果任一守卫返回 false，则阻止路由跳转。
   */
  private async runRouteLeaveGuards(to: RouteLocation, from: RouteLocation): Promise<boolean> {
    for (let i = from.matched.length - 1; i >= 0; i--) {
      if (i >= to.matched.length || from.matched[i] !== to.matched[i]) {
        const guardSet = from.matched[i].leaveGuards
        if (guardSet) {
          for (const guard of guardSet) {
            const result = await guard(to, from)
            if (result === false) return false
          }
        }
      }
    }

    return true
  }
  /**
   * 执行路由更新前的钩子函数
   *
   * @internal
   * @param to - 目标路由位置对象
   * @param from - 当前路由位置对象
   * @returns void
   * @description
   * 该方法通过对比 to.matched 和 from.matched 路由匹配数组的差异，
   * 识别出所有同时存在于两个路由中的相同路由层级，并按从外到内的顺序执行相应的更新钩子。
   */
  private runRouteUpdateHooks(to: RouteLocation, from: RouteLocation): void {
    const minLength = Math.min(to.matched.length, from.matched.length)
    for (let i = 0; i < minLength; i++) {
      if (from.matched[i] === to.matched[i]) {
        const hookSet = from.matched[i].beforeUpdateHooks
        if (hookSet) {
          for (const hook of hookSet) {
            hook(to, from)
          }
        }
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
          try {
            hook.call(this, error, to, from)
          } catch (e) {
            logger.error('[Router] Error in onError callback:', e)
          }
        }
      }
    }
  }

  // ============================================================
  // 路由匹配与URL构建
  // ============================================================

  /**
   * 创建缺失的路由
   * @param component - 路由组件
   * @param path - 路径
   * @param query - 查询参数
   * @param hash - 哈希值
   * @returns {RouteLocation} - 返回创建的路由位置对象
   */
  private createMissingRoute(
    component: RouteViewComponent,
    path: RouteLocation['path'],
    query: RouteLocation['query'] = {},
    hash: RouteLocation['hash'] = ''
  ): RouteLocation {
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
    hash = hash.trim() as URLHash
    const hashStr = isString(hash) && hash.startsWith('#') && hash.length > 1 ? hash : ''
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
   * @returns {RouteLocation | null} 返回路由位置对象，如果无法匹配则返回null
   */
  public matchRoute(target: NavTarget, redirectFrom?: RouteLocation): RouteLocation | null {
    let matchTarget = target.index
    const isPath = hasValidPath(matchTarget)
    // 如果配置了后缀且目标是路径，则去除后缀
    if (this.config.suffix && isPath) {
      // 去除路径后缀
      matchTarget = removePathSuffix(target.index as string, this.config.suffix)
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
      if (component && hasValidPath(target.index)) {
        return this.createMissingRoute(component, target.index, target.query, target.hash)
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
