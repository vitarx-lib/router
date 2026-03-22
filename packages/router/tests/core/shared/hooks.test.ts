import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, defineRoutes, type Route } from '../../../src/index.js'
import * as helpers from '../../../src/core/router/helpers.js'

function createMockComponent() {
  return vi.fn()
}

const basicRoutes: Route[] = defineRoutes(
  { path: '/', component: createMockComponent(), name: 'home' },
  { path: '/about', component: createMockComponent(), name: 'about' },
  { path: '/user/{id}', component: createMockComponent(), name: 'user' }
)

function mockUseRouter(router: any) {
  Object.defineProperty(helpers, 'useRouter', {
    value: vi.fn().mockReturnValue(router),
    writable: true,
    configurable: true
  })
}

function restoreUseRouter(originalFn: any) {
  Object.defineProperty(helpers, 'useRouter', {
    value: originalFn,
    writable: true,
    configurable: true
  })
}

describe('shared/hooks', () => {
  let originalUseRouter: any

  beforeEach(() => {
    originalUseRouter = helpers.useRouter
  })

  afterEach(() => {
    restoreUseRouter(originalUseRouter)
  })

  describe('onBeforeRouteLeave', () => {
    it('当没有活动路由器时应该发出警告', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockUseRouter(null)

      const { onBeforeRouteLeave } = await import('../../../src/core/shared/hooks.js')
      const guard = vi.fn()
      onBeforeRouteLeave(guard)
      expect(warnSpy).toHaveBeenCalledWith(
        '[Router]: onBeforeRouteLeave is called but there is no active router.'
      )
      warnSpy.mockRestore()
    })

    it('应该正确添加守卫到路由', async () => {
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      mockUseRouter(router)

      const { onBeforeRouteLeave } = await import('../../../src/core/shared/hooks.js')
      const guard = vi.fn().mockReturnValue(true)
      onBeforeRouteLeave(guard)

      expect(router['_routeLocation'].value.leaveGuards).toBeDefined()
      expect(router['_routeLocation'].value.leaveGuards!.has(guard)).toBe(true)

      router.destroy()
    })

    it('应该接受守卫函数', async () => {
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      mockUseRouter(router)

      const { onBeforeRouteLeave } = await import('../../../src/core/shared/hooks.js')
      const guard = vi.fn().mockReturnValue(true)
      expect(() => onBeforeRouteLeave(guard)).not.toThrow()

      router.destroy()
    })

    it('应该接受异步守卫函数', async () => {
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      mockUseRouter(router)

      const { onBeforeRouteLeave } = await import('../../../src/core/shared/hooks.js')
      const guard = vi.fn().mockResolvedValue(true)
      expect(() => onBeforeRouteLeave(guard)).not.toThrow()

      router.destroy()
    })

    it('应该接受多个守卫', async () => {
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      mockUseRouter(router)

      const { onBeforeRouteLeave } = await import('../../../src/core/shared/hooks.js')
      const guard1 = vi.fn().mockReturnValue(true)
      const guard2 = vi.fn().mockReturnValue(true)
      onBeforeRouteLeave(guard1)
      onBeforeRouteLeave(guard2)

      expect(router['_routeLocation'].value.leaveGuards!.size).toBe(2)

      router.destroy()
    })
  })

  describe('onBeforeRouteUpdate', () => {
    it('当没有活动路由器时应该发出警告', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockUseRouter(null)

      const { onBeforeRouteUpdate } = await import('../../../src/core/shared/hooks.js')
      const callback = vi.fn()
      onBeforeRouteUpdate(callback)
      expect(warnSpy).toHaveBeenCalledWith(
        '[Router]: onBeforeRouteUpdate is called but there is no active router.'
      )
      warnSpy.mockRestore()
    })

    it('应该正确添加回调到路由', async () => {
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      mockUseRouter(router)

      const { onBeforeRouteUpdate } = await import('../../../src/core/shared/hooks.js')
      const callback = vi.fn()
      onBeforeRouteUpdate(callback)

      expect(router['_routeLocation'].value.beforeUpdateHooks).toBeDefined()
      expect(router['_routeLocation'].value.beforeUpdateHooks!.has(callback)).toBe(true)

      router.destroy()
    })

    it('应该接受回调函数', async () => {
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      mockUseRouter(router)

      const { onBeforeRouteUpdate } = await import('../../../src/core/shared/hooks.js')
      const callback = vi.fn()
      expect(() => onBeforeRouteUpdate(callback)).not.toThrow()

      router.destroy()
    })

    it('应该接受多个回调', async () => {
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      mockUseRouter(router)

      const { onBeforeRouteUpdate } = await import('../../../src/core/shared/hooks.js')
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      onBeforeRouteUpdate(callback1)
      onBeforeRouteUpdate(callback2)

      expect(router['_routeLocation'].value.beforeUpdateHooks!.size).toBe(2)

      router.destroy()
    })
  })
})
