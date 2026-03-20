import type { MakeRequired } from 'vitarx'
import type { RouteManager } from '../router/manager.js'
import type { AfterCallback, NavErrorListener, NavigationGuard, NotFoundHandler } from './hooks.js'
import type { InjectPropsHandler, Route, RouteViewComponent } from './route.js'
import type { BeforeScrollCallback } from './scroll.js'

/**
 * 定义路由器配置选项接口
 *
 * 允许用户自定义路由的行为和属性
 *
 * @template T - 历史模式类型，支持：'hash' | 'path' | 'memory'
 */
export interface RouterOptions {
  /**
   * 指定路由的基础路径
   *
   * 通常用于在部署时指定子目录
   */
  base?: `/${string}`

  /**
   * 路径模式
   */
  mode?: 'hash' | 'path'

  /**
   * 定义路由规则的数组或路由注册表
   *
   * 每个路由规则描述了路径和对应的组件或其他信息
   *
   * @example
   * ```ts
   * const routes: Route[] = [
   *   { path: '/', component: Home },
   *   { path: '/about', component: About },
   *   { path: '/user/{id}', component: User },
   * ]
   * ```
   */
  routes: Route[] | RouteManager

  /**
   * 强制使用指定的后缀
   *
   * 如需使url地址看起来更符合静态站点特征，可以指定一个默认的后缀，例如'.html'。
   */
  suffix?: `.${string}`

  /**
   * 全局启用 props 注入功能
   *
   * @default false
   */
  props?: boolean | InjectPropsHandler

  /**
   * 切换页面时的滚动行为
   *
   * 可以是一个函数或行为标识符，决定了当路由变化时如何滚动页面
   */
  scrollBehavior?: BeforeScrollCallback

  /**
   * 在每个路由进入之前调用的钩子函数
   * 允许用户在路由激活之前执行逻辑检查或重定向
   */
  beforeEach?: NavigationGuard | NavigationGuard[]

  /**
   * 在每个路由进入之后调用的钩子函数
   * 允许用户在路由激活之后执行逻辑，例如页面初始化
   */
  afterEach?: AfterCallback | AfterCallback[]
  /**
   * 路由未匹配钩子
   *
   * 触发时机: 路由匹配失败 (404) 时。
   * 用途: 可用于统一跳转 404 页面或记录错误日志。
   *
   * @param this - 路由器实例
   * @param target - 用户的原始导航意图
   * @returns {NavTarget | void} 返回新目标表示重定向，无返回值则抛出错误
   */
  onNotFound?: NotFoundHandler | NotFoundHandler[]

  /**
   * 路由错误处理钩子
   *
   * @param error - 错误对象
   * @param to - 目标路由对象
   * @param from - 源路由对象
   */
  onError?: NavErrorListener | NavErrorListener[]

  /**
   * 未匹配到路由时要渲染的组件
   *
   * 如果你需要在未匹配到路由时重定向到指定的页面，则不应该使用`missing`选项，
   * 而是应该使用 `onNotFound` 钩子指定重定向目标。
   *
   * > 注意：如果你设置了`missing`选项，`path` 导航不匹配时也会更新`URL`地址，然后渲染`missing`组件。
   */
  missing?: RouteViewComponent
}

export type ResolvedRouterConfig = MakeRequired<
  Omit<RouterOptions, 'routes' | 'beforeEach' | 'afterEach' | 'onError' | 'onNotFound'>,
  'mode' | 'base'
>
