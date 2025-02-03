export * from './route.js'
export * from './scroll.js'
export * from './hooks.js'
export * from './navigation.js'

import type { AfterEnterCallback, BeforeEnterCallback } from './hooks.js'
import type { HistoryMode } from './navigation.js'
import type { Route } from './route.js'
import type { _ScrollBehavior, ScrollBehaviorHandler } from './scroll.js'

/**
 * 定义路由器配置选项接口
 *
 * 允许用户自定义路由的行为和属性
 *
 * @template T - 历史模式类型，支持：'hash' | 'path' | 'memory'
 */
export interface RouterOptions<T extends HistoryMode = HistoryMode> {
  /**
   * 指定路由的基础路径
   *
   * 通常用于在部署时指定子目录
   */
  base?: `/${string}`

  /**
   * 指定路由的历史模式，可以是  'path' | 'hash' | 'memory'
   *
   * @default 'hash'
   */
  mode?: T

  /**
   * 是否启用严格模式
   *
   * 在严格模式下，会区分大小写
   *
   * @default false
   */
  strict?: boolean

  /**
   * 定义路由规则的数组
   *
   * 每个路由规则描述了路径和对应的组件或其他信息
   *
   * @example
   * ```ts
   * const routes: Route[] = [
   *   { path: '/', widget: Home },
   *   { path: '/about', widget: About },
   *   { path: '/user/:id', widget: User },
   * ]
   * ```
   */
  routes: Route[]

  /**
   * 指定路由的后缀
   *
   * 可以是星号表示任意后缀，字符串或字符串数组表示具体的后缀，false表示完全匹配
   *
   * @default '*'
   */
  suffix?: '*' | string | string[] | false

  /**
   * 默认的动态路由匹配模式
   *
   * 允许用户定义复杂的路径匹配规则
   *
   * @default /[\w.]+/
   */
  pattern?: RegExp

  /**
   * 定义滚动行为
   *
   * 可以是一个函数或行为标识符，决定了当路由变化时如何滚动页面
   *
   * @default 'smooth'
   */
  scrollBehavior?: _ScrollBehavior | ScrollBehaviorHandler

  /**
   * 在每个路由进入之前调用的钩子函数
   * 允许用户在路由激活之前执行逻辑检查或重定向
   */
  beforeEach?: BeforeEnterCallback

  /**
   * 在每个路由进入之后调用的钩子函数
   * 允许用户在路由激活之后执行逻辑，例如页面初始化
   */
  afterEach?: AfterEnterCallback
}

/**
 * 已初始化的路由配置
 */
export type InitializedRouterOptions = MakeRequired<
  RouterOptions,
  Exclude<keyof RouterOptions, 'beforeEach' | 'afterEach'>
>
