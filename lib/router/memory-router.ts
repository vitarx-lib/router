import Router from './router.js'
import { createUniqueIdGenerator } from './utils.js'
import type { NavigateData } from './type.js'

export default class MemoryRouter extends Router {
  // 生成唯一id
  private uniqueId: () => string = createUniqueIdGenerator()
  // 路由历史唯一键映射
  private _historyMap = new Map<string, NavigateData>()
  // 当前路由
  private _currentNavigateId: string = ''

  /**
   * @inheritDoc
   */
  public override go(delta: number = 1): boolean {
    const targetIndex = this._historyMap.size - 1 + (delta || 0)

    // 如果目标索引在有效范围内
    if (targetIndex >= 0 && targetIndex < this._historyMap.size) {
      this._currentNavigateId = this._historyMap.keys().next(targetIndex).value!
      return true
    }

    return false
  }

  /**
   * @inheritDoc
   */
  public override back(): boolean {
    return this.go(-1) // 后退1步
  }

  /**
   * @inheritDoc
   */
  public override forward(): boolean {
    return this.go(1) // 前进1步
  }

  /**
   * @inheritDoc
   */
  protected initializeRouter() {
    const id = this.uniqueId()
    this._historyMap.set(id, this.currentNavigateData)
    this._currentNavigateId = id
  }

  /**
   * 添加历史记录
   *
   *
   * @param data
   * @private
   */
  protected override pushHistory(data: NavigateData): void {
    const id = this.uniqueId()
    this._historyMap.set(id, data)
    this._currentNavigateId = id
    this.updateCurrentNavigateData(data)
  }

  /**
   * 替换历史记录
   *
   * @param {NavigateData} data - 目标路由
   * @private
   */
  protected replaceHistory(data: NavigateData): void {
    // 记录映射
    this._historyMap.set(this._currentNavigateId, data)
    this.updateCurrentNavigateData(data)
  }
}
