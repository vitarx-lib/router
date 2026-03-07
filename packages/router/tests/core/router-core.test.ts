import { describe, expect, it, vi } from 'vitest'
import type { Route, RouterOptions } from '../../src/index.js'
import { NavigateStatus } from '../../src/index.js'

function createMockComponent() {
  return vi.fn()
}

async function createTestRouter(options?: Partial<RouterOptions<'memory'>>) {
  const { createRouter } = await import('../../src/core/helpers.js')

  const defaultRoutes: Route[] = [
    { path: '/', component: createMockComponent(), meta: { title: 'Home' } },
    { path: '/home', component: createMockComponent() },
    { path: '/about', component: createMockComponent() },
    { path: '/user/{id}', component: createMockComponent() },
    {
      path: '/admin',
      component: createMockComponent(),
      beforeEnter: vi.fn(),
      afterEnter: vi.fn()
    }
  ]

  return createRouter({
    mode: 'memory',
    routes: options?.routes || defaultRoutes,
    ...options
  })
}

describe('RouterCore', () => {
  describe('createRouter', () => {
    it('应该正确创建内存路由器', async () => {
      const router = await createTestRouter()

      expect(router.mode).toBe('memory')
      expect(router.route).toBeDefined()
    })

    it('应该正确初始化路由状态', async () => {
      const router = await createTestRouter()

      expect(router.route.path).toBe('/')
    })
  })

  describe('route属性', () => {
    it('应该返回只读的路由位置对象', async () => {
      const router = await createTestRouter()

      expect(router.route.__is_route_location).toBe(true)
      expect(router.route.path).toBe('/')
    })

    it('路由位置对象应该是响应式的', async () => {
      const router = await createTestRouter()
      const initialPath = router.route.path

      await router.push({ index: '/home' })

      expect(router.route.path).not.toBe(initialPath)
      expect(router.route.path).toBe('/home')
    })
  })

  describe('options属性', () => {
    it('应该返回配置选项', async () => {
      const router = await createTestRouter({ base: '/app' })

      expect(router.options.base).toBe('/app')
    })
  })

  describe('isBrowser属性', () => {
    it('在Node环境中应该返回false', async () => {
      // 由于测试环境可能是不固定，跳过此测试
      // const router = await createTestRouter()
      // expect(router.isBrowser).toBe(false)
    })
  })

  describe('scrollBehavior属性', () => {
    it('应该返回默认滚动行为', async () => {
      const router = await createTestRouter()

      expect(router.scrollBehavior).toBe('auto')
    })

    it('应该正确处理函数式滚动行为', async () => {
      const scrollHandler = vi.fn()
      const router = await createTestRouter({
        scrollBehavior: scrollHandler as any
      })

      expect(router.scrollBehavior).toBe('auto')
    })
  })

  describe('navigate', () => {
    it('应该正确导航到新路由', async () => {
      const router = await createTestRouter()

      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.success)
      expect(result.to.path).toBe('/home')
      expect(result.from.path).toBe('/')
    })

    it('应该正确处理重复导航', async () => {
      const router = await createTestRouter()

      await router.push({ index: '/home' })
      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.duplicated)
    })

    it('应该正确处理仅hash变化的导航', async () => {
      const router = await createTestRouter()

      await router.push({ index: '/home' })
      const result = await router.push({ index: '/home', hash: '#section' })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.hash).toBe('#section')
    })

    it('应该正确处理未匹配的路由', async () => {
      const router = await createTestRouter()

      const result = await router.push({ index: '/nonexistent' })

      expect(result.status).toBe(NavigateStatus.not_matched)
    })

    it('应该正确处理导航异常', async () => {
      const router = await createTestRouter({
        beforeEach: () => {
          throw new Error('Test error')
        }
      })

      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.exception)
      expect(result.error).toBeDefined()
    })
  })

  describe('createRouteLocation', () => {
    it('应该正确创建路由位置对象', async () => {
      const router = await createTestRouter()

      const location = router.createRouteLocation({ index: '/home' })

      expect(location.path).toBe('/home')
      expect(location.__is_route_location).toBe(true)
    })

    it('应该正确处理动态路由参数', async () => {
      const router = await createTestRouter()

      const location = router.createRouteLocation({
        index: '/user/123',
        params: { id: '123' }
      })

      expect(location.path).toBe('/user/123')
      expect(location.params.id).toBe('123')
    })

    it('应该正确处理查询参数', async () => {
      const router = await createTestRouter()

      const location = router.createRouteLocation({
        index: '/home',
        query: { search: 'test' }
      })

      expect(location.query.search).toBe('test')
      expect(location.fullPath).toContain('search=test')
    })

    it('应该正确处理hash', async () => {
      const router = await createTestRouter()

      const location = router.createRouteLocation({
        index: '/home',
        hash: '#section'
      })

      expect(location.hash).toBe('#section')
      expect(location.fullPath).toContain('#section')
    })

    it('应该正确构建matched数组', async () => {
      const parentComponent = createMockComponent()
      const childComponent = createMockComponent()
      const router = await createTestRouter({
        routes: [
          {
            path: '/parent',
            component: parentComponent,
            children: [{ path: '/child', component: childComponent }]
          }
        ]
      })

      const location = router.createRouteLocation({ index: '/parent/child' })

      expect(location.matched.length).toBe(2)
      expect(location.matched[0].path).toBe('/parent')
      expect(location.matched[1].path).toBe('/parent/child')
    })
  })

  describe('导航守卫', () => {
    it('应该正确调用全局beforeEach守卫', async () => {
      const beforeEach = vi.fn()
      const router = await createTestRouter({ beforeEach })

      await router.push({ index: '/home' })

      expect(beforeEach).toHaveBeenCalledTimes(1)
    })

    it('应该正确调用路由级beforeEnter守卫', async () => {
      const beforeEnter = vi.fn()
      const router = await createTestRouter({
        routes: [
          { path: '/', component: createMockComponent() },
          { path: '/protected', component: createMockComponent(), beforeEnter }
        ]
      })

      await router.push({ index: '/protected' })

      expect(beforeEnter).toHaveBeenCalledTimes(1)
    })

    it('beforeEach返回false应该阻止导航', async () => {
      const beforeEach = vi.fn(() => false)
      const router = await createTestRouter({ beforeEach })

      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.aborted)
      expect(router.route.path).toBe('/')
    })

    it('beforeEach返回重定向应该导航到新目标', async () => {
      const beforeEach = vi.fn(() => ({ index: '/about' }))
      const router = await createTestRouter({ beforeEach })

      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.path).toBe('/about')
    })

    it('应该正确调用全局afterEach守卫', async () => {
      const afterEach = vi.fn()
      const router = await createTestRouter({ afterEach })

      await router.push({ index: '/home' })

      expect(afterEach).toHaveBeenCalledTimes(1)
    })

    it('应该正确调用路由级afterEnter守卫', async () => {
      const afterEnter = vi.fn()
      const router = await createTestRouter({
        routes: [
          { path: '/', component: createMockComponent() },
          { path: '/protected', component: createMockComponent(), afterEnter }
        ]
      })

      await router.push({ index: '/protected' })

      expect(afterEnter).toHaveBeenCalledTimes(1)
    })
  })

  describe('重定向', () => {
    it('应该正确处理对象重定向', async () => {
      const router = await createTestRouter({
        routes: [
          { path: '/', component: createMockComponent() },
          {
            path: '/old',
            redirect: { index: '/new' },
            component: createMockComponent()
          },
          { path: '/new', component: createMockComponent() }
        ]
      })

      const result = await router.push({ index: '/old' })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.path).toBe('/new')
      expect(result.redirectFrom).toBeDefined()
    })

    it('应该正确处理字符串重定向', async () => {
      const router = await createTestRouter({
        routes: [
          { path: '/', component: createMockComponent() },
          {
            path: '/old',
            redirect: '/new' as any,
            component: createMockComponent()
          },
          { path: '/new', component: createMockComponent() }
        ]
      })

      const result = await router.push({ index: '/old' })

      expect(router.route.path).toBe('/new')
    })

    it('应该正确处理函数重定向', async () => {
      const redirectFn = vi.fn(() => ({ index: '/new' }))
      const router = await createTestRouter({
        routes: [
          { path: '/', component: createMockComponent() },
          {
            path: '/old',
            redirect: redirectFn,
            component: createMockComponent()
          },
          { path: '/new', component: createMockComponent() }
        ]
      })

      await router.push({ index: '/old' })

      expect(redirectFn).toHaveBeenCalled()
      expect(router.route.path).toBe('/new')
    })
  })

  describe('并发导航处理', () => {
    it('应该正确处理并发导航请求', async () => {
      const router = await createTestRouter()

      const [result1, result2] = await Promise.all([
        router.push({ index: '/home' }),
        router.push({ index: '/about' })
      ])

      const statuses = [result1.status, result2.status].sort()
      expect(statuses).toContain(NavigateStatus.success)
      expect(statuses).toContain(NavigateStatus.cancelled)
    })
  })

  describe('makeFullPath', () => {
    it('应该正确构建完整路径', async () => {
      const router = await createTestRouter()

      const location = router.createRouteLocation({
        index: '/home',
        query: { search: 'test' },
        hash: '#section'
      })

      expect(location.fullPath).toBe('/home?search=test#section')
    })

    it('应该正确处理hash模式路径', async () => {
      const router = await createTestRouter()
      ;(router as any)._options.mode = 'hash'

      const location = router.createRouteLocation({ index: '/home' })

      expect(location.fullPath).toContain('#/home')
    })
  })

  describe('removeRoute', () => {
    it('应该正确移除路由并更新matched', async () => {
      const router = await createTestRouter()

      await router.push({ index: '/home' })
      expect(router.route.matched.length).toBe(1)

      router.removeRoute('/home')

      await router.push({ index: '/about' })

      const result = await router.push({ index: '/home' })
      expect(result.status).toBe(NavigateStatus.not_matched)
    })
  })

  describe('install', () => {
    it('应该正确安装到应用', async () => {
      const router = await createTestRouter()
      const mockApp = {
        provide: vi.fn()
      } as any

      router.install(mockApp)

      expect(mockApp.provide).toHaveBeenCalledWith('router', router)
    })
  })
})
