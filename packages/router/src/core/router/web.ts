import { isString, logger } from 'vitarx'
import { NavState } from '../common/constant.js'
import { parseHashContent } from '../common/utils.js'
import { normalizePath, parseQuery } from '../shared/utils.js'
import type {
  NavTarget,
  RouteLocation,
  RoutePath,
  RouterOptions,
  ScrollPosition,
  ScrollTarget,
  URLHash,
  URLQuery
} from '../types/index.js'
import { Router } from './router.js'

interface HistoryState {
  path: RoutePath
  hash: URLHash | ''
  query: URLQuery
}
export class WebRouter extends Router {
  private readonly history = window.history
  constructor(options: RouterOptions) {
    super(options)
    // 初始化路由
    this.replace(this.urlToNavigateTarget()).then(res => {
      if (__VITARX_DEV__ && res.state !== NavState.success && res.state !== NavState.cancelled) {
        logger.error(`[Router] Initialization failed: ${res.message}`, res)
      }
    })
    // 初始化时监听 popstate 事件，处理历史记录返回时的路由恢复
    window.addEventListener('popstate', this.onPopState)
    if (this.config.mode === 'hash') {
      const { pathname, search, hash } = window.location
      if (!hash) {
        const path = `${this.config.base}${search}#${pathname}`
        window.location.replace(path)
      }
    }
    window.addEventListener('hashchange', this.onHashChange)
  }
  /**
   * @inheritDoc
   */
  public override go(delta: number): void {
    if (!delta) return
    this.history.go(delta)
  }
  /**
   * @inheritDoc
   */
  protected override pushHistory(to: RouteLocation): void {
    this.saveCurrentScrollPosition()
    // 跳转到新路由
    this.history.pushState(this.createState(to), '', to.href)
  }
  /**
   * @inheritDoc
   */
  protected override replaceHistory(to: RouteLocation): ScrollPosition | void {
    const scrollPosition = this.history.state?.scrollPosition
    this.history.replaceState(this.createState(to), '', to.href)
    return scrollPosition
  }
  /**
   * @inheritDoc
   */
  protected override hashUpdate(route: RouteLocation): void {
    // 保存滚动位置
    this.saveCurrentScrollPosition()
    // 更新hash地址
    this.history.pushState(this.createState(route), '', route.href)
    const hash = route.hash
    if (!hash) {
      window.scrollTo(0, 0)
    } else {
      this.scrollTo({ el: hash })
    }
  }
  /**
   * @inheritDoc
   */
  protected override scrollTo(target: ScrollTarget): void {
    try {
      if ('el' in target && target.el) {
        const { el, ...rest } = target
        if (isString(el)) {
          // 对选择器字符串进行转义
          const escapedSelector = el.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1')
          const element = document.querySelector(escapedSelector)
          if (element) {
            if (element.scrollIntoView) {
              element.scrollIntoView(rest)
            } else {
              window.scrollTo({
                top: element.getBoundingClientRect().top + window.scrollY,
                left: element.getBoundingClientRect().left + window.scrollX
              })
            }
          }
        }
      } else {
        window.scrollTo(target)
      }
    } catch (e) {
      logger.warn(
        `[Router] Failed to scroll to specified position, please check scroll target parameters: ${JSON.stringify(target)}`,
        e
      )
    }
  }
  /**
   * 将当前 URL 转换为 NavigateTarget 对象
   *
   * @returns {NavTarget} - 包含 to、hash 和 query 的对象
   */
  private urlToNavigateTarget(): NavTarget {
    const location = window.location
    const base = this.config.base
    const mode = this.config.mode

    // 1. 默认从 location 获取基础数据
    let path = decodeURIComponent(location.pathname) as RoutePath
    let query: URLQuery = {}
    let hash: URLHash | '' = ''

    // 2. 处理 Hash 模式
    if (mode === 'hash') {
      // 浏览器原生的 location.hash 包含了 # 符号，且已解码（部分浏览器可能行为不一，建议统一处理）
      // 此时 location.search 通常为空，但为了保险起见，我们主要关注 hash
      const rawHash = location.hash.slice(1) // 去掉前缀 #，得到 "/path?a=1#anchor" 或 "/path"

      if (rawHash) {
        // 核心逻辑：从 Hash 字符串中解析 path, query, hash
        const parsed = parseHashContent(rawHash)
        path = parsed.path
        query = parsed.query
        hash = parsed.hash
      } else {
        path = '/' // 如果 hash 为空，默认根路径
      }
    } else {
      // 3. 处理 History 模式
      // History 模式下，search 和 hash 是独立的
      query = parseQuery(location.search)

      // 处理 pathname，移除 base 前缀
      path = normalizePath(path.startsWith(base) ? path.slice(base.length) : path)

      // 处理锚点
      if (location.hash) {
        hash = decodeURIComponent(location.hash) as URLHash
      }
    }

    return { index: path, hash, query }
  }
  /**
   * 处理浏览器历史记录的返回/前进事件
   */
  private onPopState = (event: PopStateEvent): void => {
    let newTarget: NavTarget
    if (event.state?.path) {
      newTarget = {
        index: event.state.path,
        hash: event.state.hash,
        query: event.state.query
      }
    } else {
      newTarget = this.urlToNavigateTarget()
    }
    this.replace(newTarget).then()
  }
  /**
   * 处理 hashchange 事件
   *
   * 通常是绕过push/replace方法，直接修改url导致的触发hash变化事件
   *
   * @param _event
   */
  private onHashChange = (_event: HashChangeEvent): void => {
    this.replace(this.urlToNavigateTarget()).then()
  }
  /**
   * 保存当前页面滚动位置
   *
   * @private
   */
  private saveCurrentScrollPosition() {
    const scrollPosition: ScrollPosition = {
      left: window.scrollX,
      top: window.scrollY
    }
    this.history.replaceState(
      {
        ...window.history.state,
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
   * @param route - 路由
   * @private
   */
  private createState(route: RouteLocation): HistoryState {
    return {
      path: route.path,
      hash: route.hash,
      query: route.query
    }
  }
  public destroy() {
    super.destroy()
    window.removeEventListener('popstate', this.onPopState)
    window.removeEventListener('hashchange', this.onHashChange)
  }
}
