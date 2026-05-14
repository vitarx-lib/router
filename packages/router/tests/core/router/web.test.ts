import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebRouter } from '../../../src/core/shared/index.js'
import { WebRouter } from '../../../src/core/router/web.js'
import type { Route, RouterOptions } from '../../../src/core/types/index.js'
import { createMockComponent } from '../testHelpers.js'

function createTestWebRouter(options?: Partial<RouterOptions>, autoInit?: boolean): WebRouter {
  const defaultRoutes: Route[] = [
    { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
    { path: '/home', component: { default: createMockComponent() }, props: { default: {} } },
    { path: '/about', component: { default: createMockComponent() }, props: { default: {} } }
  ]
  return createWebRouter(
    {
      routes: options?.routes || defaultRoutes,
      ...options
    },
    autoInit
  )
}

describe('router/web', () => {
  let router: WebRouter | null = null

  afterEach(() => {
    if (router) {
      router.destroy()
      router = null
    }
  })

  describe('WebRouter', () => {
    it('应该正确创建实例', () => {
      const routes: Route[] = [{ path: '/', component: createMockComponent() }]
      router = new WebRouter({ routes })
      expect(router).toBeInstanceOf(WebRouter)
    })

    it('应该正确处理 path 模式', async () => {
      router = createTestWebRouter({ mode: 'path' })
      await router.replace({ index: '/' })
      expect(router.route.path).toBe('/')
    })

    it('应该正确处理 hash 模式', async () => {
      router = createTestWebRouter({ mode: 'hash' })
      await router.replace({ index: '/' })
      expect(router.route.path).toBe('/')
    })

    it('应该正确处理 base 配置', async () => {
      router = createTestWebRouter({ base: '/app' })
      await router.replace({ index: '/' })
      expect(router.config.base).toBe('/app')
    })

    describe('push', () => {
      beforeEach(async () => {
        router = createTestWebRouter()
        await router!.replace({ index: '/' })
      })

      it('push 应该正确导航', async () => {
        const result = await router!.push({ index: '/home' })
        expect(result.state).toBeDefined()
      })

      it('push 带查询参数应该正确工作', async () => {
        await router!.push({ index: '/home', query: { a: '1' } })
        expect(router!.route.query.a).toBe('1')
      })

      it('push 带 hash 应该正确工作', async () => {
        await router!.push({ index: '/home', hash: '#section' })
        expect(router!.route.path).toBe('/home')
      })
    })

    describe('replace', () => {
      beforeEach(async () => {
        router = createTestWebRouter()
        await router!.replace({ index: '/' })
      })

      it('replace 应该正确导航', async () => {
        const result = await router!.replace({ index: '/home' })
        expect(result.state).toBeDefined()
      })
    })

    describe('go/back/forward', () => {
      beforeEach(async () => {
        router = createTestWebRouter()
        await router!.replace({ index: '/' })
      })

      it('go 应该正确工作', async () => {
        await router!.push({ index: '/home' })
        router!.go(-1)
        await new Promise(resolve => setTimeout(resolve, 50))
        expect(router!.route.path).toBe('/')
      })

      it('back 应该正确工作', async () => {
        await router!.push({ index: '/home' })
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 50))
        expect(router!.route.path).toBe('/')
      })

      it('forward 应该正确工作', async () => {
        await router!.push({ index: '/home' })
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 50))
        router!.forward()
        await new Promise(resolve => setTimeout(resolve, 50))
        expect(router!.route.path).toBe('/home')
      })
    })

    describe('destroy', () => {
      it('destroy 应该清理资源', async () => {
        router = createTestWebRouter()
        await router.replace({ index: '/' })
        router.destroy()
        expect(router.manager.routes.size).toBe(0)
      })
    })

    describe('scrollBehavior', () => {
      it('应该正确配置 scrollBehavior', async () => {
        const scrollBehavior = vi.fn()
        router = createTestWebRouter({ scrollBehavior })
        await router!.replace({ index: '/' })
        expect(router!.config.scrollBehavior).toBe(scrollBehavior)
      })
    })

    describe('suffix 配置', () => {
      it('应该正确处理 suffix', async () => {
        router = createTestWebRouter({ suffix: '.html' })
        await router!.replace({ index: '/' })
        expect(router!.config.suffix).toBe('.html')
      })
    })

    describe('autoInit 配置', () => {
      it('默认应自动初始化（注册事件监听并执行初始导航）', async () => {
        const addEventSpy = vi.spyOn(window, 'addEventListener')
        router = createTestWebRouter()
        await router.isReady()
        expect(addEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
        expect(addEventSpy).toHaveBeenCalledWith('hashchange', expect.any(Function))
        addEventSpy.mockRestore()
      })

      it('autoInit: true 应自动初始化', async () => {
        const addEventSpy = vi.spyOn(window, 'addEventListener')
        router = createTestWebRouter(undefined, true)
        await router.isReady()
        expect(addEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
        expect(addEventSpy).toHaveBeenCalledWith('hashchange', expect.any(Function))
        addEventSpy.mockRestore()
      })

      it('autoInit: false 不应自动初始化', () => {
        const addEventSpy = vi.spyOn(window, 'addEventListener')
        router = createTestWebRouter(undefined, false)
        expect(addEventSpy).not.toHaveBeenCalledWith('popstate', expect.any(Function))
        expect(addEventSpy).not.toHaveBeenCalledWith('hashchange', expect.any(Function))
        addEventSpy.mockRestore()
      })

      it('autoInit: false 时手动调用 init() 应正确初始化', async () => {
        const addEventSpy = vi.spyOn(window, 'addEventListener')
        router = createTestWebRouter(undefined, false)
        expect(addEventSpy).not.toHaveBeenCalledWith('popstate', expect.any(Function))
        const result = router.init()
        expect(result).toBe(router)
        expect(addEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
        expect(addEventSpy).toHaveBeenCalledWith('hashchange', expect.any(Function))
        await router.isReady()
        addEventSpy.mockRestore()
      })

      it('init() 重复调用应幂等，不会重复注册事件监听', async () => {
        const addEventSpy = vi.spyOn(window, 'addEventListener')
        router = createTestWebRouter(undefined, false)
        router.init()
        const popstateCallCount = addEventSpy.mock.calls.filter(
          call => call[0] === 'popstate'
        ).length
        router.init()
        const popstateCallCountAfterSecond = addEventSpy.mock.calls.filter(
          call => call[0] === 'popstate'
        ).length
        expect(popstateCallCountAfterSecond).toBe(popstateCallCount)
        addEventSpy.mockRestore()
      })

      it('autoInit: false 时通过 new WebRouter 创建不应自动初始化', () => {
        const addEventSpy = vi.spyOn(window, 'addEventListener')
        const routes: Route[] = [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } }
        ]
        router = new WebRouter({ routes })
        expect(addEventSpy).not.toHaveBeenCalledWith('popstate', expect.any(Function))
        expect(addEventSpy).not.toHaveBeenCalledWith('hashchange', expect.any(Function))
        addEventSpy.mockRestore()
      })

      it('autoInit: false 手动初始化后导航应正常工作', async () => {
        router = createTestWebRouter(undefined, false)
        router.init()
        await router.isReady()
        const result = await router.push({ index: '/home' })
        expect(result.state).toBeDefined()
        expect(router.route.path).toBe('/home')
      })

      it('autoInit: false 手动初始化后 destroy 应正确清理事件监听', async () => {
        const removeEventSpy = vi.spyOn(window, 'removeEventListener')
        router = createTestWebRouter(undefined, false)
        router.init()
        await router.isReady()
        router.destroy()
        expect(removeEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
        expect(removeEventSpy).toHaveBeenCalledWith('hashchange', expect.any(Function))
        removeEventSpy.mockRestore()
      })
    })
  })
})
