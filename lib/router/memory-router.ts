import Router from './router.js'
import { type RouteLocation, type RouterOptions } from './type.js'

/**
 * 基于内存实现的路由器
 *
 * 仅支持路由器操作前进、后退、跳转等操作
 */
export default class MemoryRouter extends Router {
  // 路由历史记录数组
  protected _history: RouteLocation[] = [this.currentRouteLocation]
  // 标记是否有go方法触发的导航
  private _pendingGo: RouteLocation | null = null

  constructor(options: RouterOptions) {
    super(options)
  }

  /**
   * @inheritDoc
   */
  public override go(delta: number = 1): void {
    const targetIndex = this._history.length - 1 + (delta || 0)
    // 如果目标索引在有效范围内
    if (targetIndex >= 0 && targetIndex < this._history.length) {
      const target = this._history[targetIndex]
      this._pendingGo = target
      this.navigate(target).then(() => {
        this._pendingGo = null
      })
    }
  }

  /**
   * 添加历史记录
   *
   *
   * @param data
   * @private
   */
  protected override pushHistory(data: RouteLocation): void {
    if (this._pendingGo) {
      this.completeNavigation(data)
    } else {
      this._history.push(data)
      this.completeNavigation()
    }
  }

  /**
   * 替换历史记录
   *
   * @param {RouteLocation} data - 目标路由
   * @private
   */
  protected replaceHistory(data: RouteLocation): void {
    // 记录映射
    const index = this._history.indexOf(this.currentRouteLocation)
    this._history[index] = data
    this.completeNavigation()
  }
}
