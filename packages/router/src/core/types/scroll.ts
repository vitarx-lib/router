import type { RouteLocation } from './navigation.js'

/**
 * 滚动行为
 */
export type ScrollBehavior = 'auto' | 'instant' | 'smooth'

/**
 * 滚动配置
 */
export interface ScrollTarget {
  el?: string
  left?: number
  top?: number
  behavior?: ScrollBehavior
}

/**
 * 保存的页面位置
 */
export interface ScrollPosition {
  left: number
  top: number
}

/**
 * 滚动行为处理器
 *
 * 如果返回 false 则禁用路由器内部的滚动处理程序。
 */
export type BeforeScrollCallback = (
  to: RouteLocation,
  from: RouteLocation,
  savedPosition: ScrollPosition | null
) => ScrollTarget | false | void
