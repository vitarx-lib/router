// noinspection JSUnusedGlobalSymbols

import type { DynamicRouteRecord, Route, RouteGroup, RouterOptions, RouteTarget } from './type.js'
import {
  createDynamicPattern,
  formatPath,
  isOptionalVariablePath,
  isRouteGroup,
  isVariablePath
} from './utils.js'

/**
 * 路由器基类
 */
export abstract class Router {
  // 配置
  private readonly options: Required<RouterOptions>
  // 命名路由映射
  private readonly namedRoutes = new Map<string, Route>()
  // 动态路由正则，按长度分组
  private readonly dynamicRoutes = new Map<number, DynamicRouteRecord[]>()
  // 路由path映射
  private readonly pathRoutes = new Map<string, Route>()
  // 父路由映射
  private readonly parentRoute = new WeakMap<Route, RouteGroup>()

  protected constructor(options: RouterOptions) {
    this.options = {
      base: '/',
      strict: false,
      ...options
    }
    this.initialize()
  }

  /**
   * 获取所有路由映射
   *
   * map键值是path，值是路由对象
   *
   * @return {Map<string, Route>}
   */
  get routeMaps(): ReadonlyMap<string, Route> {
    return this.pathRoutes
  }

  /**
   * 获取所有命名路由映射
   *
   * map键值是name，值是路由对象
   *
   * @return {Map<string, Route>}
   */
  get namedRouteMaps(): ReadonlyMap<string, Route> {
    return this.namedRoutes
  }

  /**
   * 获取路由表
   *
   * 它始终指向的是初始化时传入的路由表，但它的数据可能有被修改，例如调用了`removeRoute`或`addRoute`方法。
   *
   * 值得注意的是，所有嵌套`Route`的path都会被补全为完整的路径。
   *
   * @return {Route[]}
   */
  get routes(): ReadonlyArray<Route> {
    return this.options.routes
  }

  abstract go(delta: number): void

  abstract back(): void

  abstract forward(): void

  abstract replace(path: RouteTarget): void

  abstract push(path: RouteTarget): void

  /**
   * 删除路由
   *
   * @param {string} index 路由索引，如果/开头则匹配path，其他匹配name
   * @param {boolean} isRemoveFromRoutes 是否从路由表中移除，内部递归时传递的参数，无需外部传入！
   */
  public removeRoute(index: string, isRemoveFromRoutes: boolean = true): void {
    const deleteRoute = this.getRoute(index)

    if (!deleteRoute) return

    // 如果有子路由，则递归删除
    if (isRouteGroup(deleteRoute)) {
      for (const child of deleteRoute.children) {
        this.removeRoute(child.path, false)
      }
    }

    // 删除通用映射关系
    this.pathRoutes.delete(deleteRoute.path)
    if (deleteRoute.name) {
      this.namedRoutes.delete(deleteRoute.name)
    }

    // 删除动态路由
    this.removeDynamicRoute(deleteRoute.path)

    // 从路由表中移除
    if (isRemoveFromRoutes) this.removedFromRoutes(deleteRoute)
  }

  /**
   * 添加路由
   *
   * @param {Route} route - 路由描述对象
   * @param {string} parent - 父路由的path或name，不传入则添加至路由表根节点
   */
  public addRoute(route: Route, parent?: string) {
    if (parent) {
      const parentRoute = this.getRoute(parent)
      if (!parentRoute) throw new Error(`[Vitarx.Router.addRoute][ERROR]：父路由${parent}不存在`)
      parentRoute.children = parentRoute.children || []
      this.registerRoute(route, parentRoute as RouteGroup)
    } else {
      this.registerRoute(route)
      this.options.routes.push(route)
    }
  }

  /**
   * 获取路由
   *
   * @param {string} index - 路由索引，如果/开头则匹配path，其他匹配name
   */
  public getRoute(index: string): Route | undefined {
    return index.startsWith('/') ? this.pathRoutes.get(index) : this.namedRoutes.get(index)
  }

  /**
   * 获取路由的父路由
   *
   * @param route - 路由对象
   * @return {RouteGroup | undefined}
   */
  public getParentRoute(route: Route): RouteGroup | undefined {
    return this.parentRoute.get(route)
  }

  /**
   * 路由匹配
   *
   *
   * @param {string} path - 路径
   */
  public matchRoute(path: string): {
    route: Route
    params: Record<string, string | undefined> | null
  } | null {
    // 转换为小写
    if (!this.options.strict) {
      path = path.toLowerCase()
    }
    // 格式化path
    path = formatPath(path)

    // 优先匹配静态路由
    if (this.pathRoutes.has(path)) {
      return { route: this.pathRoutes.get(path)!, params: null }
    }

    // 动态路由匹配
    const segments = path.split('/').filter(Boolean)
    // 路径段长度
    const length = segments.length
    // 动态路由列表
    const candidates = this.dynamicRoutes.get(length) || []
    // 添加尾部斜杠 兼容可选参数 路径匹配
    path = `${path}/`
    // 遍历动态路由
    for (const { regex, route } of candidates) {
      const match = regex.exec(path)
      if (match) {
        const params: Record<string, string> = {}

        // 提取动态参数
        const keys = Object.keys(route.pattern!)
        keys.forEach((key, index) => {
          params[key] = match[index + 1] // +1 因为匹配结果的第一个元素是完整匹配
        })
        return { route, params }
      }
    }

    return null
  }

