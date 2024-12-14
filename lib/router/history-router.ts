import Router from './router.js'
import type { NavigateData } from './type.js'
import { extractUrlData, formatPath } from './utils.js'

/**
 * 基于`window.history`实现的路由器
 *
 * 支持前进、后退、跳转等操作
 *
 * 两种url路由模式：
 * - `hash` 路由模式：使用`window.location.hash`作为路由标识，例如：`/#/page1`
 * - `path` 路由模式：使用`window.location.pathname`作为路由标识，例如：`/page1`
 */
export default class HistoryRouter extends Router {
  private _currentRoute: NavigateData = {
    index: '/',
    path: '/',
    hash: '',
    fullPath: '/',
    params: {},
    query: {},
    matched: null
  }

  get currentNavigateData(): Readonly<NavigateData> {
    return this._currentRoute
  }

  /**
   * @inheritDoc
   */
  public override go(delta?: number): boolean {
    this.webHistory.go(delta)
    return true
  }

  /**
   * @inheritDoc
   */
  public override initialize() {
    if (!this.initialized) {
      super.initialize()
      // 初始化当前路由
      this.initializeRoute()
      // 初始化时监听 popstate 事件，处理历史记录返回时的路由恢复
      window.addEventListener('popstate', this.onPopState.bind(this))
    }
    return this
  }

  /**
   * @inheritDoc
   */
  protected override makeFullPath(
    path: string,
    query: `?${string}` | '',
    hash: `#${string}` | ''
  ): `/${string}` {
    return this.mode === 'hash'
      ? formatPath(`${this.basePath}/#${path}${query}${hash}`)
      : formatPath(`${this.basePath}${path}${query}${hash}`)
  }

  /**
   * @inheritDoc
   */
  protected pushHistory(data: NavigateData): void {
    this.webHistory.pushState(this.createState(data), '', data.fullPath)
  }

  /**
   * @inheritDoc
   */
  protected replaceHistory(data: NavigateData): void {
    this.webHistory.replaceState(this.createState(data), '', data.fullPath)
  }

  /**
   * window.history
   *
   * @private
   */
  private get webHistory() {
    return window.history
  }

  /**
   * 初始化第一个路由
   *
   * @private
   */
  protected initializeRoute() {
    const { path } = extractUrlData(window.location, this.mode as 'path', this.basePath)
    // 替换路由
    this.replace(path).then()
  }

  /**
   * 创建历史记录状态
   *
   * 用于在浏览器历史记录中存储路由信息，以支持前进、后退等操作。
   *
   * @private
   */
  private createState(data: NavigateData): Omit<NavigateData, 'matched'> {
    const { matched, ...state } = data
    return state
  }

  /**
   * 处理浏览器历史记录的返回/前进事件
   */
  private onPopState(event: PopStateEvent) {
    console.log('路由地址变化', event.state)
    if (event.state?.index) {
      // 状态
      // const state = event.state as WebHistoryState
    } else {
      console.error('[Vitarx.WebHistoryRouter.onPopState]：state is undefined')
    }
  }
}
