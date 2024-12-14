import Router from './router.js'
import type { NavigateData, RouteTarget } from './type.js'
import { urlToRouteTarget } from './utils.js'

/**
 * 基于`window.history`实现的路由器
 *
 * 支持前进、后退、跳转等操作
 */
export default class HistoryRouter extends Router {
  /**
   * 当前路由目标
   *
   * @returns {RouteTarget} - 包含 index、hash 和 query 的对象
   */
  protected get currentRouteTarget(): MakeRequired<RouteTarget, 'query' | 'hash'> {
    return urlToRouteTarget(window.location, 'path', this.basePath)
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
   * @inheritDoc
   */
  public override go(delta?: number): boolean {
    this.webHistory.go(delta)
    return true
  }

  /**
   * @inheritDoc
   */
  protected override initializeRouter() {
    // 初始化时监听 popstate 事件，处理历史记录返回时的路由恢复
    window.addEventListener('popstate', this.onPopState.bind(this))
    // 替换路由
    this.replace(this.currentRouteTarget).then()
  }

  /**
   * @inheritDoc
   */
  protected pushHistory(data: NavigateData): void {
    this.webHistory.pushState(this.createState(data), '', data.fullPath)
    this.updateCurrentNavigateData(data)
  }

  /**
   * @inheritDoc
   */
  protected replaceHistory(data: NavigateData): void {
    this.webHistory.replaceState(this.createState(data), '', data.fullPath)
    this.updateCurrentNavigateData(data)
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
    if (event.state?.index) {
      const route = this.getRoute(event.state?.index)
      this.updateCurrentNavigateData({
        ...event.state,
        matched: route || null
      })
      return
    }
    const routeTarget = this.currentRouteTarget
    // 处理锚点变化
    if (routeTarget.index === this.currentNavigateData.path) {
      // 锚点或hash发生变化，替换状态
      window.history.replaceState(this.currentNavigateData, '', window.location.href.toString())
      // 调用状态改变方法 更新query查询参数，以及hash
    } else {
      console.log('路由地址变化', routeTarget, this.currentNavigateData)
      // path不一致 调用push方法完成路由跳转，通常不会执行到这里。
      this.push(routeTarget).then()
    }
  }
}
