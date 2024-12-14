import Router from './router.js'
import type { NavigateData } from './type.js'

export default class MemoryRouter extends Router {
  // 路由历史记录数组
  protected _history: NavigateData[] = [this.currentNavigateData]

  /**
   * @inheritDoc
   */
  public override go(delta: number = 1): boolean {
    const targetIndex = this._history.length - 1 + (delta || 0)

    // 如果目标索引在有效范围内
    if (targetIndex >= 0 && targetIndex < this._history.length) {
      this.completeNavigation(this._history[targetIndex])
      return true
    }

    return false
  }

  /**
   * 添加历史记录
   *
   *
   * @param data
   * @private
   */
  protected override pushHistory(data: NavigateData): void {
    this._history.push(data)
    this.completeNavigation()
  }

  /**
   * 替换历史记录
   *
   * @param {NavigateData} data - 目标路由
   * @private
   */
  protected replaceHistory(data: NavigateData): void {
    // 记录映射
    const index = this._history.indexOf(this.currentNavigateData)
    this._history[index] = data
    this.completeNavigation()
  }
}
