import { isArray, isFunction, isString, logger, markRaw } from 'vitarx'
import { resolveComponent, resolvePattern, resolveProps } from '../common/resolve.js'
import { normalizePath } from '../common/shared.js'
import { isPathIndex } from '../common/utils.js'
import { isVariablePath, mergePathVariable, optionalVariableCount } from '../common/variable.js'
import type {
  DynamicRouteRecord,
  Route,
  RouteIndex,
  RouteName,
  RoutePath,
  RouteRecord,
  URLParams
} from '../types/index.js'

export interface RouteManagerOptions {
  /**
   * 路径动态参数匹配模式
   *
   * @default /[^/]+/
   */
  pattern?: RegExp
  /**
   * 是否启用严格模式
   *
   * 启用后路径匹配将严格匹配，即路径末尾的斜杠会被视为重要字符
   *
   * @default false
   */
  strict?: boolean
  /**
   * 是否忽略大小写
   *
   * @default false
   */
  ignoreCase?: boolean
  /**
   * 是否启用索引回退匹配。
   *
   * 开启后，当访问深层路径（如 /user/index）未匹配时，
   * 会尝试移除最后一段路径（/user）再次进行匹配。
   * 匹配成功则渲染组件，且保持 URL 不变。
   *
   * 仅支持匹配静态路径，不做动态路径匹配！
   *
   * @default false
   */
  fallbackIndex?: boolean
}

/**
 * 路由匹配结果
 */
export interface RouteMatchResult {
  path: RoutePath
  route: RouteRecord
  params: URLParams
}

/**
 * 路由线路管理器类，用于管理和维护应用程序的路由系统。
 *
 * 核心功能：
 * - 路由注册与注销：支持静态路由和动态路由的添加、删除操作
 * - 路由查找：提供按路径、名称或自动识别方式查找路由
 * - 路由匹配：支持路径匹配和命名路由匹配（带参数校验）
 * - 路由解析：将原始路由配置转换为规范化的路由记录
 *
 * @example
 * ```typescript
 * // 创建路由注册表
 * const registry = new RouteManager([
 *   { path: '/', component: Home },
 *   { path: '/users/:id', name: 'user', component: User }
 * ])
 *
 * // 查找路由
 * const route = registry.find('/users/123')
 *
 * // 匹配路由
 * const result = registry.match('/users/123')
 * // result: { route: RouteRecord, params: { id: '123' } }
 *
 * // 添加新路由
 * registry.addRoute({ path: '/posts', component: Posts })
 * ```
 *
 * @param routes - 原始路由配置数组
 * @param options - 路由解析器配置选项，包含：
 *   - pattern: 路径参数匹配的正则表达式（默认: /[^/]+/）
 *   - ignoreCase: 是否忽略路径大小写（默认: false）
 *   - strict: 是否严格匹配末尾斜杠（默认: false）
 *
 * @throws {Error} 当检测到重复的路由名称或路径时会抛出错误
 * @throws {Error} 当路由配置无效时会抛出错误
 */
export class RouteManager {
  /**
   * 解析器配置选项
   */
  public readonly config: Required<RouteManagerOptions>

  /**
   * 路由记录数组
   *
   * 警告：⚠️ 请勿直接操作routes，以免造成路由状态不一致。
   */
  public readonly routes: Set<RouteRecord> = new Set()

  /**
   * 路径 -> 路由 映射（静态路由）
   *
   * 警告：⚠️ 请勿直接操作staticRoutes，以免造成路由状态不一致。
   */
  public readonly staticRoutes = new Map<string, RouteRecord>()

  /**
   * 名称 -> 路由 映射（命名路由）
   *
   * 警告：⚠️ 请勿直接操作namedRoutes，以免造成路由状态不一致。
   */
  public readonly namedRoutes = new Map<RouteName, RouteRecord>()

  /**
   * 动态路由映射（按路径段长度分组）
   *
   * 警告：⚠️ 请勿直接操作dynamicRoutes，以免造成路由状态不一致。
   */
  public readonly dynamicRoutes = new Map<number, DynamicRouteRecord[]>()

  /**
   * 构造函数
   *
   * @param routes 原始路由配置数组
   * @param options 解析选项（可选）
   */
  constructor(routes: Route[], options?: RouteManagerOptions) {
    this.config = Object.freeze({
      pattern: /[^/]+/,
      ignoreCase: false,
      strict: false,
      fallbackIndex: false,
      ...options
    })
    this.parseRoutes(routes)
  }

