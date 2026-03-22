import type { Component } from 'vitarx'
import { type AfterCallback, type NavigationGuard, type NavOptions } from '../index.js'
import { Router } from '../router/index.js'
import type { NavTarget, RouteLocation } from './navigation.js'

/**
 * 注入参数处理函数
 *
 * @param {RouteLocation} location 路由匹配的位置信息
 * @return {Record<string, any>} 注入的参数，必须是可JSON序列化的对象
 */
export type InjectPropsHandler = (location: RouteLocation) => Record<string, any>

/**
 * 路由参数注入
 */
export type InjectProps = boolean | Record<string, any> | InjectPropsHandler
/**
 * 命名的路由参数注入
 */
export type NamedInjectProps = Record<string, InjectProps>
/**
 * 重定向处理器
 */
export type RedirectHandler = (
  this: Router,
  to: RouteLocation
) => NavTarget | string | symbol | void

/**
 * 解析后的动态路由参数匹配模式
 */
export type ResolvedPattern = { name: string; regex: RegExp; optional: boolean }

/**
 * 路由视图组件
 */
export type RouteViewComponent = Component

/**
 * 命名的路由视图小部件
 *
 * 用于多视图布局
 */
export type NamedRouteComponent = {
  default: RouteViewComponent
  [key: string]: RouteViewComponent
}
/**
 * 此类型用于，扩展路由元数据类型，完善路由元数据提示，提升开发体验。
 *
 * @example
 * ```ts
 * // 在项目中的全局类型声明文件中写入如下类型即可在使用路由元数据时提示
 * declare module 'vitarx-router' {
 *    interface RouteMetaData {
 *      title: string
 *      icon: string
 *    }
 * }
 * ```
 */
export interface RouteMetaData {
  [key: string]: any
}

/**
 * 路由路线配置
 *
 * 该接口定义了应用程序中路由的配置对象的结构它描述了路由如何映射到组件，
 * 以及路由的各种属性和行为
 *
 * @template T - 指定路由组件的类型，必须是 AllowedRouteWidget 的子类型
 */
export interface Route {
  /**
   * 路由的路径，用于URL匹配
   *
   * 支持动态路径匹配，如：`/user/{id}`，可选变量：`/user/{id?}`
   */
  path: string
  /**
   * 路由的名称，用于识别和引用路由
   *
   * 切勿以 `/` 开头
   */
  name?: RouteName
  /**
   * 路由的别名，用于匹配多个路径到同一个路由
   */
  alias?: string | string[]
  /**
   * 动态路由参数匹配模式
   */
  pattern?: Record<string, RegExp>
  /**
   * 路由对应的视图组件
   *
   * 支持命名视图
   * @example
   * ```ts
   * {
   *   path: '/user/{id}',
   *   name: 'user',
   *   component: {
   *     default: User,
   *     detail: UserDetail,
   *   }
   * }
   * ```
   *
   * 支持懒加载
   * @example
   * ```ts
   * {
   *   path: '/user/{id}',
   *   component: lazy(() => import('./User.js'))
   * }
   * ```
   */
  component?: Component | NamedRouteComponent
  /**
   * 路由重定向的目标地址或处理函数
   */
  redirect?: NavOptions | string | symbol | RedirectHandler
  /**
   * 子路由配置，用于嵌套路由
   */
  children?: Route[]
  /**
   * 路由的元数据，用于存储附加信息
   */
  meta?: RouteMetaData
  /**
   * 需要给 `Component` 注入的参数
   *
   * 可选值：
   * - `true`：表示仅注入匹配到的动态path参数
   * - `false`：表示不注入参数
   * - `{key: value}`：表示注入指定参数
   * - `(location: RouteLocationRaw) => {key: value}`：自定义一个处理函数，返回一个对象用于注入参数
   *
   * > 注意：如果是命名视图，则需要以键值对形式传入：{视图名称:injectProps配置}
   *
   * @default true
   */
  props?: InjectProps | NamedInjectProps
  /**
   * 路由进入前的钩子函数，用于权限控制或数据预加载
   *
   * 默认继承`RouterOptions.beforeEach`
   */
  beforeEnter?: NavigationGuard
  /**
   * 路由进入后的钩子函数，用于处理进入路由后的逻辑
   *
   * 默认继承`RouterOptions.afterEach`
   */
  afterEnter?: AfterCallback
}

/**
 * 解析后的路线记录
 */
export interface RouteRecord {
  /**
   * 是否为分组路由
   */
  isGroup: boolean
  /**
   * 父级路线记录
   */
  parent?: RouteRecord
  /**
   * 路由路径
   */
  path: RoutePath
  /**
   * 路由别名路径列表
   */
  aliases?: RoutePath[]
  /**
   * 路由名称
   */
  name?: RouteName
  /**
   * 路由元数据
   */
  meta?: RouteMetaData
  /**
   * 需要给 `Component` 注入的参数
   */
  props?: NamedInjectProps
  /**
   * 路由重定向的目标地址或处理函数
   */
  redirect?: Route['redirect']
  /**
   * 路由对应的视图组件
   */
  component?: NamedRouteComponent
  /**
   * 路由进入前的钩子函数，用于权限控制或数据预加载
   */
  beforeEnter?: NavigationGuard | NavigationGuard[]
  /**
   * 动态路由参数匹配模式
   */
  pattern?: ResolvedPattern[]
  /**
   * 完整的动态路由参数匹配模式
   */
  fullPattern?: RegExp
  /**
   * 原始的路由模式配置（用于子路由继承）
   */
  rawPattern?: Record<string, RegExp>
  /**
   * 子路由列表
   */
  children?: RouteRecord[]
  /**
   * 原始路由配置
   *
   * @note 仅存在于开发环境，生产环境会移除！   */
  rawRoute?: Route
}

/**
 * 动态路由记录
 */
export interface DynamicRouteRecord {
  regex: RegExp
  route: RouteRecord
}

/**
 * 路由索引映射
 *
 * 可以通过扩展此接口实现类型化路由，
 * router.push/replace 等方法会根据此接口进行类型推断参数类型。
 *
 * @example
 * ```ts
 * declare module 'vitarx-router' {
 *   interface RouteIndexMap {
 *      user: {
 *       params: { id: string }
 *     }
 *   }
 * }
 * export {}
 * ```
 */
export interface RouteIndexMap {}

type PathExpandExt<T> = T extends `/${string}` ? `${T}.${string}` : T
type TypedPath<T> = T extends `/${string}` ? T : never
type TypedName<T> = T extends `/${string}` ? never : T

/**
 * 所有被支持的路由索引
 */
export type RouteIndex = keyof RouteIndexMap extends never
  ? string | symbol
  : keyof RouteIndexMap | PathExpandExt<keyof RouteIndexMap> | symbol

/**
 * 路由名称
 */
export type RouteName =
  TypedName<RouteIndex> extends never ? string | symbol : TypedName<RouteIndex>
/**
 * 路由路径
 */
export type RoutePath = TypedPath<RouteIndex> extends never ? `/${string}` : TypedPath<RouteIndex>
