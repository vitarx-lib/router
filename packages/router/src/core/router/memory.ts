import type { RouteLocation } from '../types/index.js'
import { Router } from './router.js'

/**
 * 基于内存实现的路由器
 *
 * 仅支持路由器操作前进、后退、跳转等操作
 *
 * > 注意：不要在浏览器端使用，因为浏览器端有原生的history对象，使用内存模式会和浏览器端的历史记录冲突，导致路由异常。
 */
export class MemoryRouter extends Router {
  // 路由历史记录数组
  protected _history: RouteLocation[] = []
  // 标记是否有go方法触发的导航
  protected _pendingGo: number | null = null

  /// 当前历史路由索引
  private _currentIndex: number = -1

  /**
   * 当前历史路由索引
   *
   * @protected
   */
  protected get currentIndex(): number {
    return this._currentIndex
  }

  /**
   * @inheritDoc
   */
  public override go(delta: number): void {
    if (!delta) return
    const currentIndex = this.currentIndex
    const targetIndex = Math.max(0, Math.min(this._history.length - 1, this.currentIndex + delta)) // 限制在合法范围内
    if (targetIndex === currentIndex) return // 如果目标索引和当前索引相同，则无需导航

    const target = this._history[targetIndex]
    this._pendingGo = targetIndex
    this.navigate({
      to: target.path,
      query: target.query,
      hash: target.hash
    }).finally(() => {
      this._pendingGo = null
    })
  }

  /**
   * 添加历史记录
   */
  protected override pushHistory(to: RouteLocation): void {
    this._updateHistory(to, false)
  }

  /**
   * 替换历史记录
   */
  protected override replaceHistory(to: RouteLocation): void {
    this._updateHistory(to, true)
  }

  /**
   * 更新历史记录
   *
   * @param to - 目标路由
   * @param {boolean} isReplace - 是否为替换操作
   * @private
   */
  private _updateHistory(to: RouteLocation, isReplace: boolean): void {
    let newIndex: number
    if (this._pendingGo !== null) {
      newIndex = this._pendingGo
    } else if (isReplace) {
      newIndex = this.currentIndex === -1 ? 0 : this.currentIndex
    } else {
      const nextIndex = this.currentIndex + 1
      // 如果下一个索引小于历史记录长度，则清除后面的历史记录
      if (nextIndex < this._history.length) {
        // 清除后面的历史记录
        this._history.length = nextIndex + 1
        newIndex = nextIndex
      } else {
        // 添加新路由
        newIndex = this._history.length
      }
    }
    this._history[newIndex] = to
    this._currentIndex = newIndex
    this._pendingGo = null
  }
  public override destroy(): void {
    super.destroy()
    this._history = []
    this._currentIndex = -1
    this._pendingGo = null
  }
}
