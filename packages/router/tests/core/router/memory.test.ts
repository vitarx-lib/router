import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter } from '../../../src/core/router/helpers.js'
import { MemoryRouter } from '../../../src/core/router/memory.js'
import type { Route, RouterOptions } from '../../../src/core/types/index.js'

function createMockComponent() {
  return vi.fn()
}

function createTestRouter(options?: Partial<RouterOptions>): MemoryRouter {
  const defaultRoutes: Route[] = [
    { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
    { path: '/home', component: { default: createMockComponent() }, props: { default: {} } },
    { path: '/about', component: { default: createMockComponent() }, props: { default: {} } },
    { path: '/user/{id}', component: { default: createMockComponent() }, props: { default: true } }
  ]
  const router = createMemoryRouter({
    routes: options?.routes || defaultRoutes,
    ...options
  })
  router.replace({ index: '/' }).then()
  return router
}

describe('router/memory', () => {
  let router: MemoryRouter | null = null

  afterEach(() => {
    if (router) {
      router.destroy()
      router = null
    }
  })

  describe('MemoryRouter', () => {
    it('应该正确创建实例', () => {
      const routes: Route[] = [{ path: '/', component: createMockComponent() }]
      router = new MemoryRouter({ routes })
      expect(router).toBeInstanceOf(MemoryRouter)
    })

    describe('go', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('go(0) 应该不做任何操作', async () => {
        const initialPath = router!.route.path
        router!.go(0)
        await new Promise(resolve => setTimeout(resolve, 10))
        expect(router!.route.path).toBe(initialPath)
      })

      it('go 正数应该前进', async () => {
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        router!.go(-2)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
        router!.go(2)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/about')
      })

      it('go 负数应该后退', async () => {
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        router!.go(-1)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/home')
      })

      it('go 超出边界应该限制在有效范围内', async () => {
        await router!.push({ index: '/home' })
        router!.go(-100)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
      })

      it('go 正数超出边界应该限制在有效范围内', async () => {
        await router!.push({ index: '/home' })
        router!.go(100)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/home')
      })

      it('go 到当前位置应该不做任何操作', async () => {
        await router!.push({ index: '/home' })
        const path = router!.route.path
        router!.go(0)
        await new Promise(resolve => setTimeout(resolve, 10))
        expect(router!.route.path).toBe(path)
      })
    })

    describe('back', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('back 应该后退一步', async () => {
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/home')
      })

      it('连续 back 应该正确工作', async () => {
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/home')
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
      })
    })

    describe('forward', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('forward 应该前进一步', async () => {
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        router!.go(-1)
        await new Promise(resolve => setTimeout(resolve, 20))
        router!.forward()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/about')
      })
    })

    describe('push', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('push 应该添加新的历史记录', async () => {
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        router!.go(-1)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/home')
      })

      it('push 后再 push 应该清除后面的历史', async () => {
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        router!.go(-1)
        await new Promise(resolve => setTimeout(resolve, 20))
        await router!.push({ index: '/user/123' })
        router!.go(1)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/user/123')
      })
    })

    describe('replace', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('replace 应该替换当前历史记录', async () => {
        await router!.push({ index: '/home' })
        await router!.replace({ index: '/about' })
        router!.go(-1)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
        router!.go(1)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/about')
      })

      it('replace 后 back 应该跳过被替换的路由', async () => {
        await router!.push({ index: '/home' })
        await router!.replace({ index: '/about' })
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
      })
    })

    describe('destroy', () => {
      it('destroy 应该清空历史记录', async () => {
        router = createTestRouter()
        await router.isReady()
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        router!.destroy()
        expect(router!.manager.routes.size).toBe(0)
      })

      it('destroy 后应该可以重新初始化', async () => {
        router = createTestRouter()
        await router.isReady()
        router!.destroy()
        const routes: Route[] = [{ path: '/', component: createMockComponent() }]
        router = new MemoryRouter({ routes })
        await router.replace({ index: '/' })
        expect(router.route.path).toBe('/')
      })
    })

    describe('历史记录管理', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('多次 push 应该正确维护历史栈', async () => {
        await router!.push({ index: '/home' })
        await router!.push({ index: '/about' })
        await router!.push({ index: '/user/1' })
        router!.go(-2)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/home')
        router!.go(2)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/user/1')
      })

      it('push 后 replace 应该正确维护历史栈', async () => {
        await router!.push({ index: '/home' })
        await router!.replace({ index: '/about' })
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
      })

      it('go 到边界外应该保持在边界', async () => {
        router!.go(-10)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
        router!.go(10)
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
      })
    })

    describe('并发导航', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('并发 push 应该正确处理', async () => {
        const [result1, result2] = await Promise.all([
          router!.push({ index: '/home' }),
          router!.push({ index: '/about' })
        ])
        expect([result1.state, result2.state]).toContain(1)
      })
    })

    describe('动态路由', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('动态路由参数应该正确传递', async () => {
        await router!.push({ index: '/user/123' })
        expect(router!.route.params.id).toBe('123')
        await router!.push({ index: '/user/456' })
        expect(router!.route.params.id).toBe('456')
      })

      it('动态路由历史应该正确工作', async () => {
        await router!.push({ index: '/user/123' })
        await router!.push({ index: '/user/456' })
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.params.id).toBe('123')
      })
    })

    describe('查询参数和 hash', () => {
      beforeEach(async () => {
        router = createTestRouter()
        await router.isReady()
      })

      it('查询参数应该正确保存', async () => {
        await router!.push({ index: '/home', query: { a: '1', b: '2' } })
        expect(router!.route.query.a).toBe('1')
        expect(router!.route.query.b).toBe('2')
      })

      it('hash 应该正确保存', async () => {
        await router!.push({ index: '/home', hash: '#section' })
        expect(router!.route.hash).toBe('#section')
      })

      it('查询参数和 hash 应该在历史中正确保存', async () => {
        await router!.push({ index: '/home', query: { a: '1' }, hash: '#section' })
        await router!.push({ index: '/about' })
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.query.a).toBe('1')
      })
    })

    describe('首次导航', () => {
      it('首次 replace 应该正确工作', async () => {
        const routes: Route[] = [{ path: '/', component: createMockComponent() }]
        router = new MemoryRouter({ routes })
        await router.replace({ index: '/' })
        expect(router.route.path).toBe('/')
      })

      it('首次 push 应该正确工作', async () => {
        const routes: Route[] = [{ path: '/', component: createMockComponent() }]
        router = new MemoryRouter({ routes })
        await router.push({ index: '/' })
        expect(router.route.path).toBe('/')
      })
    })

    describe('边界情况', () => {
      it('空历史记录时 go 应该不报错', async () => {
        const routes: Route[] = [{ path: '/', component: createMockComponent() }]
        router = new MemoryRouter({ routes })
        await router.replace({ index: '/' })
        expect(() => router!.go(-1)).not.toThrow()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
      })

      it('单条历史记录时 back 应该保持在当前', async () => {
        router = createTestRouter()
        await router.isReady()
        router!.back()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(router!.route.path).toBe('/')
      })
    })
  })
})
