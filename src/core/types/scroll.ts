import type { ReadonlyRouteLocation } from './navigation.js'

/**
 * 滚动行为
 */
export type _ScrollBehavior = 'auto' | 'instant' | 'smooth'

/**
 * 滚动配置
 */
export interface _ScrollToOptions {
  left?: number
  top?: number
  behavior?: _ScrollBehavior
}

/**
 * 滚动到视图配置
 */
export interface _ScrollIntoViewOptions extends ScrollIntoViewOptions {
  el: Element | `#${string}` | string
}

/**
 * 滚动目标
 */
export type ScrollTarget = _ScrollToOptions | _ScrollIntoViewOptions

/**
 * 滚动结果
 */
export type ScrollResult = ScrollTarget | false

/**
 * 滚动行为处理器
 */
export type ScrollBehaviorHandler = (
  to: ReadonlyRouteLocation,
  from: ReadonlyRouteLocation,
  savedPosition: _ScrollToOptions | undefined
) => ScrollResult | Promise<ScrollResult>
