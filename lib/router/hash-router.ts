import type { NavigateData, RouterOptions, RouteTarget } from './type.js'
import { urlToRouteTarget } from './utils.js'
import MemoryRouter from './memory-router.js'

export default class HashRouter extends MemoryRouter {
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
    window.location.replace(data.fullPath)
  }

  /**
   * @inheritDoc
   */
  protected replaceHistory(data: NavigateData) {
    window.location.replace(data.fullPath)
  }

  /**
   * 处理 hashchange 事件
   *
   * @param event
   * @private
   */
  private onHashChange(event: HashChangeEvent) {
    // 替换完成
    if (this.isPendingNavigation) {
      this.completeNavigation()
      return
    }
    // 新的url
    const { newURL } = event
    // 当前导航数据
    const current = this.currentNavigateData
    // 新的路由目标
    const newTarget = urlToRouteTarget(new URL(newURL), 'hash', this.basePath)
    // 路径改变
    if (newTarget.index !== current.path) {
      return this.push(newTarget)
    }
    // hash 改变
    if (newTarget.hash !== current.hash) {
      return this.updateHash(newTarget.hash)
    }
    // query 改变
    if (newTarget.query !== current.query) {
      return this.updateQuery(newTarget.query)
    }
    console.error(
      `[Vitarx.HashRouter.onHashChange][ERROR]：未能处理HashChangeEvent事件新newURL:${newURL},oldURL:${event.oldURL}`
    )
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
