import RouterCore from './router-core.js'
import {
  type HashStr,
  NavigateStatus,
  type ReadonlyRouteLocation,
  type RouteLocation,
  type RouterOptions,
  type RouteTarget
} from './router-types.js'
import { urlToRouteTarget } from './utils.js'

/**
 * 基于`window.history`实现的路由器
 *
 * 支持浏览器前进、后退、跳转等操作
 */
export default class RouterHistory extends RouterCore {
  constructor(options: RouterOptions<'path' | 'hash'>) {
    // 守卫mode类型
    if (!['path', 'hash'].includes(options.mode as string)) options.mode = 'hash'
    super(options)
    if (options.mode === 'hash') {
      this.ensureHash()
    }
  }

  /**
   * @inheritDoc
   */
  public override updateHash(hash: `#${string}` | '') {
    super.updateHash(hash)
    // 保存滚动位置
    this.saveCurrentScrollPosition()
    // 更新hash地址
    this.webHistory.pushState(
      this.createState(this.currentRouteLocation),
      '',
      this.currentRouteLocation.fullPath
    )
    if (!hash.trim()) {
      window.scrollTo(0, 0)
    } else {
      const anchorId = hash.startsWith('#') ? hash.slice(1) : hash
      const element = window.document.getElementById(anchorId)
      if (element) {
        element.scrollIntoView({ behavior: this.scrollBehavior })
      }
    }
  }

  /**
   * @inheritDoc
   */
  public override updateQuery(query: Record<string, string>) {
    super.updateQuery(query)
    this.webHistory.pushState(
      this.createState(this.currentRouteLocation),
      '',
      this.currentRouteLocation.fullPath
    )
  }

  /**
   * 当前路由目标
   *
   * @returns {RouteTarget} - 包含 index、hash 和 query 的对象
   */
  protected get currentRouteTarget(): MakeRequired<RouteTarget, 'query' | 'hash'> {
    return urlToRouteTarget(window.location, this.mode as 'hash' | 'path', this.basePath)
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
    this.replace(this.currentRouteTarget).then(res => {
      if (res.status !== NavigateStatus.success) {
        console.warn(`[VitarxRouter.initializeRouter]：路由初始化匹配失败，${res.message}`)
      }
    })
  }

  /**
   * @inheritDoc
   */
  protected pushHistory(data: RouteLocation): void {
    // 保存滚动位置
    this.saveCurrentScrollPosition()
    // 跳转到新路由
    this.webHistory.pushState(this.createState(data), '', data.fullPath)
    this.completeNavigation()
  }

  /**
   * @inheritDoc
   */
  protected replaceHistory(data: RouteLocation): void {
    // 还原滚动位置 this.webHistory.state 存在则是回退或前进所触发的替换状态
    const scrollPosition = this.webHistory.state?.scrollPosition
    this.webHistory.replaceState(this.createState(data), '', data.fullPath)
    this.completeNavigation(scrollPosition)
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
    data: ReadonlyRouteLocation,
    hash?: HashStr,
    query?: Record<string, string>
  ): Omit<ReadonlyRouteLocation, 'matched'> {
    const { matched, ...state } = data
    if (typeof hash === 'string') {
      state.hash = hash
    }
    if (typeof query === 'object') {
      state.query = query
    }
    return JSON.parse(JSON.stringify(state))
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
      // 如果被重定向则不处理
      if (res.redirectFrom) return
      if (this.mode === 'hash' && res.status !== NavigateStatus.success) {
        // 未匹配时，回退页面
        if (res.status === NavigateStatus.not_matched) {
          // 如果是hash模式，则兼容path模式的锚点跳转
          if (res.to.index.startsWith('/')) {
            const anchorId = res.to.index.slice(1)
            const element = window.document.getElementById(anchorId)
            if (element) {
              element.scrollIntoView({ behavior: this.scrollBehavior })
            }
            // 更新hash记录值
            this.updateHash(`#${anchorId}`)
          }
        } else if (res.status === NavigateStatus.duplicated) {
          this.webHistory.replaceState(
            this.createState(this.currentRouteLocation),
            '',
            this.currentRouteLocation.fullPath
          )
        }
      }
    })
  }

  /**
   * 确保路径是 hash 格式
   *
   * @private
   */
  private ensureHash() {
    const { pathname, search, hash } = window.location
    if (!hash) {
      const path = `${this.basePath}${search}#${pathname}`
      window.location.replace(path)
    }
  }
}
