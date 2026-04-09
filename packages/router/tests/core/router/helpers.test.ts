import { describe, expect, it } from 'vitest'
import { NavState } from '../../../src/core/common/constant.js'
import { MemoryRouter } from '../../../src/core/router/memory.js'
import { WebRouter } from '../../../src/core/router/web.js'
import {
  createMemoryRouter,
  createRouteManager,
  createRouter,
  createWebRouter,
  defineRoutes,
  hasState,
  hasSuccess,
  useRoute,
  useRouter
} from '../../../src/core/shared/index.js'
import type { NavigateResult, Route, RouterOptions } from '../../../src/core/types/index.js'

import { createMockComponent } from '../testHelpers.js'

describe('router/helpers', () => {
  describe('defineRoutes', () => {
    it('应该返回传入的路由数组', () => {
      const routes: Route[] = [
        { path: '/', component: createMockComponent() },
        { path: '/home', component: createMockComponent() }
      ]
      const result = defineRoutes(...routes)
      expect(result).toStrictEqual(routes)
    })

    it('应该支持单个路由', () => {
      const route: Route = { path: '/', component: createMockComponent() }
      const result = defineRoutes(route)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(route)
    })

    it('应该返回空数组当没有参数时', () => {
      const result = defineRoutes()
      expect(result).toEqual([])
    })
  })

  describe('createRouteManager', () => {
    it('应该创建 RouteManager 实例', () => {
      const manager = createRouteManager([])
      expect(manager).toBeDefined()
      expect(manager.routes).toBeDefined()
    })

    it('应该接受路由配置', () => {
      const routes: Route[] = [{ path: '/', component: createMockComponent() }]
      const manager = createRouteManager(routes)
      expect(manager.routes.size).toBe(1)
    })

    it('应该接受配置选项', () => {
      const manager = createRouteManager([], { strict: true, ignoreCase: true })
      expect(manager.config.strict).toBe(true)
      expect(manager.config.ignoreCase).toBe(true)
    })
  })

  describe('createMemoryRouter', () => {
    it('应该创建 MemoryRouter 实例', () => {
      const options: RouterOptions = {
        routes: [{ path: '/', component: createMockComponent() }]
      }
      const router = createMemoryRouter(options)
      expect(router).toBeInstanceOf(MemoryRouter)
      router.destroy()
    })

    it('应该正确传递配置选项', () => {
      const options: RouterOptions = {
        routes: [{ path: '/', component: createMockComponent() }],
        base: '/app'
      }
      const router = createMemoryRouter(options)
      expect(router.config.base).toBe('/app')
      router.destroy()
    })
  })

  describe('createWebRouter', () => {
    it('应该创建 WebRouter 实例', () => {
      const options: RouterOptions = {
        routes: [{ path: '/', component: createMockComponent() }]
      }
      const router = createWebRouter(options)
      expect(router).toBeInstanceOf(WebRouter)
      router.destroy()
    })
  })

  describe('createRouter', () => {
    it('在浏览器环境应该创建 WebRouter', () => {
      const options: RouterOptions = {
        routes: [{ path: '/', component: createMockComponent() }]
      }
      const router = createRouter(options, true)
      expect(router).toBeInstanceOf(WebRouter)
      router.destroy()
    })

    it('skipEnvWarn 为 false 时应该创建路由', () => {
      const options: RouterOptions = {
        routes: [{ path: '/', component: createMockComponent() }]
      }
      const router = createRouter(options, true)
      expect(router).toBeDefined()
      router.destroy()
    })
  })

  describe('useRouter', () => {
    it('当路由器不存在时应该抛出错误', () => {
      expect(() => useRouter()).toThrow()
    })
  })

  describe('useRoute', () => {
    it('应该返回当前路由位置', async () => {
      const options: RouterOptions = {
        routes: [{ path: '/', component: createMockComponent() }]
      }
      const router = createMemoryRouter(options)
      await router.replace({ index: '/' })
      expect(router.route.path).toBe('/')
      router.destroy()
    })
  })

  describe('hasState', () => {
    it('应该正确检查状态包含关系', () => {
      const result: NavigateResult = {
        state: NavState.success,
        to: null as any,
        from: null as any,
        message: ''
      }
      expect(hasState(result, NavState.success)).toBe(true)
    })

    it('应该对不匹配的状态返回 false', () => {
      const result: NavigateResult = {
        state: NavState.aborted,
        to: null as any,
        from: null as any,
        message: ''
      }
      expect(hasState(result, NavState.success)).toBe(false)
    })

    it('应该支持位运算检查', () => {
      const result: NavigateResult = {
        state: NavState.success,
        to: null as any,
        from: null as any,
        message: ''
      }
      expect(hasState(result, NavState.success | NavState.aborted)).toBe(true)
    })
  })

  describe('hasSuccess', () => {
    it('应该对成功的导航返回 true', () => {
      const result: NavigateResult = {
        state: NavState.success,
        to: null as any,
        from: null as any,
        message: ''
      }
      expect(hasSuccess(result)).toBe(true)
    })

    it('应该对非成功的导航返回 false', () => {
      const result: NavigateResult = {
        state: NavState.aborted,
        to: null as any,
        from: null as any,
        message: ''
      }
      expect(hasSuccess(result)).toBe(false)
    })

    it('应该对 duplicated 状态返回 false', () => {
      const result: NavigateResult = {
        state: NavState.duplicated,
        to: null as any,
        from: null as any,
        message: ''
      }
      expect(hasSuccess(result)).toBe(false)
    })

    it('应该对 notfound 状态返回 false', () => {
      const result: NavigateResult = {
        state: NavState.notfound,
        to: null as any,
        from: null as any,
        message: ''
      }
      expect(hasSuccess(result)).toBe(false)
    })

    it('应该对 cancelled 状态返回 false', () => {
      const result: NavigateResult = {
        state: NavState.cancelled,
        to: null as any,
        from: null as any,
        message: ''
      }
      expect(hasSuccess(result)).toBe(false)
    })
  })
})