  /**
   * 根据路径查找路由
   *
   * @param path - 路由路径，不支持动态匹配！
   * @returns 路由记录对象，如果未找到则返回 undefined
   */
  public findByPath(path: RoutePath): RouteRecord | null {
    const normalizedPath = this.config.ignoreCase ? (path.toLowerCase() as RoutePath) : path
    return this.staticRoutes.get(normalizedPath) ?? null
  }

  /**
   * 根据名称查找路由
   *
   * @param name - 路由名称
   * @returns 路由记录对象，如果未找到则返回 undefined
   */
  public findByName(name: RouteName): RouteRecord | null {
    return this.namedRoutes.get(name) ?? null
  }
  /**
   * 统一查找路由方法
   *
   * 根据目标字符串自动判断查找方式：
   * - 以 `/` 开头：按路径查找，不支持动态匹配！
   * - 否则：按名称查找
   *
   * @param target - 路由目标（路径或名称）
   * @returns 路由记录对象，如果未找到则返回 undefined
   */
  public find(target: RouteIndex): RouteRecord | null {
    if (isString(target) && target.startsWith('/')) {
      return this.findByPath(target as RoutePath)
    }
    return this.findByName(target)
  }

  /**
   * 根据路径匹配路由
   *
   * 匹配流程：
   * 1. 优先匹配静态路由 Map (O(1))
   * 2. 根据路径段长度查找动态路由 Map，进行正则匹配
   *
   * @param path - 请求路径
   * @returns 匹配结果对象，包含路由记录和解析后的参数；未匹配返回 null
   */
  public matchByPath(path: RoutePath): RouteMatchResult | null {
    if (this.config.strict && path.endsWith('/') && path !== '/') {
      return null
    }
    // 1. 标准化路径
    const formattedPath = normalizePath(path)
    const lookupPath = this.config.ignoreCase
      ? (formattedPath.toLowerCase() as RoutePath)
      : formattedPath

    // 2. 静态路由精确匹配
    const staticRoute = this.staticRoutes.get(lookupPath)
    if (staticRoute) {
      return { path: formattedPath, route: staticRoute, params: {} }
    }

    // 3. 动态路由匹配
    const segments = formattedPath.split('/').filter(Boolean)
    const length = segments.length
    const candidates = this.dynamicRoutes.get(length)

    if (candidates) {
      for (const { regex, route } of candidates) {
        // 执行正则匹配
        const match = regex.exec(formattedPath)
        if (match) {
          const params: Record<string, string> = {}
          // 解析捕获组参数
          if (route.pattern) {
            for (let i = 0; i < route.pattern.length; i++) {
              const paramDef = route.pattern[i]
              const value = match[i + 1]
              // 仅当捕获到值时写入 params
              if (value !== undefined) {
                params[paramDef.name] = value
              }
            }
          }
          return { path: formattedPath, route, params }
        }
      }
    }
    if (formattedPath.endsWith('/index') && this.config.fallbackIndex) {
      const shortPath = formattedPath.slice(0, -6)
      const staticRoute = this.staticRoutes.get(shortPath || '/')
      if (staticRoute) {
        return { path: formattedPath, route: staticRoute, params: {} }
      }
    }
    return null
  }
  /**
   * 根据名称匹配路由并校验参数
   *
   * @param name - 路由名称
   * @param params - 传入的路由参数对象
   * @returns 匹配结果对象；若路由不存在或参数校验失败返回 null
   */
  public matchByName(
    name: RouteName,
    params: Record<string, string | number> = {}
  ): RouteMatchResult | null {
    // 1. 查找命名路由
    const route = this.namedRoutes.get(name)
    if (!route) return null

    // 2. 处理静态命名路由 (无参数)
    if (!route.pattern || route.pattern.length === 0) {
      // 如果传入了参数但路由不需要，通常可以忽略或警告，这里选择直接成功
      return { path: route.path, route, params: {} }
    }

    // 3. 动态路由：参数校验与序列化
    const resolvedParams: Record<string, string> = {}

    for (const paramDef of route.pattern) {
      const value = params[paramDef.name]
      const rawValue = String(value ?? '') // 统一转字符串处理

      // 3.1 必填参数校验
      if (!paramDef.optional && (value === undefined || value === '')) {
        if (__VITARX_DEV__) {
          logger.warn(
            `[Router] Missing required parameter "${paramDef.name}" for route "${String(name)}"`
          )
        }
        return null // 缺失必填参数，匹配失败
      }

      // 3.2 格式正则校验 (核心功能)
      // 即使是可选参数，如果有值，也必须符合格式
      if (rawValue !== '' && !paramDef.regex.test(rawValue)) {
        if (__VITARX_DEV__) {
          logger.warn(
            `[Router] Parameter "${paramDef.name}" with value "${rawValue}" does not match pattern ${paramDef.regex} for route "${String(name)}"`
          )
        }
        return null // 格式不匹配，匹配失败
      }

      // 3.3 写入解析后的参数
      // 如果是可选参数且值为空，不放入 params 对象，保持整洁
      if (rawValue !== '') {
        resolvedParams[paramDef.name] = rawValue
      }
    }

    return { path: mergePathVariable(route.path, resolvedParams), route, params: resolvedParams }
  }
  /**
   * 统一匹配路由方法
   *
   * 根据目标字符串自动判断匹配方式：
   * - 以 `/` 开头：按路径匹配
   * - 否则：按名称匹配
   *
   * @param index - 路由目标（路径或名称）
   * @param params - 传入的路由参数对象（可选）
   * @returns 匹配结果对象，包含路由记录和解析后的参数；未匹配返回 null
   */
  public match(
    index: RouteIndex,
    params?: Record<string, string | number>
  ): RouteMatchResult | null {
    if (isPathIndex(index)) {
      return this.matchByPath(index as RoutePath)
    }
    return this.matchByName(index, params)
  }

