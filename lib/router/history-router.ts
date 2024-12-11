import { Router } from './router.js'
import type { RouterOptions, RouteTarget } from './type.js'

export default class HistoryRouter extends Router {
  private readonly history: History

  constructor(options: RouterOptions) {
    super(options)
    if (!window.history) throw new Error('[Vitarx.Router][ERROR]：当前浏览器不支持 history api')
    this.history = window.history
  }

  /**
   * 跳转历史记录
   *
   * 历史记录中要移动到的位置，相对于当前页面。
   *
   * 负值向后移动，正值向前移动。
   *
   * 因此，例如，`router.go(2)` 向前移动 2 页，
   * `router.go(-2)` 向后移动 2 页。
   *
   * 如果未传递任何值或 delta 等于 0，则其结果与调用 `location.reload()` 效果一至
   *
   * @param delta
   */
  go(delta?: number): void {
    this.history.go(delta)
  }

  /**
   * 后退到上一页
   *
   * 于go(-1)效果一致
   */
  back(): void {
    this.history.back()
  }

  /**
   * 前进到上一页
   */
  forward(): void {
    this.history.forward()
  }

  replace(path: RouteTarget): void {
    console.log(path)
  }

  push(path: RouteTarget): void {
    console.log(path)
  }

  protected initialize() {
    super.initialize()
    window.addEventListener('popstate', event => {
      console.log(event)
    })
  }
}