  /**
   * 从源路由表中删除路由
   *
   * @param route
   * @protected
   */
  protected removedFromRoutes(route: Route) {
    const parent = this.getParentRoute(route)
    if (parent?.children) {
      const index = parent.children.indexOf(route)
      if (index !== -1) {
        parent.children.splice(index, 1)
      }
    } else {
      const index = this.options.routes.indexOf(route)
      if (index !== -1) {
        this.options.routes.splice(index, 1)
      }
    }
  }

  /**
   * 删除动态路由映射
   *
   * @param path
   * @protected
   */
  protected removeDynamicRoute(path: string): void {
    if (!isVariablePath(path)) return

    const segments = path.split('/').filter(Boolean)
    const length = segments.length

    /**
     * 根据动态路径长度删除匹配的记录
     *
     * @param key 动态路径的长度
     */
    const removeRouteFromRecords = (key: number) => {
      const records = this.dynamicRoutes.get(key)
      if (records) {
        for (let i = 0; i < records.length; i++) {
          if (records[i].route.path === path) {
            records.splice(i, 1) // 删除匹配的记录
            break // 找到后立即停止循环
          }
        }
      }
    }

    // 删除匹配路径的动态路由
    removeRouteFromRecords(length)

    // 如果是可选参数路由，删除对应短路径的路由
    if (isOptionalVariablePath(path)) {
      removeRouteFromRecords(length - 1)
    }
  }

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
    this.options.base = `/${base.replace(/^\/+|\/+$/g, '')}`
  }

  /**
   * 初始化路由表
   *
   * @param routes
   */
  protected setupRoutes(routes: Route[]) {
    for (const route of routes) {
      this.registerRoute(route)
    }
  }

  /**
   * 注册路由
   *
   * @param {Route} route - 路由对象
   * @param {RouteGroup} group - 路由所在的分组
   * @protected
   */
  protected registerRoute(route: Route, group?: RouteGroup) {
    // 规范化路由路径，去除空格
    route.path = formatPath(route.path)
    if (group) {
      // 处理路径拼接，避免多余的斜杠
      route.path = `${group.path}/${route.path}`.replace(/\/+/g, '/').replace(/\/$/, '')
      this.parentRoute.set(route, group) // 记录当前路由于父路由的映射关系
    }

    if (isRouteGroup(route)) {
      // 如果是路由组并且有 widget，则将分组自身作为路由记录
      if (route.widget) {
        this.recordRoute(route) // 记录分组路由
      }

      // 遍历子路由并递归注册
      for (const child of route.children) {
        this.registerRoute(child, route) // 递归注册子路由
      }
    } else {
      // 普通路由注册
      this.recordRoute(route)
    }
  }

  /**
   * 记录路由
   *
   * @param {Route} route - 路由对象
   * @protected
   */
  protected recordRoute(route: Route) {
    if (route.name) {
      if (route.name.startsWith('/')) {
        route.name = route.name.replace(/^\//, '')
        console.warn(
          `[Vitarx.Router][WARN]：命名路由(name)不要以/开头: ${route.name}，因为内部需要使用/区分path、name`
        )
      }

      if (this.namedRoutes.has(route.name)) {
        throw new Error(`[Vitarx.Router][ERROR]：检测到重复的路由名称(name): ${route.name}`)
      }

      // 添加命名路由
      this.namedRoutes.set(route.name, route)
    }

    const path = this.options.strict ? route.path : route.path.toLowerCase()

    if (this.pathRoutes.has(path)) {
      throw new Error(`[Vitarx.Router][ERROR]：检测到重复的路由路径(path): ${route.path}`)
    }

    // 添加路由path映射
    this.pathRoutes.set(path, route)
    console.log(isVariablePath(route.path), route.path)
    // 添加动态路由
    if (isVariablePath(route.path)) {
      this.recordDynamicRoute(route)
    }
  }

  /**
   * 添加动态路由
   * @param route
   */
  private recordDynamicRoute(route: Route) {
    route.pattern = route.pattern || {}
    const { regex, length, isOptional } = createDynamicPattern(
      route.path,
      route.pattern,
      this.options.strict
    )
    const addToLengthMap = (len: number) => {
      if (!this.dynamicRoutes.has(len)) {
        this.dynamicRoutes.set(len, [])
      }
      this.dynamicRoutes.get(len)!.push({ regex, route })
    }
    addToLengthMap(length)
    if (isOptional) addToLengthMap(length - 1)
  }
}
