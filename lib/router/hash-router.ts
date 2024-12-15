import { type NavigateData, NavigateStatus, type RouterOptions, type RouteTarget } from './type.js'
import { urlToRouteTarget } from './utils.js'
import MemoryRouter from './memory-router.js'

/**
 * 基于`HashChangeEvent`事件实现的路由器
 *
 * 支持浏览器前进、后退、跳转等操作。
 *
 * > 注意：使用此模式的路由器，务必不要使用其他原生api改变路由。
 * 例如 `window.history.*`、`window.location.*`，以及`a`标签默认跳转等，可能会导致`go`方法导航异常，匹配不准确等问题。
 */
export default class HashRouter extends MemoryRouter {
  constructor(options: RouterOptions & { mode: 'hash' }) {
    super(options)
    this.ensureHash()
  }

  /**
   * 当前路由目标
   *
   * @returns {RouteTarget} - 包含 index、hash 和 query 的对象
   */
  protected get currentRouteTarget(): MakeRequired<RouteTarget, 'query' | 'hash'> {
    return urlToRouteTarget(window.location, 'hash', this.basePath)
  }

  /**
   * 获取当前浏览器地址栏中的完整路径
   *
   * @private
   */
  private get currentLocationFullPath(): string {
    return window.location.href.slice(window.location.origin.length)
  }

  /**
   * @inheritDoc
   */
  protected override initializeRouter(): void {
    window.addEventListener('hashchange', this.onHashChange.bind(this))
    const target = this.currentRouteTarget
    const fullPath = this.currentLocationFullPath
    this.replace(target).then(res => {
      // 兼容初始化时path没有变化的情况
      if (fullPath === res.to.fullPath) {
        super.replaceHistory(res.to)
      }
    })
  }

  /**
   * @inheritDoc
   */
  protected pushHistory(data: NavigateData): void {
    window.location.hash = this.fullPathToHash(data.fullPath)
  }

  /**
   * @inheritDoc
   */
  protected replaceHistory(data: NavigateData): void {
    window.location.replace(data.fullPath)
  }

  /**
   * 将完整的path转换为hash
   *
   * @param fullPath
   * @private
   */
  private fullPathToHash(fullPath: string): string {
    return fullPath.slice(this.basePath.length).replace(/^\//, '')
  }

  /**
   * 处理 hashchange 事件
   *
   * @param event
   * @private
   */
  private onHashChange(event: HashChangeEvent): void {
    // 兼容导航失败回滚造成的事件
    if (this.currentNavigateData.fullPath === this.currentLocationFullPath) return
    // 完成上一次导航
    if (this.isPendingNavigation) {
      if (this.pendingPushData) {
        return super.pushHistory(this.pendingPushData)
      }
      return super.replaceHistory(this.pendingReplaceData!)
    }
    // 新的路由目标
    const newTarget = urlToRouteTarget(new URL(event.newURL), 'hash', this.basePath)
    // 兼容未使用路由器方法切换路由的情况
    this.push(newTarget).then(res => {
      // 如果被取消，则不处理
      if (res.status === NavigateStatus.cancelled) return
      // 如果重复，则不处理
      if (res.status === NavigateStatus.duplicated) return
      // 路由匹配成功，且未被重定向则完成导航
      if (res.status === NavigateStatus.success) {
        // 如果被重定向则会触发新的`HashChangeEvent`事件,所以无需在此处理
        if (!res.isRedirect) this.completeNavigation(res.to)
        return
      }
      // 未匹配到路由时兼容`a`标签默认事件导致的锚点跳转
      if (res.status === NavigateStatus.not_matched) {
        if (res.to.index.startsWith('/')) {
          const anchorId = res.to.index.slice(1)
          const element = window.document.getElementById(anchorId)
          if (element) {
            element.scrollIntoView({ behavior: this.scrollBehavior })
          }
          // 更新hash记录值
          this.updateHash(`#${anchorId}`)
        }
      }
      window.location.replace(res.from.fullPath)
    })
  }

  /**
   * 确保路径是 hash 格式
   *
   * @private
   */
  private ensureHash() {
    const { pathname, search, hash } = window.location
    if (!pathname.startsWith(this.basePath)) {
      // 如果路径不是以 basePath 开头，直接重定向到 `/#/path`
      const path = `/#${pathname}${search}${hash}`
      return window.location.replace(path)
    }
  }
}
