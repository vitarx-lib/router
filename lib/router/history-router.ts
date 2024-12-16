import Router from './router.js'
import {
  type HashStr,
  NavigateStatus,
  type RouteLocation,
  type RouterOptions,
  type RouteTarget
} from './type.js'
import { urlToRouteTarget } from './utils.js'

/**
 * 基于`window.history`实现的路由器
 *
 * 支持浏览器前进、后退、跳转等操作
 */
export default class HistoryRouter extends Router {
  constructor(options: RouterOptions & { mode: 'history' }) {
    super(options)
  }

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
  public override go(delta?: number): void {
    this.webHistory.go(delta)
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
  protected pushHistory(data: RouteLocation): void {
    // 保存滚动位置
    this.saveCurrentScrollPosition()
    // 跳转到新路由
    this.webHistory.pushState(this.createState(data), '', data.fullPath)
    this.completeNavigation(data)
  }

  /**
   * @inheritDoc
   */
  protected replaceHistory(data: RouteLocation): void {
    // 还原滚动位置 this.webHistory.state 存在则是回退或前进所触发的替换状态
    const scrollPosition = this.webHistory.state?.scrollPosition
    this.webHistory.replaceState(this.createState(data), '', data.fullPath)
    this.completeNavigation(data, scrollPosition)
  }

  /**
   * 保存当前页面滚动位置
   *
   * @private
   */
  private saveCurrentScrollPosition() {
    const scrollPosition: ScrollToOptions = {
      left: window.scrollX,
      top: window.scrollY,
      behavior: this.scrollBehavior
    }
    this.webHistory.replaceState(
      {
        ...this.webHistory.state,
        scrollPosition
      },
      '',
      window.location.href
    )
  }

  /**
   * 创建历史记录状态
   *
   * 用于在浏览器历史记录中存储路由信息，以支持前进、后退等操作。
   *
   * @param data - 路由数据
   * @param hash - 要替换的哈希值
   * @param query - 要替换的查询参数
   * @private
   */
  private createState(
    data: RouteLocation,
    hash?: HashStr,
    query?: Record<string, string>
  ): Omit<RouteLocation, 'matched'> {
    const { matched, ...state } = data
    if (typeof hash === 'string') {
      state.hash = hash
    }
    if (typeof query === 'object') {
      state.query = query
    }
    return state
  }

  /**
   * 处理浏览器历史记录的返回/前进事件
   */
  private onPopState(event: PopStateEvent) {
    let newTarget: RouteTarget
    if (event.state?.index) {
      newTarget = {
        index: event.state.index,
        hash: event.state.hash,
        query: event.state.query
      }
    } else {
      newTarget = this.currentRouteTarget
    }
    this.replace(newTarget).then(res => {
      // 如果被取消，则不处理
      if (res.status === NavigateStatus.cancelled) return
      // 如果重复，则不处理
      if (res.status === NavigateStatus.duplicated) return
      // 如果失败了，则回到之前的路由
      if (res.status !== NavigateStatus.success) {
        this.webHistory.replaceState(this.createState(res.from), '', res.from.fullPath)
      }
    })
  }
}
