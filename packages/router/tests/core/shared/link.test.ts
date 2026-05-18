import { logger } from 'vitarx'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as inject from '../../../src/core/shared/inject.js'
import { isPathExactMatch, isPathPrefixMatch } from '../../../src/core/shared/link.js'
import {
  createMemoryRouter,
  defineRoutes,
  NavState,
  type Route,
  useLink
} from '../../../src/index.js'

import { createMockComponent } from '../testHelpers.js'

const basicRoutes: Route[] = defineRoutes(
  { path: '/', component: createMockComponent(), name: 'home' },
  { path: '/about', component: createMockComponent(), name: 'about' },
  { path: '/user/{id}', component: createMockComponent(), name: 'user' }
)

function mockUseRouter(router: any) {
  Object.defineProperty(inject, 'useRouter', {
    value: vi.fn().mockReturnValue(router),
    writable: true,
    configurable: true
  })
}

function restoreUseRouter(originalFn: any) {
  Object.defineProperty(inject, 'useRouter', {
    value: originalFn,
    writable: true,
    configurable: true
  })
}

describe('shared/link', () => {
  let originalUseRouter: any
  let router: ReturnType<typeof createMemoryRouter> | null = null

  beforeEach(() => {
    originalUseRouter = inject.useRouter
  })

  afterEach(() => {
    if (router) {
      router.destroy()
      router = null
    }
    restoreUseRouter(originalUseRouter)
  })

  describe('isPathPrefixMatch', () => {
    it('路径完全相同时应返回 true', () => {
      expect(isPathPrefixMatch('/users', '/users')).toBe(true)
    })

    it('当前路径是目标路径的子路径时应返回 true', () => {
      expect(isPathPrefixMatch('/users/123', '/users')).toBe(true)
      expect(isPathPrefixMatch('/users/123/detail', '/users')).toBe(true)
    })

    it('仅前缀相似但非路径段匹配时应返回 false', () => {
      expect(isPathPrefixMatch('/users-admin', '/users')).toBe(false)
      expect(isPathPrefixMatch('/users123', '/users')).toBe(false)
      expect(isPathPrefixMatch('/usersAdmin', '/users')).toBe(false)
    })

    it('完全不同的路径应返回 false', () => {
      expect(isPathPrefixMatch('/about', '/users')).toBe(false)
      expect(isPathPrefixMatch('/settings', '/users')).toBe(false)
    })

    it('根路径匹配根路径应返回 true', () => {
      expect(isPathPrefixMatch('/', '/')).toBe(true)
    })

    it('根路径作为目标时任何路径都应匹配', () => {
      expect(isPathPrefixMatch('/users', '/')).toBe(true)
      expect(isPathPrefixMatch('/users/123', '/')).toBe(true)
    })

    it('应正确处理尾部斜杠', () => {
      expect(isPathPrefixMatch('/users/', '/users')).toBe(true)
      expect(isPathPrefixMatch('/users', '/users/')).toBe(true)
      expect(isPathPrefixMatch('/users/', '/users/')).toBe(true)
    })

    it('深层嵌套子路径应匹配', () => {
      expect(isPathPrefixMatch('/a/b/c/d', '/a/b')).toBe(true)
      expect(isPathPrefixMatch('/a/b/c/d', '/a/b/c')).toBe(true)
    })

    it('目标路径更长时应返回 false', () => {
      expect(isPathPrefixMatch('/users', '/users/123')).toBe(false)
    })
  })

  describe('isPathExactMatch', () => {
    it('路径完全相同时应返回 true', () => {
      expect(isPathExactMatch('/users', '/users')).toBe(true)
    })

    it('尾部斜杠不影响匹配结果', () => {
      expect(isPathExactMatch('/users/', '/users')).toBe(true)
      expect(isPathExactMatch('/users', '/users/')).toBe(true)
      expect(isPathExactMatch('/users/', '/users/')).toBe(true)
    })

    it('子路径不应匹配', () => {
      expect(isPathExactMatch('/users/123', '/users')).toBe(false)
      expect(isPathExactMatch('/users/123/detail', '/users')).toBe(false)
    })

    it('根路径匹配根路径应返回 true', () => {
      expect(isPathExactMatch('/', '/')).toBe(true)
    })

    it('不同路径不应匹配', () => {
      expect(isPathExactMatch('/about', '/users')).toBe(false)
    })

    it('仅前缀相似但非完全匹配应返回 false', () => {
      expect(isPathExactMatch('/users-admin', '/users')).toBe(false)
      expect(isPathExactMatch('/users123', '/users')).toBe(false)
    })

    it('根路径与子路径不应匹配', () => {
      expect(isPathExactMatch('/', '/users')).toBe(false)
      expect(isPathExactMatch('/users', '/')).toBe(false)
    })
  })

  describe('useLink', () => {
    describe('href 计算', () => {
      it('应该正确计算路径的 href', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        expect(link.href.value).toBe('/about')
      })

      it('应该正确计算带查询参数的 href', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about?a=1&b=2' })
        expect(link.route.value?.query).toEqual({ a: '1', b: '2' })
      })

      it('应该正确计算带 hash 的 href', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about#section' })
        expect(link.route.value?.hash).toBe('#section')
      })

      it('应该对 HTTP 链接返回原始链接', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: 'https://example.com' })
        expect(link.href.value).toBe('https://example.com')
      })

      it('应该对 HTTP 链接返回原始链接 (http)', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: 'http://example.com' })
        expect(link.href.value).toBe('http://example.com')
      })

      it('应该对无效目标返回 javascript:void(0)', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

        const link = useLink({ to: {} as any })
        expect(link.href.value).toBe('javascript:void(0)')
        warnSpy.mockRestore()
      })

      it('应该对无效的 to 类型返回 javascript:void(0)', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

        const link = useLink({ to: 123 as any })
        expect(link.href.value).toBe('javascript:void(0)')
        warnSpy.mockRestore()
      })

      it('应该正确处理带路径的导航目标', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: { index: '/about' } })
        expect(link.href.value).toBe('/about')
      })
    })

    describe('route 计算', () => {
      it('应该正确匹配路由', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        expect(link.route.value?.path).toBe('/about')
      })

      it('应该正确匹配命名路由', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: { index: 'user', params: { id: '123' } } })
        expect(link.route.value?.path).toBe('/user/123')
        expect(link.route.value?.params.id).toBe('123')
      })

      it('应该对不存在的路由返回 null', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

        const link = useLink({ to: '/nonexistent' })
        expect(link.route.value).toBeNull()
        warnSpy.mockRestore()
      })

      it('应该正确处理 symbol 作为路由索引', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
        const sym = Symbol('route')
        const link = useLink({ to: sym })
        expect(link.route.value).toBeNull()
        warnSpy.mockRestore()
      })

      it('应该正确处理纯锚点链接', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '#section' })
        expect(link.route.value?.hash).toBe('#section')
      })

      it('应该正确处理带查询参数的路由目标', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: { index: '/about', query: { a: '1' } } })
        expect(link.route.value?.query.a).toBe('1')
      })

      it('应该正确处理带 hash 的路由目标', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: { index: '/about', hash: '#section' } })
        expect(link.route.value?.hash).toBe('#section')
      })
    })

    describe('isActive 计算', () => {
      it('当前路由匹配时应该返回 true', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/about' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        expect(link.isActive.value).toBe(true)
      })

      it('当前路由不匹配时应该返回 false', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        expect(link.isActive.value).toBe(false)
      })

      it('没有匹配路由时应该返回 false', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

        const link = useLink({ to: '/nonexistent' })
        expect(link.isActive.value).toBe(false)
        warnSpy.mockRestore()
      })

      it('当前路由带查询参数时仍应基于路径匹配', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/about', query: { tab: '1' } })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        expect(link.isActive.value).toBe(true)
      })

      it('路径段边界：相似前缀但非子路径不应匹配', async () => {
        const routes: Route[] = defineRoutes(
          { path: '/', component: createMockComponent(), name: 'home' },
          { path: '/about', component: createMockComponent(), name: 'about' },
          { path: '/about-us', component: createMockComponent(), name: 'about-us' }
        )
        router = createMemoryRouter({ routes, mode: 'path' })
        await router.replace({ index: '/about-us' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        expect(link.isActive.value).toBe(false)
      })

      it('子路径应匹配父路径', async () => {
        const routes: Route[] = defineRoutes(
          { path: '/', component: createMockComponent(), name: 'home' },
          { path: '/user/{id}', component: createMockComponent(), name: 'user' }
        )
        router = createMemoryRouter({ routes, mode: 'path' })
        await router.replace({ index: '/user/123' })
        mockUseRouter(router)

        const link = useLink({ to: '/user/123' })
        expect(link.isActive.value).toBe(true)
      })
    })

    describe('isExactActive 计算', () => {
      it('当前路由完全匹配时应该返回 true', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/about' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        expect(link.isExactActive.value).toBe(true)
      })

      it('当前路由部分匹配时应该返回 false', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/about' })
        mockUseRouter(router)

        const link = useLink({ to: '/' })
        expect(link.isExactActive.value).toBe(false)
      })

      it('没有匹配路由时应该返回 false', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

        const link = useLink({ to: '/nonexistent' })
        expect(link.isExactActive.value).toBe(false)
        warnSpy.mockRestore()
      })

      describe('path 模式（默认）', () => {
        it('路径相同时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about' })
          mockUseRouter(router)

          const link = useLink({ to: '/about' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径相同但 query 不同时仍应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '1' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径相同但 hash 不同时仍应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', hash: '#section' })
          mockUseRouter(router)

          const link = useLink({ to: '/about' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径相同但 query 和 hash 都不同时仍应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '1' }, hash: '#section' })
          mockUseRouter(router)

          const link = useLink({ to: '/about' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('不指定 exactMatchMode 时应默认使用 path 模式', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '1' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about' })
          expect(link.isExactActive.value).toBe(true)
        })
      })

      describe('href 模式', () => {
        it('href 完全一致时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about' })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'href' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径相同但 query 不同时应返回 false', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '1' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'href' })
          expect(link.isExactActive.value).toBe(false)
        })

        it('路径相同但 hash 不同时应返回 false', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', hash: '#section' })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'href' })
          expect(link.isExactActive.value).toBe(false)
        })

        it('路径和 query 都一致时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '1' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about?tab=1', exactMatchMode: 'href' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径和 hash 都一致时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', hash: '#section' })
          mockUseRouter(router)

          const link = useLink({ to: '/about#section', exactMatchMode: 'href' })
          expect(link.isExactActive.value).toBe(true)
        })
      })

      describe('hash 模式', () => {
        it('路径和 hash 都一致时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', hash: '#section' })
          mockUseRouter(router)

          const link = useLink({ to: '/about#section', exactMatchMode: 'hash' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径相同但 hash 不同时应返回 false', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', hash: '#other' })
          mockUseRouter(router)

          const link = useLink({ to: '/about#section', exactMatchMode: 'hash' })
          expect(link.isExactActive.value).toBe(false)
        })

        it('路径相同且都没有 hash 时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about' })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'hash' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径相同但 query 不同时仍应返回 true（hash 模式不比较 query）', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '1' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'hash' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('当前有 hash 但目标没有 hash 时应返回 false', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', hash: '#section' })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'hash' })
          expect(link.isExactActive.value).toBe(false)
        })
      })

      describe('query 模式', () => {
        it('路径和 query 都一致时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '1' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about?tab=1', exactMatchMode: 'query' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径相同但 query 不同时应返回 false', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '2' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about?tab=1', exactMatchMode: 'query' })
          expect(link.isExactActive.value).toBe(false)
        })

        it('路径相同且都没有 query 时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about' })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'query' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('路径相同但 hash 不同时仍应返回 true（query 模式不比较 hash）', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', hash: '#section' })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'query' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('当前有 query 但目标没有 query 时应返回 false', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { tab: '1' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about', exactMatchMode: 'query' })
          expect(link.isExactActive.value).toBe(false)
        })

        it('query 参数顺序一致且内容相同时应返回 true', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { a: '1', b: '2' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about?a=1&b=2', exactMatchMode: 'query' })
          expect(link.isExactActive.value).toBe(true)
        })

        it('query 参数顺序不同时序列化结果不同应返回 false', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about', query: { a: '1', b: '2' } })
          mockUseRouter(router)

          const link = useLink({ to: '/about?b=2&a=1', exactMatchMode: 'query' })
          expect(link.isExactActive.value).toBe(false)
        })
      })

      describe('路径不匹配时所有模式都应返回 false', () => {
        it('path 模式', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about' })
          mockUseRouter(router)

          const link = useLink({ to: '/', exactMatchMode: 'path' })
          expect(link.isExactActive.value).toBe(false)
        })

        it('href 模式', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about' })
          mockUseRouter(router)

          const link = useLink({ to: '/', exactMatchMode: 'href' })
          expect(link.isExactActive.value).toBe(false)
        })

        it('hash 模式', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about' })
          mockUseRouter(router)

          const link = useLink({ to: '/', exactMatchMode: 'hash' })
          expect(link.isExactActive.value).toBe(false)
        })

        it('query 模式', async () => {
          router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
          await router.replace({ index: '/about' })
          mockUseRouter(router)

          const link = useLink({ to: '/', exactMatchMode: 'query' })
          expect(link.isExactActive.value).toBe(false)
        })
      })
    })

    describe('navigate 方法', () => {
      it('应该导航到目标路由', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        await link.navigate()
        expect(router.route.path).toBe('/about')
      })

      it('应该使用 push 默认导航', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        await link.navigate()
        expect(router.route.path).toBe('/about')
      })

      it('应该使用 replace 导航', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about', replace: true })
        await link.navigate()
        expect(router.route.path).toBe('/about')
      })

      it('应该优先使用 to.replace 而不是 props.replace', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: { index: '/about', replace: true }, replace: false })
        await link.navigate()
        expect(router.route.path).toBe('/about')
      })

      it('没有匹配路由时应该进行导航', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

        const link = useLink({ to: '/nonexistent' })
        const result = await link.navigate()
        expect(result).toBeDefined()
        warnSpy.mockRestore()
      })

      it('应该阻止默认事件行为', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about' })
        const event = { preventDefault: vi.fn() } as unknown as MouseEvent
        await link.navigate(event)
        expect(event.preventDefault).toHaveBeenCalled()
      })

      it('HTTP 链接应该返回外部导航状态', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: 'https://example.com' })
        const result = await link.navigate()
        expect(result.state === NavState.external).toBe(true)
      })
    })

    describe('边界情况', () => {
      it('href应该保留尾部斜杠', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about/' })
        expect(link.route.value?.path).toBe('/about/')
        expect(link.href.value).toBe('/about/')
      })
      it('应该正确处理空路径', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/' })
        expect(link.route.value?.path).toBe('/')
      })

      it('应该正确处理带参数的路由', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: { index: 'user', params: { id: '456' } } })
        expect(link.route.value?.params.id).toBe('456')
      })

      it('应该正确处理带查询参数和 hash 的路径', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about?a=1#section' })
        expect(link.route.value?.query.a).toBe('1')
        expect(link.route.value?.hash).toBe('#section')
      })

      it('应该正确处理只有查询参数的路径', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about?a=1' })
        expect(link.route.value?.query.a).toBe('1')
      })

      it('应该正确处理只有 hash 的路径', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about#section' })
        expect(link.route.value?.hash).toBe('#section')
      })

      it('应该正确处理路径中带 # 但没有 hash 内容', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about#' })
        expect(link.route.value?.path).toBe('/about')
      })

      it('应该正确处理路径中带 ? 但没有查询参数', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const link = useLink({ to: '/about?' })
        expect(link.route.value?.path).toBe('/about')
      })
    })
  })
})
