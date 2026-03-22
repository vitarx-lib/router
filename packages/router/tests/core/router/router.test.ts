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

  describe('routes 属性', () => {
    it('应该返回所有注册的路由记录', async () => {
      router = createTestRouter()
      await router.isReady()
      expect(router.routes.length).toBeGreaterThan(0)
    })
  })

  describe('beforeEach/afterEach 方法', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('beforeEach 应该添加守卫', async () => {
      const guard = vi.fn()
      router!.beforeEach(guard)
      await router!.push({ index: '/home' })
      expect(guard).toHaveBeenCalled()
    })

    it('afterEach 应该添加回调', async () => {
      const callback = vi.fn()
      router!.afterEach(callback)
      await router!.push({ index: '/home' })
      expect(callback).toHaveBeenCalled()
    })
  })

  describe('buildUrl - 高级测试', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确处理 suffix 配置', async () => {
      router!.destroy()
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
        { path: '/home', component: { default: createMockComponent() }, props: { default: {} } }
      ]
      router = createTestRouter({ routes, suffix: '.html' })
      await router.isReady()
      const url = router!.buildUrl('/home')
      expect(url).toContain('.html')
    })

    it('应该正确处理 hash 模式', async () => {
      router!.destroy()
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } }
      ]
      router = createTestRouter({ routes, mode: 'hash', base: '/app' })
      await router.isReady()
      const url = router!.buildUrl('/home')
      expect(url).toContain('/#')
    })

    it('应该正确处理 base 配置', async () => {
      router!.destroy()
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } }
      ]
      router = createTestRouter({ routes, base: '/app' })
      await router.isReady()
      const url = router!.buildUrl('/home')
      expect(url).toContain('/app')
    })

    it('应该正确处理空 hash', () => {
      const url = router!.buildUrl('/home', {}, '')
      expect(url).toBe('/home')
    })

    it('应该正确处理不带 # 前缀的 hash', () => {
      const url = router!.buildUrl('/home', {}, 'section' as any)
      expect(url).toBe('/home')
    })

    it('应该正确处理单个 # 的 hash', () => {
      const url = router!.buildUrl('/home', {}, '#' as any)
      expect(url).toBe('/home')
    })
  })

  describe('matchRoute - 高级测试', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确处理带查询参数的匹配', () => {
      const location = router!.matchRoute({ index: '/home', query: { a: '1' } })
      expect(location?.query).toEqual({ a: '1' })
    })

    it('应该正确处理带 hash 的匹配', () => {
      const location = router!.matchRoute({ index: '/home', hash: '#section' })
      expect(location?.hash).toBe('#section')
    })

    it('应该正确处理命名路由匹配', () => {
      router!.destroy()
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
        { path: '/user/{id}', name: 'user', component: { default: createMockComponent() }, props: { default: true } }
      ]
      router = createTestRouter({ routes })
      const location = router!.matchRoute({ index: 'user', params: { id: '123' } })
      expect(location?.path).toBe('/user/123')
      expect(location?.params.id).toBe('123')
    })

    it('应该正确处理 missing 组件', () => {
      router!.destroy()
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } }
      ]
      const missingComponent = createMockComponent()
      router = createTestRouter({ routes, missing: missingComponent })
      const location = router!.matchRoute({ index: '/nonexistent' })
      expect(location).toBeDefined()
      expect(location?.path).toBe('/nonexistent')
    })

    it('应该正确处理 redirectFrom', () => {
      router!.destroy()
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
        { path: '/home', component: { default: createMockComponent() }, props: { default: {} } }
      ]
      router = createTestRouter({ routes })
      const redirectFrom = { path: '/old' } as any
      const location = router!.matchRoute({ index: '/home' }, redirectFrom)
      expect(location?.redirectFrom).toBe(redirectFrom)
    })
  })

  describe('resolveComponents', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该正确解析组件', async () => {
      await router!.push({ index: '/home' })
      await expect(router!.resolveComponents()).resolves.toBeUndefined()
    })

    it('应该正确处理空 matched', async () => {
      router!.destroy()
      const routes: Route[] = [
        { path: '/', component: { default: createMockComponent() }, props: { default: {} } }
      ]
      router = createTestRouter({ routes })
      await router.isReady()
      await expect(router!.resolveComponents()).resolves.toBeUndefined()
    })
  })

  describe('waitViewRender', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('应该等待视图渲染完成', async () => {
      await router!.waitViewRender()
    })

    it('应该等待导航结果', async () => {
      const navPromise = router!.push({ index: '/home' })
      await router!.waitViewRender(navPromise)
      expect(router!.currentRoute.path).toBe('/home')
    })
  })

  describe('错误处理', () => {
    it('onNotFound 回调应该正确工作', async () => {
      const onNotFound = vi.fn()
      router = createTestRouter({ onNotFound })
      await router.isReady()
      await router.push({ index: '/nonexistent' })
      expect(onNotFound).toHaveBeenCalled()
    })

    it('onNotFound 返回重定向目标应该正确导航', async () => {
      const onNotFound = vi.fn().mockReturnValue({ index: '/home' })
      router = createTestRouter({ onNotFound })
      await router.isReady()
      const result = await router.push({ index: '/nonexistent' })
      expect(result.state).toBe(NavState.success)
      expect(router.currentRoute.path).toBe('/home')
    })

    it('onNotFound 返回字符串应该正确导航', async () => {
      const onNotFound = vi.fn().mockReturnValue('/home')
      router = createTestRouter({ onNotFound })
      await router.isReady()
      const result = await router.push({ index: '/nonexistent' })
      expect(result.state).toBe(NavState.success)
      expect(router.currentRoute.path).toBe('/home')
    })
  })

  describe('路由独享守卫 beforeEnter', () => {
    it('函数形式的 beforeEnter 应该正确执行', async () => {
      const beforeEnter = vi.fn().mockReturnValue(true)
      router = createTestRouter({
        routes: [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
          { path: '/home', component: { default: createMockComponent() }, props: { default: {} }, beforeEnter }
        ]
      })
      await router.isReady()
      await router.push({ index: '/home' })
      expect(beforeEnter).toHaveBeenCalled()
    })

    it('数组形式的 beforeEnter 应该正确执行', async () => {
      const guard1 = vi.fn().mockReturnValue(true)
      const guard2 = vi.fn().mockReturnValue(true)
      router = createTestRouter({
        routes: [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
          { path: '/home', component: { default: createMockComponent() }, props: { default: {} }, beforeEnter: [guard1, guard2] as any }
        ]
      })
      await router.isReady()
      await router.push({ index: '/home' })
      expect(guard1).toHaveBeenCalled()
      expect(guard2).toHaveBeenCalled()
    })

    it('beforeEnter 返回 false 应该阻止导航', async () => {
      const beforeEnter = vi.fn().mockReturnValue(false)
      router = createTestRouter({
        routes: [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
          { path: '/home', component: { default: createMockComponent() }, props: { default: {} }, beforeEnter }
        ]
      })
      await router.isReady()
      const result = await router.push({ index: '/home' })
      expect(result.state).toBe(NavState.aborted)
    })

    it('beforeEnter 返回重定向应该正确导航', async () => {
      const beforeEnter = vi.fn().mockReturnValue({ index: '/about' })
      router = createTestRouter({
        routes: [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
          { path: '/home', component: { default: createMockComponent() }, props: { default: {} }, beforeEnter },
          { path: '/about', component: { default: createMockComponent() }, props: { default: {} } }
        ]
      })
      await router.isReady()
      const result = await router.push({ index: '/home' })
      expect(result.state).toBe(NavState.success)
      expect(router.currentRoute.path).toBe('/about')
    })
  })

  describe('重定向 - 高级测试', () => {
    it('函数重定向应该正确工作', async () => {
      const redirectFn = vi.fn().mockReturnValue('/new')
      router = createTestRouter({
        routes: [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
          { path: '/old', redirect: redirectFn, component: { default: createMockComponent() }, props: { default: {} } },
          { path: '/new', component: { default: createMockComponent() }, props: { default: {} } }
        ]
      })
      await router.isReady()
      const result = await router.push({ index: '/old' })
      expect(result.state).toBe(NavState.success)
      expect(router.currentRoute.path).toBe('/new')
      expect(redirectFn).toHaveBeenCalled()
    })

    it('字符串重定向应该正确工作', async () => {
      router = createTestRouter({
        routes: [
          { path: '/', component: { default: createMockComponent() }, props: { default: {} } },
          { path: '/old', redirect: '/new', component: { default: createMockComponent() }, props: { default: {} } },
          { path: '/new', component: { default: createMockComponent() }, props: { default: {} } }
        ]
      })
      await router.isReady()
      const result = await router.push({ index: '/old' })
      expect(result.state).toBe(NavState.success)
      expect(router.currentRoute.path).toBe('/new')
    })
  })

  describe('嵌套路由', () => {
    it('应该正确处理嵌套路由', async () => {
      router = createTestRouter({
        routes: [
          {
            path: '/parent',
            component: { default: createMockComponent() },
            props: { default: {} },
            children: [
              { path: 'child', component: { default: createMockComponent() }, props: { default: {} } }
            ]
          }
        ]
      })
      await router.isReady()
      const result = await router.push({ index: '/parent/child' })
      expect(result.state).toBe(NavState.success)
      expect(router.currentRoute.matched.length).toBe(2)
    })

    it('应该正确合并 meta', async () => {
      router = createTestRouter({
        routes: [
          {
            path: '/parent',
            component: { default: createMockComponent() },
            props: { default: {} },
            meta: { auth: true },
            children: [
              { path: 'child', component: { default: createMockComponent() }, props: { default: {} }, meta: { title: 'Child' } }
            ]
          }
        ]
      })
      await router.isReady()
      await router.push({ index: '/parent/child' })
      expect(router.currentRoute.meta).toHaveProperty('auth')
      expect(router.currentRoute.meta).toHaveProperty('title')
    })
  })

  describe('hash 变化', () => {
    beforeEach(async () => {
      router = createTestRouter()
      await router.isReady()
    })

    it('仅 hash 变化应该成功', async () => {
      await router!.push({ index: '/home' })
      const result = await router!.push({ index: '/home', hash: '#section' })
      expect(result.state).toBe(NavState.success)
    })
  })

  describe('配置验证', () => {
    it('无效的 mode 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          mode: 'invalid' as any
        })
      }).toThrow(/mode.*must be one of/)
    })

    it('无效的 base 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          base: 'invalid' as any
        })
      }).toThrow(/base.*must start with a slash/)
    })

    it('非字符串 base 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          base: 123 as any
        })
      }).toThrow(/base.*must be a string/)
    })

    it('无效的 suffix 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          suffix: 'invalid' as any
        })
      }).toThrow(/suffix.*must start with a dot/)
    })

    it('只有点号的 suffix 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          suffix: '.'
        })
      }).toThrow(/"suffix" cannot be just a dot/)
    })

    it('非字符串 suffix 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          suffix: 123 as any
        })
      }).toThrow(/suffix.*must be a string/)
    })

    it('无效的 props 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          props: 'invalid' as any
        })
      }).toThrow(/props.*must be a boolean or function/)
    })

    it('无效的 scrollBehavior 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          scrollBehavior: 'invalid' as any
        })
      }).toThrow(/scrollBehavior.*must be a function/)
    })

    it('无效的 beforeEach 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          beforeEach: 'invalid' as any
        })
      }).toThrow(/beforeEach.*must be a function or an array/)
    })

    it('数组中包含无效的 beforeEach 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          beforeEach: [vi.fn(), 'invalid' as any]
        })
      }).toThrow(/beforeEach.*must be a function/)
    })

    it('无效的 afterEach 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          afterEach: 'invalid' as any
        })
      }).toThrow(/afterEach.*must be a function or an array/)
    })

    it('无效的 onNotFound 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          onNotFound: 'invalid' as any
        })
      }).toThrow(/onNotFound.*must be a function or an array/)
    })

    it('无效的 onError 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          onError: 'invalid' as any
        })
      }).toThrow(/onError.*must be a function or an array/)
    })

    it('无效的 missing 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({
          routes: [{ path: '/', component: createMockComponent() }],
          missing: 'invalid' as any
        })
      }).toThrow(/missing.*must be a valid component/)
    })

    it('null options 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter(null as any)
      }).toThrow(/options must be an object/)
    })

    it('缺少 routes 应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({} as any)
      }).toThrow(/routes.*required/)
    })

    it('无效的 routes 类型应该抛出错误', () => {
      expect(() => {
        new MemoryRouter({ routes: 'invalid' as any })
      }).toThrow(/routes.*must be an array/)
    })
  })

  describe('数组形式的钩子', () => {
    it('数组形式的 beforeEach 应该正确执行', async () => {
      const guard1 = vi.fn().mockReturnValue(true)
      const guard2 = vi.fn().mockReturnValue(true)
      router = createTestRouter({ beforeEach: [guard1, guard2] })
      await router.isReady()
      await router.push({ index: '/home' })
      expect(guard1).toHaveBeenCalled()
      expect(guard2).toHaveBeenCalled()
    })

    it('数组形式的 afterEach 应该正确执行', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      router = createTestRouter({ afterEach: [callback1, callback2] })
      await router.isReady()
      await router.push({ index: '/home' })
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('数组形式的 onError 应该正确执行', async () => {
      const onError1 = vi.fn()
      const onError2 = vi.fn()
      router = createTestRouter({ onError: [onError1, onError2] })
      await router.isReady()
      expect(typeof router.push).toBe('function')
    })

    it('数组形式的 onNotFound 应该正确执行', async () => {
      const onNotFound1 = vi.fn()
      const onNotFound2 = vi.fn()
      router = createTestRouter({ onNotFound: [onNotFound1, onNotFound2] })
      await router.isReady()
      await router.push({ index: '/nonexistent' })
      expect(onNotFound1).toHaveBeenCalled()
      expect(onNotFound2).toHaveBeenCalled()
    })
  })

  describe('RouteManager 作为 routes 参数', () => {
    it('应该接受 RouteManager 实例', async () => {
      const { RouteManager } = await import('../../../src/core/router/manager.js')
      const manager = new RouteManager([
        { path: '/', component: createMockComponent() }
      ])
      router = new MemoryRouter({ routes: manager })
      await router.replace({ index: '/' })
      expect(router.currentRoute.path).toBe('/')
    })
  })
})
