/**
 * @fileoverview core 测试共享工具
 *
 * 提供核心模块测试的公共辅助函数，消除重复代码。
 */
import { type Component, h } from 'vitarx'
import { vi } from 'vitest'
import { MemoryRouter } from '../../src/core/router/memory.js'
import { createMemoryRouter } from '../../src/core/shared/index.js'
import type { Route, RouterOptions } from '../../src/core/types/index.js'

/**
 * 创建 mock 组件
 *
 * @param name - 可选的组件名称，用于 DOM 标识
 * @returns mock 组件函数
 */
export function createMockComponent(name?: string): Component {
  if (name) {
    return () => h('div', { 'data-testid': name }, name)
  }
  return vi.fn(() => null)
}

/**
 * 创建默认测试路由配置
 *
 * @param componentFactory - 组件工厂函数
 * @returns 路由配置数组
 */
export function createDefaultRoutes(
  componentFactory: () => Component = createMockComponent
): Route[] {
  return [
    { path: '/', component: { default: componentFactory() }, props: { default: {} } },
    { path: '/home', component: { default: componentFactory() }, props: { default: {} } },
    { path: '/about', component: { default: componentFactory() }, props: { default: {} } },
    { path: '/user/{id}', component: { default: componentFactory() }, props: { default: true } }
  ]
}

/**
 * 创建测试用 MemoryRouter
 *
 * @param options - 路由器配置
 * @returns 初始化后的 MemoryRouter 实例
 */
export function createTestRouter(options?: Partial<RouterOptions>): MemoryRouter {
  const router = createMemoryRouter({
    routes: options?.routes || createDefaultRoutes(),
    mode: 'path',
    ...options
  })
  router.replace({ index: '/' }).then()
  return router
}

/**
 * 等待渲染完成
 *
 * @param timeout - 等待超时时间（毫秒）
 * @returns Promise
 */
export function waitForRender(timeout = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout))
}
