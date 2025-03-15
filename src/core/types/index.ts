export * from './route.js'
export * from './scroll.js'
export * from './hooks.js'
export * from './navigation.js'

import type { AfterEnterCallback, BeforeEnterCallback } from './hooks.js'
import type { HistoryMode, RouteWidget } from './navigation.js'
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
   * 可选值：
   * - '*'：表示匹配任何后缀
   * - 字符串：表示匹配指定后缀
   * - 字符串数组：表示匹配多个后缀
   * - false：表示完全匹配路径路由path
   *
   * @default '*'
   */
  suffix?: '*' | string | string[] | false

  /**
   * 默认的后缀
   *
   * 如需使url地址看起来更符合静态网站特征，可以指定一个默认的后缀，例如'.html'。
   *
   * @default ''
   */
  defaultSuffix?: string

  /**
   * 默认的动态路由匹配模式
   *
   * 允许用户定义复杂的路径匹配规则
   *
   * @default /[\w.]+/
   */
  pattern?: RegExp

  /**
   * 切换页面时的滚动行为
   *
   * 可以是一个函数或行为标识符，决定了当路由变化时如何滚动页面
   *
   * @default 'auto'
   */
  scrollBehavior?: _ScrollBehavior | ScrollBehaviorHandler
  /**
   * 锚点跳转时的滚动行为
   *
   * 仅支持 'auto' | 'smooth' | 'instant'
   *
   * @default 'auto'
   */
  anchorsScrollBehavior?: _ScrollBehavior

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
  /**
   * 未匹配到路由时要渲染的组件（仅在根`RouterView`渲染）
   *
   * 如果你需要在未匹配到路由时重定向到指定的页面，你不应该使用`missing`选项，
   * 而是应该在路由`beforeEach`钩子中判断`to.matched.length === 0`时返回重定向目标。
   *
   * > 注意：如果你设置了`missing`选项，新路由没有匹配时也会更新`URL`地址，然后渲染`missing`组件，
   * 你可以通过`useRoute().matched.length`来判断是否真正匹配到了路由。
   */
  missing?: RouteWidget
}

/**
 * 已初始化的路由配置
 */
export type InitializedRouterOptions = MakeRequired<
  RouterOptions,
  Exclude<keyof RouterOptions, 'beforeEach' | 'afterEach' | 'missing'>
>
