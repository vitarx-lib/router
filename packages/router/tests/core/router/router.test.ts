import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { App } from 'vitarx'
import { __ROUTER_KEY__, NavState } from '../../../src/core/common/constant.js'
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

describe('router/router', () => {
  let router: MemoryRouter | null = null

  afterEach(() => {
    if (router) {
      router.destroy()
      router = null
    }
  })

  describe('createRouter', () => {
    it('应该正确创建内存路由器', () => {
      router = createTestRouter()
      expect(router).toBeInstanceOf(MemoryRouter)
    })

    it('应该正确初始化路由状态', async () => {
      router = createTestRouter()
      await router.isReady()
      expect(router.currentRoute.path).toBe('/')
    })
  })

  describe('currentRoute', () => {
    it('应该返回只读的路由位置对象', async () => {
      router = createTestRouter()
      await router.isReady()
      expect(router.currentRoute).toBeDefined()
      expect(router.currentRoute.path).toBe('/')
    })

    it('路由位置对象应该是响应式的', async () => {
      router = createTestRouter()
      await router.isReady()
      const initialPath = router.currentRoute.path
      await router.push({ index: '/home' })
      expect(router.currentRoute.path).not.toBe(initialPath)
      expect(router.currentRoute.path).toBe('/home')
    })
  })

  describe('push', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确导航到新路由', async () => {
      const result = await router!.push({ index: '/home' })
      expect(result.state).toBe(NavState.success)
      expect(result.to?.path).toBe('/home')
      expect(result.from.path).toBe('/')
    })

    it('应该正确处理重复导航', async () => {
      await router!.push({ index: '/home' })
      const result = await router!.push({ index: '/home' })
      expect(result.state).toBe(NavState.duplicated)
    })

    it('应该正确处理未匹配的路由', async () => {
      const result = await router!.push({ index: '/nonexistent' })
      expect(result.state).toBe(NavState.notfound)
    })

    it('应该正确处理动态路由参数', async () => {
      const result = await router!.push({ index: '/user/123' })
      expect(result.state).toBe(NavState.success)
      expect(router!.currentRoute.params.id).toBe('123')
    })

    it('应该正确处理查询参数', async () => {
      const result = await router!.push({ index: '/home', query: { search: 'test' } })
      expect(result.state).toBe(NavState.success)
      expect(router!.currentRoute.query.search).toBe('test')
    })

    it('应该正确处理 hash', async () => {
      const result = await router!.push({ index: '/home', hash: '#section' })
      expect(result.state).toBe(NavState.success)
      expect(router!.currentRoute.hash).toBe('#section')
    })
  })

  describe('replace', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确替换当前路由', async () => {
      const result = await router!.replace({ index: '/home' })
      expect(result.state).toBe(NavState.success)
      expect(router!.currentRoute.path).toBe('/home')
    })
  })

  describe('go/back/forward', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确后退导航', async () => {
      await router!.push({ index: '/home' })
      await router!.push({ index: '/about' })
      router!.go(-1)
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(router!.currentRoute.path).toBe('/home')
    })

    it('应该正确前进导航', async () => {
      await router!.push({ index: '/home' })
      await router!.push({ index: '/about' })
      router!.go(-1)
      await new Promise(resolve => setTimeout(resolve, 10))
      router!.go(1)
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(router!.currentRoute.path).toBe('/about')
    })

    it('back 方法应该等同于 go(-1)', async () => {
      await router!.push({ index: '/home' })
      await router!.push({ index: '/about' })
      router!.back()
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(router!.currentRoute.path).toBe('/home')
    })

    it('forward 方法应该等同于 go(1)', async () => {
      await router!.push({ index: '/home' })
      await router!.push({ index: '/about' })
      router!.go(-1)
      await new Promise(resolve => setTimeout(resolve, 10))
      router!.forward()
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(router!.currentRoute.path).toBe('/about')
    })
  })

  describe('导航守卫', () => {
    it('应该正确调用 beforeEach 守卫', async () => {
      const beforeEach = vi.fn()
      router = createTestRouter({ beforeEach })
      await router.isReady()
      await router.push({ index: '/home' })
      expect(beforeEach).toHaveBeenCalled()
    })

    it('beforeEach 返回 false 应该阻止导航', async () => {
      let callCount = 0
      const beforeEach = vi.fn(() => {
        callCount++
        return callCount <= 1
      })
      router = createTestRouter({ beforeEach })
      await router.isReady()
      const result = await router.push({ index: '/home' })
      expect(result.state).toBe(NavState.aborted)
    })

    it('beforeEach 返回重定向应该导航到新目标', async () => {
      const beforeEach = vi.fn(to => {
        if (to.path === '/home') {
          return { index: '/about' }
        }
        return true
      })
      router = createTestRouter({ beforeEach })
      await router.isReady()
      const result = await router.push({ index: '/home' })
      expect(result.state).toBe(NavState.success)
      expect(router.currentRoute.path).toBe('/about')
    })

    it('应该正确调用 afterEach 守卫', async () => {
      const afterEach = vi.fn()
      router = createTestRouter({ afterEach })
      await router.isReady()
      await router.push({ index: '/home' })
      expect(afterEach).toHaveBeenCalled()
    })
  })

  describe('重定向', () => {
    it('应该正确处理路由重定向', async () => {
      router = createTestRouter({
        routes: [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
          {
            path: '/old',
            redirect: { index: '/new' },
            component: { default: createMockComponent() },
            props: { default: {} }
          },
          { path: '/new', component: { default: createMockComponent() }, props: { default: {} } }
        ]
      })
      await router.isReady()
      const result = await router.push({ index: '/old' })
      expect(result.state).toBe(NavState.success)
      expect(router.currentRoute.path).toBe('/new')
    })

    it('应该检测到无限重定向循环并抛出错误', async () => {
      router = createTestRouter({
        routes: [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
          {
            path: '/loop-a',
            redirect: { index: '/loop-b' },
            component: { default: createMockComponent() },
            props: { default: {} }
          },
          {
            path: '/loop-b',
            redirect: { index: '/loop-a' },
            component: { default: createMockComponent() },
            props: { default: {} }
          }
        ]
      })
      await router.isReady()
      await expect(router.push({ index: '/loop-a' })).rejects.toThrow(
        'Detected infinite redirect loop'
      )
    })

    it('应该检测到守卫导致的无限重定向循环', async () => {
      const beforeEach = vi.fn(to => {
        if (to.path === '/about') {
          return { index: '/home' }
        }
        if (to.path === '/home') {
          return { index: '/about' }
        }
        return true
      })
      router = createTestRouter({ beforeEach })
      await router.isReady()
      try {
        await router.push({ index: '/home' })
        expect.fail('应该抛出无限重定向错误')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Detected infinite redirect loop')
      }
    })
  })

  describe('并发导航处理', () => {
    it('应该正确处理并发导航请求', async () => {
      router = createTestRouter()
      await router.isReady()
      const [result1, result2] = await Promise.all([
        router.push({ index: '/home' }),
        router.push({ index: '/about' })
      ])
      const states = [result1.state, result2.state].sort()
      expect(states).toContain(NavState.success)
      expect(states).toContain(NavState.cancelled)
    })
  })

  describe('addRoute/removeRoute', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确添加路由', async () => {
      router!.addRoute({
        path: '/new',
        component: { default: createMockComponent() },
        props: { default: {} }
      })
      const result = await router!.push({ index: '/new' })
      expect(result.state).toBe(NavState.success)
    })

    it('应该正确移除路由', async () => {
      await router!.push({ index: '/home' })
      router!.removeRoute('/home')
      const result = await router!.push({ index: '/home' })
      expect(result.state).toBe(NavState.notfound)
    })
  })

  describe('isReady', () => {
    it('应该在导航完成后 resolve', async () => {
      router = createTestRouter()
      await expect(router.isReady()).resolves.toBeUndefined()
    })

    it('应该在没有初始化时 reject', async () => {
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } }
      ]
      router = new MemoryRouter({ routes })
      await expect(router.isReady()).rejects.toThrow('Router is not initialized')
    })
  })

  describe('destroy', () => {
    it('应该正确销毁路由器', async () => {
      router = createTestRouter()
      await router.isReady()
      router.destroy()
      expect(router.manager.routes.size).toBe(0)
    })
  })

  describe('buildUrl', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确构建 URL', () => {
      const url = router!.buildUrl('/home')
      expect(url).toBe('/home')
    })

    it('应该正确构建带查询参数的 URL', () => {
      const url = router!.buildUrl('/home', { search: 'test' })
      expect(url).toContain('/home')
      expect(url).toContain('search=test')
    })

    it('应该正确构建带 hash 的 URL', () => {
      const url = router!.buildUrl('/home', {}, '#section')
      expect(url).toContain('/home')
      expect(url).toContain('#section')
    })
  })

  describe('matchRoute', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确匹配路由', () => {
      const location = router!.matchRoute({ index: '/home' })
      expect(location).toBeDefined()
      expect(location?.path).toBe('/home')
    })

    it('应该正确匹配动态路由', () => {
      const location = router!.matchRoute({ index: '/user/123' })
      expect(location).toBeDefined()
      expect(location?.params.id).toBe('123')
    })

    it('应该对不匹配的路由返回 null', () => {
      const location = router!.matchRoute({ index: '/nonexistent' })
      expect(location).toBeNull()
    })
  })

  describe('hasRoute', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该返回 true 对于存在的路由', () => {
      expect(router!.hasRoute('/')).toBe(true)
      expect(router!.hasRoute('/home')).toBe(true)
      expect(router!.hasRoute('/about')).toBe(true)
    })

    it('应该返回 true 对于存在的命名路由', () => {
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
        { path: '/home', name: 'home', component: { default: createMockComponent() }, props: { default: {} } }
      ]
      router = createTestRouter({ routes })
      expect(router.hasRoute('home')).toBe(true)
    })

    it('应该返回 false 对于不存在的路由', () => {
      expect(router!.hasRoute('/nonexistent')).toBe(false)
      expect(router!.hasRoute('nonexistent')).toBe(false)
    })
  })

  describe('install', () => {
    it('应该正确安装路由器到应用', async () => {
      router = createTestRouter()
      await router.isReady()
      const app = {
        provide: vi.fn()
      } as unknown as App
      router.install(app)
      expect(app.provide).toHaveBeenCalledWith(__ROUTER_KEY__, router)
    })
  })
})
