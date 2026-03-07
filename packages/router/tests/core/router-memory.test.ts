import { beforeEach, describe, expect, it, vi } from 'vitest'
import RouterMemory from '../../src/core/router-memory.js'
import type { Route, RouterOptions } from '../../src/index.js'
import { NavigateStatus } from '../../src/index.js'

function createMockComponent() {
  return vi.fn()
}

function createMemoryRouter(options?: Partial<RouterOptions<'memory'>>): RouterMemory {
  const defaultRoutes: Route[] = [
    { path: '/', component: createMockComponent() },
    { path: '/home', component: createMockComponent() },
    { path: '/about', component: createMockComponent() },
    { path: '/user/{id}', component: createMockComponent() }
  ]

  return new RouterMemory({
    mode: 'memory',
    routes: options?.routes || defaultRoutes,
    ...options
  }).initialize()
}

describe('RouterMemory', () => {
  let router: RouterMemory

  beforeEach(() => {
    router = createMemoryRouter()
  })

  describe('初始化', () => {
    it('应该正确初始化内存路由器', () => {
      expect(router.mode).toBe('memory')
      expect(router.route).toBeDefined()
    })

    it('应该正确设置初始路由状态', () => {
      expect(router.route.path).toBe('/')
    })
  })

  describe('push', () => {
    it('应该正确push到新路由', async () => {
      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.path).toBe('/home')
    })

    it('应该正确push带参数的路由', async () => {
      const result = await router.push({ index: '/user/123' })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.path).toBe('/user/123')
      expect(router.route.params.id).toBe('123')
    })

    it('应该正确push带查询参数的路由', async () => {
      const result = await router.push({
        index: '/home',
        query: { search: 'test' }
      })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.query.search).toBe('test')
    })

    it('应该正确push带hash的路由', async () => {
      const result = await router.push({
        index: '/home',
        hash: '#section'
      })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.hash).toBe('#section')
    })

    it('应该在push到相同路由时返回duplicated状态', async () => {
      await router.push({ index: '/home' })
      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.duplicated)
    })

    it('应该在push到未匹配路由时返回not_matched状态', async () => {
      const result = await router.push({ index: '/nonexistent' })

      expect(result.status).toBe(NavigateStatus.not_matched)
    })
  })

  describe('replace', () => {
    it('应该正确replace当前路由', async () => {
      await router.push({ index: '/home' })
      const result = await router.replace({ index: '/about' })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.path).toBe('/about')
    })

    it('replace应该保持历史记录长度不变', async () => {
      await router.push({ index: '/home' })
      const historyLengthBefore = (router as any)._history.length

      await router.replace({ index: '/about' })
      const historyLengthAfter = (router as any)._history.length

      expect(historyLengthAfter).toBe(historyLengthBefore)
    })
  })

  describe('go', () => {
    it('应该正确前进导航', async () => {
      await router.push({ index: '/home' })
      await router.push({ index: '/about' })

      router.go(-1)
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(router.route.path).toBe('/home')
    })

    it('应该正确后退导航', async () => {
      await router.push({ index: '/home' })
      await router.push({ index: '/about' })

      router.go(-1)
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(router.route.path).toBe('/home')
    })

    it('应该正确处理边界情况（超出历史范围）', async () => {
      await router.push({ index: '/home' })

      router.go(-10)
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(router.route.path).toBe('/home')
    })

    it('应该正确处理delta为0的情况', async () => {
      const pathBefore = router.route.path

      router.go(0)
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(router.route.path).toBe(pathBefore)
    })

    it('应该正确处理delta为undefined的情况', async () => {
      const pathBefore = router.route.path

      router.go(undefined)
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(router.route.path).toBe(pathBefore)
    })
  })

  describe('back', () => {
    it('应该正确后退一步', async () => {
      await router.push({ index: '/home' })
      await router.push({ index: '/about' })

      router.back()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(router.route.path).toBe('/home')
    })
  })

  describe('forward', () => {
    it('应该正确前进一步', async () => {
      await router.push({ index: '/home' })
      await router.push({ index: '/about' })

      router.go(-1)
      await new Promise(resolve => setTimeout(resolve, 10))

      router.forward()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(router.route.path).toBe('/about')
    })
  })

  describe('历史记录管理', () => {
    it('应该正确维护历史记录', async () => {
      await router.push({ index: '/home' })
      await router.push({ index: '/about' })

      const history = (router as any)._history
      expect(history.length).toBe(3)
    })

    it('push应该清除后续历史记录', async () => {
      await router.push({ index: '/home' })
      await router.push({ index: '/about' })
      router.go(-1)
      await new Promise(resolve => setTimeout(resolve, 10))

      await router.push({ index: '/user/123' })

      const history = (router as any)._history
      expect(history.length).toBe(3)
      expect(history[2].path).toBe('/user/123')
    })
  })

  describe('导航守卫', () => {
    it('应该正确调用beforeEach守卫', async () => {
      const beforeEach = vi.fn()
      router = createMemoryRouter({ beforeEach })

      await router.push({ index: '/home' })

      expect(beforeEach).toHaveBeenCalled()
    })

    it('应该正确处理beforeEach返回false', async () => {
      const beforeEach = vi.fn(() => false)
      router = createMemoryRouter({ beforeEach })

      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.aborted)
    })

    it('应该正确处理beforeEach重定向', async () => {
      const beforeEach = vi.fn(() => ({ index: '/about' }))
      router = createMemoryRouter({ beforeEach })

      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.path).toBe('/about')
    })

    it('应该正确调用afterEach守卫', async () => {
      const afterEach = vi.fn()
      router = createMemoryRouter({ afterEach })

      await router.push({ index: '/home' })

      expect(afterEach).toHaveBeenCalled()
    })
  })

  describe('路由重定向', () => {
    it('应该正确处理路由重定向', async () => {
      router = createMemoryRouter({
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

    it('应该正确处理函数式重定向', async () => {
      router = createMemoryRouter({
        routes: [
          { path: '/', component: createMockComponent() },
          {
            path: '/old',
            redirect: () => ({ index: '/new' }),
            component: createMockComponent()
          },
          { path: '/new', component: createMockComponent() }
        ]
      })

      const result = await router.push({ index: '/old' })

      expect(router.route.path).toBe('/new')
    })
  })

  describe('missing组件', () => {
    it('应该正确处理missing组件', async () => {
      const missingComponent = createMockComponent()
      router = createMemoryRouter({
        missing: missingComponent
      })

      const result = await router.push({ index: '/nonexistent' })

      expect(result.status).toBe(NavigateStatus.not_matched)
      expect(router.missing).toBe(missingComponent)
    })
  })

  describe('updateQuery', () => {
    it('应该正确更新查询参数', async () => {
      await router.push({ index: '/home' })
      router.updateQuery({ search: 'test' })

      expect(router.route.query.search).toBe('test')
      expect(router.route.fullPath).toContain('search=test')
    })
  })

  describe('updateHash', () => {
    it('应该正确更新hash', async () => {
      await router.push({ index: '/home' })
      router.updateHash('#section')

      expect(router.route.hash).toBe('#section')
      expect(router.route.fullPath).toContain('#section')
    })

    it('应该在hash类型无效时抛出错误', () => {
      expect(() => {
        router.updateHash(123 as any)
      }).toThrow('[Router] updateHash() expects a string value, but received number')
    })
  })
})
