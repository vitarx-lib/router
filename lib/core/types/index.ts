export * from './route.js'
export * from './scroll.js'
export * from './hooks.js'
export * from './navigation.js'

import type { AfterEnterCallback, BeforeEnterCallback } from './hooks.js'
import type { HistoryMode } from './navigation.js'
import type { Route } from './route.js'
import type { _ScrollBehavior, ScrollBehaviorHandler } from './scroll.js'

/**
 * 路由器配置
 */
export interface RouterOptions<T extends HistoryMode = HistoryMode> {
  base?: `/${string}`
  mode?: T
  strict?: boolean
  routes: Route[]
  suffix?: '*' | string | string[] | false
  pattern?: RegExp
  scrollBehavior?: _ScrollBehavior | ScrollBehaviorHandler
  beforeEach?: BeforeEnterCallback
  afterEach?: AfterEnterCallback
}

/**
 * 已初始化的路由配置
 */
export type InitializedRouterOptions = MakeRequired<
  RouterOptions,
  Exclude<keyof RouterOptions, 'beforeEach' | 'afterEach'>
>
