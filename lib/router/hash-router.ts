import type { NavigateData, RouterOptions, RouteTarget } from './type.js'
import { urlToRouteTarget } from './utils.js'
import MemoryRouter from './memory-router.js'

/**
 * 基于`HashChangeEvent`事件实现的路由器
 *
 * 支持浏览器前进、后退、跳转等操作。
 *
 * > 注意：使用此模式的路由器，务必不要使用其他原生路由功能改变路由。
 * 例如 `window.history.pushState`、`window.history.replaceState`、`window.location.assign`，以及`a`标签默认跳转等。
 * 如果你使用这些原生路由功能进行路由跳转，而不是使用的`HashRouter`实例所提供的api可能会导致历史记录错乱，导航异常。
 */
export default class HashRouter extends MemoryRouter {
  private _paddingGo: NavigateData | null = null

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
  override go(delta: number = 1): void {
    const targetIndex = this._history.length - 1 + (delta || 0)
    if (targetIndex >= 0 && targetIndex < this._history.length) {
      const targetPath = this.fullPathToHash(this._history[targetIndex].fullPath)
      if (window.location.hash !== targetPath) {
        this._paddingGo = this._history[targetIndex]
        window.location.hash = targetPath
      } else {
        this.completeNavigation(this._history[targetIndex])
      }
    }
  }

  /**
   * @inheritDoc
   */
  protected override initializeRouter(): void {
    window.addEventListener('hashchange', this.onHashChange.bind(this))
    this.replace(this.currentRouteTarget).then()
  }

  /**
   * @inheritDoc
   */
  protected pushHistory(data: NavigateData): void {
    window.location.replace(data.fullPath)
  }

  /**
   * @inheritDoc
   */
  protected replaceHistory(data: NavigateData): void {
    window.location.hash = this.fullPathToHash(data.fullPath)
  }

  /**
   * 将完整的path转换为hash
   *
   * @param fullPath
   * @private
   */
  private fullPathToHash(fullPath: string): string {
    return fullPath.slice(this.basePath.length)
  }

  /**
   * 处理 hashchange 事件
   *
   * @param event
   * @private
   */
  private onHashChange(event: HashChangeEvent): void {
    // 完成上一次导航
    if (this.isPendingNavigation) {
      this._paddingGo = null // 清理 _paddingGo，避免并发状态引起重复的完成导航
      return this.completeNavigation()
    }
    // 完成go操作
    if (this._paddingGo) {
      this.completeNavigation(this._paddingGo)
      this._paddingGo = null
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
      this.push(newTarget).then()
      return
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
