import type { NavigateData, RouterOptions, RouteTarget } from './type.js'
import { urlToRouteTarget } from './utils.js'
import MemoryRouter from './memory-router.js'

export default class HashRouter extends MemoryRouter {
  /**
   * 是否正在执行 replace 操作
   *
   * @private
   */
  private _pendingReplace: NavigateData | null = null
  /**
   * 是否正在执行 push 操作
   *
   * @private
   */
  private _pendingPush: NavigateData | null = null

  constructor(options: RouterOptions) {
    super(options)
    this.ensureHash()
  }

  /**
   * 当前路由目标
   *
   * @returns {RouteTarget} - 包含 index、hash 和 query 的对象
   */
  protected get currentRouteTarget(): MakeRequired<RouteTarget, 'query' | 'hash'> {
    return urlToRouteTarget(window.location, 'hash', this.basePath)
  }

  /**
   * @inheritDoc
   */
  protected override initializeRouter() {
    window.addEventListener('hashchange', this.onHashChange.bind(this))
    this.replace(this.currentRouteTarget).then()
  }

  /**
   * @inheritDoc
   */
  protected pushHistory(data: NavigateData) {
    this._pendingPush = data
    window.location.replace(data.fullPath)
  }

  /**
   * @inheritDoc
   */
  protected replaceHistory(data: NavigateData) {
    this._pendingReplace = data
    window.location.replace(data.fullPath)
  }

  private onHashChange(event: HashChangeEvent) {
    if (this._pendingPush) {
      return super.pushHistory(this._pendingPush)
    }
    if (this._pendingReplace) {
      return super.replaceHistory(this._pendingReplace)
    }
    const { newURL, oldURL } = event
    console.log(this.currentNavigateData)
    console.log('hash变化了', newURL, oldURL)
  }

  /**
   * 确保路径是 hash 格式
   *
   * @private
   */
  private ensureHash() {
    const { pathname, search, hash } = window.location
    if (!pathname.startsWith(this.basePath)) {
      // 如果路径不是以 basePath 开头，直接重定向到 `/#/path`
      const path = `/#${pathname}${search}${hash}`
      return window.location.replace(path)
    }
  }
}
