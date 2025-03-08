import RouterCore from './router-core.js'
import {
  NavigateStatus,
  type ReadonlyRouteLocation,
  type RouteLocation,
  type RouterOptions
} from './router-types.js'

/**
 * 基于内存实现的路由器
 *
 * 仅支持路由器操作前进、后退、跳转等操作
 *
 * > 注意：不要在浏览器端使用，因为浏览器端有原生的history对象，使用内存模式会和浏览器端的历史记录冲突，导致路由异常。
 */
export default class RouterMemory extends RouterCore {
  // 路由历史记录数组
  protected _history: ReadonlyRouteLocation[] = []
  // 标记是否有go方法触发的导航
  protected _pendingGo: number | null = null

  constructor(options: RouterOptions<'memory'>) {
    super(options)
    options.mode = 'memory'
  }

  /// 当前历史路由索引
  private _currentIndex: number = 0

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
    let newIndex: number
    if (this._pendingGo !== null) {
      this._history[this._pendingGo] = data
      newIndex = this._pendingGo
    } else if (isReplace) {
      // 替换当前路由
      this._history[this.currentIndex] = data
      newIndex = this.currentIndex
    } else {
      // push新路由
      const nextIndex = this.currentIndex + 1
      if (nextIndex < this._history.length) {
        // 清除后面的历史记录
        this._history[nextIndex] = data
        this._history.length = nextIndex + 1
        newIndex = nextIndex
      } else {
        // 添加新路由
        this._history.push(data)
        newIndex = this._history.length - 1
      }
    }
    this._currentIndex = newIndex
    this.completeNavigation()
    this._pendingGo = null
  }
}
