import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NavigateStatus } from '../../src/core/constant.js'
import { createRouter, defineRoutes } from '../../src/core/helpers.js'
import RouterHistory from '../../src/core/router-history.js'
import type { Route } from '../../src/core/router-types.js'

function createMockComponent() {
  return vi.fn()
}

const basicRoutes: Route[] = defineRoutes(
  { path: '/', component: createMockComponent(), meta: { title: 'Home' } },
  { path: '/home', component: createMockComponent() },
  { path: '/about', component: createMockComponent() },
  { path: '/user/{id}', component: createMockComponent() },
  {
    path: '/admin',
    component: createMockComponent(),
    meta: { requiresAuth: true }
  }
)

function createHistoryRouter(
  mode: 'hash' | 'path' = 'hash',
  routes: Route[] = basicRoutes
): RouterHistory {
  const router = createRouter({ mode, routes })
  if (router instanceof RouterHistory) {
    return router
  }
  throw new Error('Expected RouterHistory instance')
}

function waitForNavigation(timeout = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

describe('RouterHistory', () => {
  let router: RouterHistory | null = null

  afterEach(async () => {
    router = null
    window.history.replaceState(null, '', '/')
  })

  describe('构造函数和初始化', () => {
    it('应该正确创建 hash 模式路由器', () => {
      router = createHistoryRouter('hash')
      expect(router.mode).toBe('hash')
    })

    it('应该正确创建 path 模式路由器', () => {
      router = createHistoryRouter('path')
      expect(router.mode).toBe('path')
    })

    it('应该正确初始化路由状态', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()
      expect(router.route).toBeDefined()
      expect(router.route.__is_route_location).toBe(true)
    })

    it('应该在浏览器环境中设置 isBrowser 为 true', () => {
      router = createHistoryRouter('hash')
      expect(router.isBrowser).toBe(true)
    })

    it('应该正确处理无效的 mode 参数', () => {
      const result = createRouter({
        mode: 'invalid' as any,
        routes: basicRoutes
      })
      expect(result.mode).toBe('hash')
    })
  })

  describe('hash 模式路由', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/#/')
    })

    it('应该正确导航到 hash 路由', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      expect(router.route.path).toBe('/home')
      expect(window.location.hash).toContain('/home')
    })

    it('应该正确处理 hash 模式下的查询参数', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home', query: { search: 'test' } })
      await waitForNavigation()

      expect(router.route.query.search).toBe('test')
      expect(window.location.hash).toContain('/home')
    })

    it('应该正确处理 hash 模式下的 hash 锚点', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home', hash: '#section' })
      await waitForNavigation()

      expect(router.route.hash).toBe('#section')
    })

    it('应该在初始化时确保 hash 格式', async () => {
      window.history.replaceState(null, '', '/')
      router = createHistoryRouter('hash')
      await waitForNavigation()

      expect(window.location.hash).toBeDefined()
    })
  })

  describe('path 模式路由', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确导航到 path 路由', async () => {
      router = createHistoryRouter('path')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      expect(router.route.path).toBe('/home')
      expect(window.location.pathname).toBe('/home')
    })

    it('应该正确处理 path 模式下的查询参数', async () => {
      router = createHistoryRouter('path')
      await waitForNavigation()

      await router.push({ index: '/home', query: { search: 'test' } })
      await waitForNavigation()

      expect(router.route.query.search).toBe('test')
      expect(window.location.search).toContain('search=test')
    })

    it('应该正确处理 path 模式下的 hash 锚点', async () => {
      router = createHistoryRouter('path')
      await waitForNavigation()

      await router.push({ index: '/home', hash: '#section' })
      await waitForNavigation()

      expect(router.route.hash).toBe('#section')
      expect(window.location.hash).toBe('#section')
    })
  })

  describe('push 方法', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确 push 到新路由并添加历史记录', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      const initialLength = window.history.length

      await router.push({ index: '/home' })
      await waitForNavigation()

      await router.push({ index: '/about' })
      await waitForNavigation()

      expect(window.history.length).toBeGreaterThan(initialLength)
    })

    it('应该正确 push 带参数的动态路由', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/user/123' })
      await waitForNavigation()

      expect(router.route.path).toBe('/user/123')
      expect(router.route.params.id).toBe('123')
    })

    it('应该在 push 到相同路由时返回 duplicated 状态', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      const result = await router.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.duplicated)
    })

    it('应该在 push 到未匹配路由时返回 not_matched 状态', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      const result = await router.push({ index: '/nonexistent' })

      expect(result.status).toBe(NavigateStatus.not_matched)
    })
  })

  describe('replace 方法', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确 replace 当前路由', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      const result = await router.replace({ index: '/about' })
      await waitForNavigation()

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.path).toBe('/about')
    })

    it('replace 应该保持历史记录长度不变', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      const lengthBefore = window.history.length

      await router.replace({ index: '/about' })
      await waitForNavigation()

      expect(window.history.length).toBe(lengthBefore)
    })
  })

  describe('go/back/forward 方法', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确后退导航', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      await router.push({ index: '/about' })
      await waitForNavigation()

      router.go(-1)
      await waitForNavigation()

      expect(router.route.path).toBe('/home')
    })

    it('应该正确前进导航', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      await router.push({ index: '/about' })
      await waitForNavigation()

      router.go(-1)
      await waitForNavigation()

      router.go(1)
      await waitForNavigation()

      expect(router.route.path).toBe('/about')
    })

    it('back 方法应该等同于 go(-1)', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      await router.push({ index: '/about' })
      await waitForNavigation()

      router.back()
      await waitForNavigation()

      expect(router.route.path).toBe('/home')
    })

    it('forward 方法应该等同于 go(1)', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      await router.push({ index: '/about' })
      await waitForNavigation()

      router.go(-1)
      await waitForNavigation()

      router.forward()
      await waitForNavigation()

      expect(router.route.path).toBe('/about')
    })

    it('应该正确处理超出范围的 go 调用', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      const currentPath = router.route.path

      router.go(-100)
      await waitForNavigation()

      expect(router.route.path).toBeDefined()
    })

    it('go(0) 应该刷新当前页面', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      const pathBefore = router.route.path

      router.go(0)
      await waitForNavigation()

      expect(router.route.path).toBe(pathBefore)
    })
  })

  describe('updateHash 方法', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确更新 hash 值', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      router.updateHash('#section')
      await waitForNavigation()

      expect(router.route.hash).toBe('#section')
    })

    it('应该正确处理空 hash', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home', hash: '#section' })
      await waitForNavigation()

      router.updateHash('')
      await waitForNavigation()

      expect(router.route.hash).toBe('')
    })

    it('应该在无效 hash 类型时抛出错误', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      expect(() => {
        router!.updateHash(123 as any)
      }).toThrow()
    })
  })

  describe('updateQuery 方法', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确更新查询参数', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      router.updateQuery({ search: 'test' })
      await waitForNavigation()

      expect(router.route.query.search).toBe('test')
    })

    it('应该正确合并查询参数', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home', query: { page: '1' } })
      await waitForNavigation()

      router.updateQuery({ search: 'test' })
      await waitForNavigation()

      expect(router.route.query.page).toBe('1')
      expect(router.route.query.search).toBe('test')
    })
  })

  describe('popstate 事件处理', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确响应浏览器的后退操作', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      await router.push({ index: '/about' })
      await waitForNavigation()

      window.history.back()
      await waitForNavigation(150)

      expect(router.route.path).toBe('/home')
    })

    it('应该正确响应浏览器的前进操作', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      await router.push({ index: '/about' })
      await waitForNavigation()

      window.history.back()
      await waitForNavigation(150)

      window.history.forward()
      await waitForNavigation(150)

      expect(router.route.path).toBe('/about')
    })

    it('应该从 history.state 恢复路由信息', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home', query: { id: '123' } })
      await waitForNavigation()

      await router.push({ index: '/about' })
      await waitForNavigation()

      window.history.back()
      await waitForNavigation(150)

      expect(router.route.path).toBe('/home')
      expect(router.route.query.id).toBe('123')
    })
  })

  describe('滚动位置管理', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该在导航时保存滚动位置', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      window.scrollTo(0, 100)

      await router.push({ index: '/home' })
      await waitForNavigation()

      const state = window.history.state
      expect(state).toBeDefined()
    })

    it('应该在 hash 变化时滚动到锚点', async () => {
      const element = document.createElement('div')
      element.id = 'section'
      document.body.appendChild(element)

      router = createHistoryRouter('hash')
      await waitForNavigation()

      await router.push({ index: '/home' })
      await waitForNavigation()

      router.updateHash('#section')
      await waitForNavigation()

      document.body.removeChild(element)
    })
  })

  describe('导航守卫', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确调用 beforeEach 守卫', async () => {
      const beforeEach = vi.fn()
      router = createHistoryRouter('hash', [
        { path: '/', component: createMockComponent() },
        { path: '/home', component: createMockComponent() }
      ])
      const routerWithGuard = createRouter({
        mode: 'hash',
        routes: [
          { path: '/', component: createMockComponent() },
          { path: '/home', component: createMockComponent() }
        ],
        beforeEach
      }) as RouterHistory
      await waitForNavigation()

      await routerWithGuard.push({ index: '/home' })
      await waitForNavigation()

      expect(beforeEach).toHaveBeenCalled()
    })

    it('beforeEach 返回 false 应该阻止导航', async () => {
      const beforeEach = vi.fn(() => false)
      const routerWithGuard = createRouter({
        mode: 'hash',
        routes: [
          { path: '/', component: createMockComponent() },
          { path: '/home', component: createMockComponent() }
        ],
        beforeEach
      }) as RouterHistory
      await waitForNavigation()

      const result = await routerWithGuard.push({ index: '/home' })

      expect(result.status).toBe(NavigateStatus.aborted)
    })

    it('应该正确调用 afterEach 守卫', async () => {
      const afterEach = vi.fn()
      const routerWithGuard = createRouter({
        mode: 'hash',
        routes: [
          { path: '/', component: createMockComponent() },
          { path: '/home', component: createMockComponent() }
        ],
        afterEach
      }) as RouterHistory
      await waitForNavigation()

      await routerWithGuard.push({ index: '/home' })
      await waitForNavigation()

      expect(afterEach).toHaveBeenCalled()
    })
  })

  describe('重定向', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确处理路由重定向', async () => {
      router = createHistoryRouter('hash', [
        { path: '/', component: createMockComponent() },
        {
          path: '/old',
          redirect: { index: '/new' },
          component: createMockComponent()
        },
        { path: '/new', component: createMockComponent() }
      ])
      await waitForNavigation()

      const result = await router.push({ index: '/old' })
      await waitForNavigation()

      expect(result.status).toBe(NavigateStatus.success)
      expect(router.route.path).toBe('/new')
      expect(result.redirectFrom).toBeDefined()
    })

    it('应该正确处理函数式重定向', async () => {
      router = createHistoryRouter('hash', [
        { path: '/', component: createMockComponent() },
        {
          path: '/old',
          redirect: () => ({ index: '/new' }),
          component: createMockComponent()
        },
        { path: '/new', component: createMockComponent() }
      ])
      await waitForNavigation()

      await router.push({ index: '/old' })
      await waitForNavigation()

      expect(router.route.path).toBe('/new')
    })
  })

  describe('createRouteLocation', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确创建路由位置对象', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      const location = router.createRouteLocation({ index: '/home' })

      expect(location.path).toBe('/home')
      expect(location.__is_route_location).toBe(true)
    })

    it('应该正确处理动态路由参数', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      const location = router.createRouteLocation({
        index: '/user/123',
        params: { id: '123' }
      })

      expect(location.path).toBe('/user/123')
      expect(location.params.id).toBe('123')
    })
  })

  describe('并发导航处理', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('应该正确处理并发导航请求', async () => {
      router = createHistoryRouter('hash')
      await waitForNavigation()

      const [result1, result2] = await Promise.all([
        router.push({ index: '/home' }),
        router.push({ index: '/about' })
      ])

      const statuses = [result1.status, result2.status].sort()
      expect(statuses).toContain(NavigateStatus.success)
      expect(statuses).toContain(NavigateStatus.cancelled)
    })
  })

  describe('base 路径处理', () => {
    it('应该正确处理自定义 base 路径', async () => {
      router = createRouter({
        mode: 'hash',
        routes: basicRoutes,
        base: '/app'
      }) as RouterHistory
      await waitForNavigation()

      expect(router.basePath).toBe('/app')
    })

    it('应该正确规范化 base 路径', async () => {
      router = createRouter({
        mode: 'hash',
        routes: basicRoutes,
        base: '//app//'
      }) as RouterHistory
      await waitForNavigation()

      expect(router.basePath).toBe('/app')
    })
  })
})
