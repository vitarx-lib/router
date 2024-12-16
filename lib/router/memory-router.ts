import Router from './router.js'
import { NavigateStatus, type RouteLocation, type RouterOptions } from './type.js'

/**
 * 基于内存实现的路由器
 *
 * 仅支持路由器操作前进、后退、跳转等操作
 */
export default class MemoryRouter extends Router {
  // 路由历史记录数组
  protected _history: RouteLocation[] = []
  // 标记是否有go方法触发的导航
  protected _pendingGo: number | null = null

  constructor(options: RouterOptions) {
    super(options)
  }

  /**
   * 当前历史路由索引
   *
   * @protected
   */
  protected get currentIndex(): number {
    return this._history.indexOf(this.currentRouteLocation)
  }

  /**
   * @inheritDoc
   */
  public override go(delta?: number): void {
    if (!delta) return
    const currentIndex = this.currentIndex
    const targetIndex = Math.max(0, Math.min(this._history.length - 1, currentIndex + delta)) // 限制在合法范围内
    if (targetIndex === currentIndex) return // 如果目标索引和当前索引相同，则无需导航

    const target = this._history[targetIndex]
    this._pendingGo = targetIndex
    this.navigate(target).then(res => {
      if (res.status !== NavigateStatus.success) {
        this._pendingGo = null
      }
    })
  }

  /**
   * @inheritDoc
   */
  protected initializeRouter() {
    this._history.push(this.currentRouteLocation)
  }

  /**
   * 添加历史记录
   */
  protected override pushHistory(data: RouteLocation): void {
    this._updateHistory(data, false)
  }

  /**
   * 替换历史记录
   */
  protected replaceHistory(data: RouteLocation): void {
    this._updateHistory(data, true)
  }

  /**
   * 更新历史记录
   *
   * @param {RouteLocation} data - 目标路由
   * @param {boolean} isReplace - 是否为替换操作
   * @private
   */
  private _updateHistory(data: RouteLocation, isReplace: boolean): void {
    if (this._pendingGo !== null) {
      this._history[this._pendingGo] = data
    } else if (isReplace) {
      const index = this.currentIndex
      this._history[index] = data
    } else {
      const nextIndex = this.currentIndex + 1
      if (nextIndex < this._history.length) {
        this._history[nextIndex] = data
        this._history.length = nextIndex + 1
      } else {
        this._history.push(data)
      }
    }
    this.completeNavigation(data)
    this._pendingGo = null
  }
}
