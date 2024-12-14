import Router from './router.js'
import { createUniqueIdGenerator } from './utils.js'
import type { NavigateData, RouterOptions } from './type.js'

export default class MemoryRouter extends Router {
  // 生成唯一id
  private uniqueId: () => string = createUniqueIdGenerator()
  // 路由历史唯一键映射
  private _historyMap = new Map<string, NavigateData>()
  // 当前路由
  private _currentNavigateId: string = ''

  constructor(options: RouterOptions) {
    super(options)
    this.setupDefaultRoute()
  }

  /**
   * @inheritDoc
   */
  override get currentNavigateData() {
    return this._historyMap.get(this._currentNavigateId)!
  }

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
  }

  /**
   * 初始化设置当前路由
   *
   * @protected
   */
  private setupDefaultRoute() {
    const id = this.uniqueId()
    const data: NavigateData = {
      index: this.basePath,
      fullPath: this.basePath,
      path: this.basePath,
      hash: '',
      params: {},
      query: {},
      matched: null
    }
    this._historyMap.set(id, data)
    this._currentNavigateId = id
  }
}
