import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebRouter } from '../../../src/core/router/helpers.js'
import { WebRouter } from '../../../src/core/router/web.js'
import type { Route, RouterOptions } from '../../../src/core/types/index.js'

function createMockComponent() {
  return vi.fn()
}

function createTestWebRouter(options?: Partial<RouterOptions>): WebRouter {
  const defaultRoutes: Route[] = [
    { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
    { path: '/home', component: { default: createMockComponent() }, props: { default: {} } },
    { path: '/about', component: { default: createMockComponent() }, props: { default: {} } }
  ]
  return createWebRouter({
    routes: options?.routes || defaultRoutes,
    ...options
  })
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
  })
})
