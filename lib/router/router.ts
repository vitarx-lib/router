import type { Route, RouterOptions, RouteTarget } from './type.js'

/**
 * 路由器基类
 */
export abstract class Router {
  private readonly options: Required<RouterOptions>

  constructor(options: RouterOptions) {
    // 合并默认配置
    this.options = {
      base: '/',
      strict: false,
      ...options
    }

    // 初始化路由逻辑
    this.initialize()
  }

  /**
   * 路由跳转
   *
   * @param delta
   */
  abstract go(delta: number): void

  abstract back(): void

  abstract forward(): void

  abstract replace(path: RouteTarget): void

  abstract push(path: RouteTarget): void

  /**
   * 初始化路由器
   */
  protected initialize() {
    const { base, routes } = this.options

    // 设置基础路径
    this.setupBasePath(base)

    // 初始化路由表
    this.setupRoutes(routes)
  }

  /**
   * 设置基础路径
   *
   * @param base
   */
  protected setupBasePath(base: string) {
    if (!base) {
      this.options.base = '/' // 如果没有设置，则默认为 '/'
    } else {
      // 确保以 '/' 开头且不以 '/' 结尾，同时防止出现 '//' 的情况
      this.options.base = `/${base.replace(/^\/+|\/+$/g, '')}`
    }
  }

  /**
   * 初始化路由表
   *
   * @param routes
   */
  protected setupRoutes(routes: Route[]) {
    console.log(`Initializing routes:`, routes)
  }
}