  /**
   * 添加路由
   *
   * @param {Object} route 路由对象
   * @param {RouteIndex} [parent] 父路由索引，可以是path/name
   * @returns {void}
   * @throws {Error} 当传入的父路由不存在时会抛出错误
   */
  public addRoute(route: Route, parent?: RouteIndex): void {
    let routeRecord: RouteRecord
    if (parent) {
      const parentRoute = this.find(parent)
      if (!parentRoute)
        throw new Error(`[Router] Parent route "${String(parent)}" not found in addRoute()`)
      routeRecord = this.parseRoute(route, parentRoute)
    } else {
      routeRecord = this.parseRoute(route)
    }
    this.registerRoute(routeRecord)
  }
  /**
   * 删除路由
   *
   * @param {string} index - path或name
   * @returns {void}
   */
  public removeRoute(index: RouteIndex): boolean {
    const route = this.find(index)
    if (!route) return false
    this.routes.delete(route)
    this.staticRoutes.delete(route.path)
    if (route.name) this.namedRoutes.delete(route.name)
    this.removeDynamicRoute(route)
    return true
  }
  /**
   * 清空所有路由映射
   *
   * 此方法会清空所有路由映射，包括静态路由、命名路由和动态路由映射。
   *
   * 谨慎使用此方法，清空所有路由映射将导致所有路由信息丢失。
   *
   * @returns {void}
   */
  public clearRoutes(): void {
    this.routes.clear()
    this.staticRoutes.clear()
    this.namedRoutes.clear()
    this.dynamicRoutes.clear()
  }
  /**
   * 删除动态路由映射
   */
  private removeDynamicRoute(route: RouteRecord): void {
    if (!route.fullPattern) return
    const path = route.path
    const segments = path.split('/').filter(Boolean)
    const length = segments.length

    const removeRouteFromRecords = (key: number) => {
      const records = this.dynamicRoutes.get(key)
      if (records) {
        for (let i = 0; i < records.length; i++) {
          if (records[i].route === route) {
            records.splice(i, 1)
            break
          }
        }
      }
    }

    removeRouteFromRecords(length)
    const count = optionalVariableCount(path)
    if (count > 0) {
      for (let i = 1; i <= count; i++) {
        removeRouteFromRecords(length - i)
      }
    }
  }
  /**
   * 解析路由配置数组，将每个路由规范化并注册到路由系统中
   * @param routes - 路由配置数组，包含路由及其子路由信息
   * @param [parent] - 父级路由记录（可选）
   */
  private parseRoutes(routes: Route[], parent?: RouteRecord): void {
    // 遍历路由配置数组
    for (const route of routes) {
      // 规范化当前路由配置，生成路由记录
      const routeRecord = this.parseRoute(route, parent)
      // 将规范化的路由记录注册到路由系统
      this.registerRoute(routeRecord)
      // 如果当前路由包含子路由
      if (route.children) {
        // 递归处理子路由
        this.parseRoutes(route.children, routeRecord)
      }
    }
  }
  /**
   * 标准化路由配置，将其转换为路由记录对象
   * @param route - 原始路由配置对象
   * @param parent - 父级路由记录（可选）
   * @returns 标准化后的路由记录对象
   * @throws {Error} 当路由路径不是字符串时抛出错误
   * @throws {Error} 当根路由路径为空时抛出错误
   *
   * @description
   * 该方法执行以下操作：
   * 1. 验证路由路径是否为字符串
   * 2. 处理路由路径，包括空路径和相对路径的情况
   * 3. 处理路由名称，去除前导斜杠并发出警告
   * 4. 根据配置处理路径大小写敏感性
   * 5. 标准化路由组件
   * 6. 处理重定向、元数据等路由属性
   * 7. 处理动态路由模式
   * 8. 在开发环境下保存原始路由配置
   */
  private parseRoute(route: Route, parent?: RouteRecord): RouteRecord {
    if (!isString(route.path)) {
      throw new Error('Route path must be a string')
    }
    const isGroup = Boolean(Array.isArray(route.children) && route.children.length)
    const record: RouteRecord = markRaw({
      isGroup,
      path: '' as RoutePath
    })
    if (parent) {
      record.parent = parent
    }
    const rawPath = route.path.trim()
    record.path = normalizePath(parent ? `${parent.path}/${rawPath}` : `/${rawPath}`)
    if (route.name) {
      record.name = route.name
    }
    const component = resolveComponent(route, record.path)
    if (component) {
      record.component = component
    }
    const props = resolveProps(route, record.path)
    if (props) {
      record.props = props
    }
    if (route.redirect) {
      record.redirect = route.redirect
    }
    if (!component && !route.redirect && !isGroup) {
      throw new Error(
        `[Router] Route component or redirect or children it cannot be empty at the same time for route "${record.path}"`
      )
    }
    if (route.meta) {
      record.meta = route.meta
    }
    if ((route.beforeEnter && isFunction(route.beforeEnter)) || isArray(route.beforeEnter)) {
      record.beforeEnter = route.beforeEnter
    }
    if ((!isGroup || route.redirect) && isVariablePath(record.path)) {
      const { pattern, ...rest } = resolvePattern(
        record.path,
        route.pattern || {},
        this.config.strict,
        this.config.ignoreCase,
        this.config.pattern
      )
      record.pattern = pattern
      record.fullPattern = rest.regex
    }
    // 保存原始路由配置，方便开发环境调试
    if (__VITARX_DEV__) record.rawRoute = route
    return record
  }
  /**
   * 注册路由方法
   * @param route - 要注册的路由记录对象
   * @throws {Error} 当检测到重复的路由名称或路径时会抛出错误
   */
  private registerRoute(route: RouteRecord): void {
    // 跳过无重定向的组路由注册
    if (route.isGroup && !route.redirect) return

    // 如果路由名称存在
    if (route.name) {
      // 检查是否已存在相同名称的路由
      if (this.namedRoutes.has(route.name)) {
        // 抛出错误：检测到重复的路由名称
        throw new Error(`[Router] Duplicate route name detected: "${String(route.name)}"`)
      }
      // 将路由名称与路由记录关联存储
      this.namedRoutes.set(route.name, route)
    }

    if (route.fullPattern) {
      this.registerDynamicRoute(route, route.fullPattern)
    } else {
      const path = this.config.ignoreCase ? route.path.toLowerCase() : route.path
      // 检查是否已存在相同路径的路由
      if (this.staticRoutes.has(path)) {
        // 抛出错误：检测到重复的路由路径
        throw new Error(`[Router] Duplicate route path detected: "${route.path}"`)
      }
      // 将路由路径与路由记录关联存储
      this.staticRoutes.set(path, route)
    }
    this.routes.add(route)
  }
  /**
   * 记录动态路由
   */
  private registerDynamicRoute(route: RouteRecord, regex: RegExp): void {
    const optional = optionalVariableCount(route.path)
    const length = route.path.split('/').filter(Boolean).length
    const addToLengthMap = (len: number) => {
      if (!this.dynamicRoutes.has(len)) {
        this.dynamicRoutes.set(len, [])
      }
      this.dynamicRoutes.get(len)!.push({ regex, route })
    }
    addToLengthMap(length)
    if (optional > 0) {
      for (let i = 1; i <= optional; i++) {
        addToLengthMap(length - i)
      }
    }
  }
}
