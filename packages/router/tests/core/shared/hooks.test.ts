import { createApp, h, toRaw } from 'vitarx'
import { describe, expect, it, vi } from 'vitest'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from '../../../src/core/shared/index.js'
import { createMemoryRouter, defineRoutes, type Route } from '../../../src/index.js'

function createMockComponent() {
  return vi.fn()
}

const basicRoutes: Route[] = defineRoutes(
  { path: '/', component: createMockComponent(), name: 'home' },
  { path: '/about', component: createMockComponent(), name: 'about' },
  { path: '/user/{id}', component: createMockComponent(), name: 'user' }
)

describe('shared/hooks', () => {
  describe('onBeforeRouteLeave', () => {
    it('当没有活动路由器时应该发出警告', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const guard = vi.fn()
      const MockPage = () => {
        onBeforeRouteLeave(guard)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      app.mount(container)
      expect(container.innerHTML).toBe('<div>Mock Page</div>')
      expect(warnSpy).toHaveBeenCalledWith(
        '[Router]: onBeforeRouteLeave is called but there is no active router.'
      )
      expect(guard).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('应该正确添加守卫到路由', async () => {
      const guard = vi.fn()
      const MockPage = () => {
        onBeforeRouteLeave(guard)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.push({ index: '/' })
      app.use(router).mount(container)
      expect(container.innerHTML).toBe('<div>Mock Page</div>')
      await router.replace({ index: '/about' })
      expect(guard).toHaveBeenCalled()
      router.destroy()
    })

    it('应该接受守卫函数', async () => {
      const guard = vi.fn().mockReturnValue(true)
      const MockPage = () => {
        onBeforeRouteLeave(guard)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      expect(() => app.use(router).mount(container)).not.toThrow()
      router.destroy()
    })

    it('应该接受异步守卫函数', async () => {
      const guard = vi.fn().mockResolvedValue(true)
      const MockPage = () => {
        onBeforeRouteLeave(guard)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      expect(() => app.use(router).mount(container)).not.toThrow()
      router.destroy()
    })

    it('应该接受多个守卫', async () => {
      const guard1 = vi.fn().mockReturnValue(true)
      const guard2 = vi.fn().mockReturnValue(true)
      const MockPage = () => {
        onBeforeRouteLeave(guard1)
        onBeforeRouteLeave(guard2)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      app.use(router).mount(container)
      const rawRoute = toRaw(router.route)
      const guardSet = rawRoute.matched[0]?.leaveGuards
      expect(guardSet?.size).toBe(2)
      router.destroy()
    })
  })

  describe('onBeforeRouteUpdate', () => {
    it('当没有活动路由器时应该发出警告', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const callback = vi.fn()
      const MockPage = () => {
        onBeforeRouteUpdate(callback)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      app.mount(container)
      expect(container.innerHTML).toBe('<div>Mock Page</div>')
      expect(warnSpy).toHaveBeenCalledWith(
        '[Router]: onBeforeRouteUpdate is called but there is no active router.'
      )
      expect(callback).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('应该正确添加回调到路由', async () => {
      const callback = vi.fn()
      const MockPage = () => {
        onBeforeRouteUpdate(callback)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      app.use(router).mount(container)
      expect(container.innerHTML).toBe('<div>Mock Page</div>')
      const rawRoute = toRaw(router.route)
      const hookSet = rawRoute.matched[0]?.beforeUpdateHooks
      expect(hookSet?.has(callback)).toBe(true)
      router.destroy()
    })

    it('应该接受回调函数', async () => {
      const callback = vi.fn()
      const MockPage = () => {
        onBeforeRouteUpdate(callback)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      expect(() => app.use(router).mount(container)).not.toThrow()
      router.destroy()
    })

    it('应该接受多个回调', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const MockPage = () => {
        onBeforeRouteUpdate(callback1)
        onBeforeRouteUpdate(callback2)
        return h('div', 'Mock Page')
      }
      const container = document.createElement('div')
      const app = createApp(MockPage)
      const router = createMemoryRouter({ routes: basicRoutes })
      await router.replace({ index: '/' })
      app.use(router).mount(container)
      const rawRoute = toRaw(router.route)
      const hookSet = rawRoute.matched[0]?.beforeUpdateHooks
      expect(hookSet?.size).toBe(2)
      router.destroy()
    })
  })
})
