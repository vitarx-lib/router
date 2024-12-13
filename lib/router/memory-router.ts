import Router from './router.js'
import { createUniqueIdGenerator, formatPath } from './utils.js'
import type { RouteData, RouterOptions } from './type.js'

export default class MemoryRouter extends Router {
  // 生成唯一id
  private uniqueId: () => string = createUniqueIdGenerator()
  // 路由历史唯一键映射
  private _historyMap = new Map<string, RouteData>()
  // 当前路由
  private _currentRouteId: string = ''

  constructor(options: RouterOptions) {
    super(options)
    this.setupDefaultRoute()
  }

  /**
   * @inheritDoc
   */
  override get currentRoute() {
    return this._historyMap.get(this._currentRouteId)!
  }

  /**
   * @inheritDoc
   */
  public override go(delta: number = 1): boolean {
    const targetIndex = this._historyMap.size - 1 + (delta || 0)

    // 如果目标索引在有效范围内
    if (targetIndex >= 0 && targetIndex < this._historyMap.size) {
      this._currentRouteId = this._historyMap.keys().next(targetIndex).value!
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
   * 创建完整路径
   *
   * @protected
   * @param path - 路径
   * @param query - ?查询参数
   * @param hash - #哈希值
   */
  protected override makeHref(path: string, query: string, hash: string): `${string}` {
    return formatPath(`${this.basePath}${path}${query}${hash}`)
  }

  /**
   * 添加历史记录
   *
   *
   * @param data
   * @private
   */
  protected override pushHistory(data: RouteData): void {
    const id = this.uniqueId()
    this._historyMap.set(id, data)
    this._currentRouteId = id
  }

  /**
   * 替换历史记录
   *
   * @param {RouteData} data - 目标路由
   * @private
   */
  protected replaceHistory(data: RouteData): void {
    // 记录映射
    this._historyMap.set(this._currentRouteId, data)
  }

  /**
   * 初始化设置当前路由
   *
   * @protected
   */
  private setupDefaultRoute() {
    const data = {
      id: this.uniqueId(),
      index: this.basePath,
      fullPath: this.basePath,
      hash: '',
      href: this.basePath,
      params: {},
      query: {},
      matched: null
    }
    this._historyMap.set(data.id, data)
    this._currentRouteId = data.id
  }
}
