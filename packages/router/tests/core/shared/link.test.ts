import { logger } from 'vitarx'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as inject from '../../../src/core/shared/inject.js'
import { createMemoryRouter, defineRoutes, type Route } from '../../../src/index.js'

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

  describe('useLink', () => {
    describe('href 计算', () => {
      it('应该正确计算路径的 href', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about' })
        expect(link.href.value).toBe('/about')
      })

      it('应该正确计算带查询参数的 href', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about?a=1&b=2' })
        expect(link.route.value?.query).toEqual({ a: '1', b: '2' })
      })

      it('应该正确计算带 hash 的 href', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about#section' })
        expect(link.route.value?.hash).toBe('#section')
      })

      it('应该对 HTTP 链接返回原始链接', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: 'https://example.com' })
        expect(link.href.value).toBe('https://example.com')
      })

      it('应该对 HTTP 链接返回原始链接 (http)', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: 'http://example.com' })
        expect(link.href.value).toBe('http://example.com')
      })

      it('应该对无效目标返回 javascript:void(0)', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: {} as any })
        expect(link.href.value).toBe('javascript:void(0)')
        warnSpy.mockRestore()
      })

      it('应该对无效的 to 类型返回 javascript:void(0)', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: 123 as any })
        expect(link.href.value).toBe('javascript:void(0)')
        warnSpy.mockRestore()
      })

      it('应该正确处理带路径的导航目标', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: { index: '/about' } })
        expect(link.href.value).toBe('/about')
      })
    })

    describe('route 计算', () => {
      it('应该正确匹配路由', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about' })
        expect(link.route.value?.path).toBe('/about')
      })

      it('应该正确匹配命名路由', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: { index: 'user', params: { id: '123' } } })
        expect(link.route.value?.path).toBe('/user/123')
        expect(link.route.value?.params.id).toBe('123')
      })

      it('应该对不存在的路由返回 null', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/nonexistent' })
        expect(link.route.value).toBeNull()
        warnSpy.mockRestore()
      })

      it('应该正确处理 symbol 作为路由索引', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
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

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '#section' })
        expect(link.route.value?.hash).toBe('#section')
      })

      it('应该正确处理带查询参数的路由目标', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: { index: '/about', query: { a: '1' } } })
        expect(link.route.value?.query.a).toBe('1')
      })

      it('应该正确处理带 hash 的路由目标', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: { index: '/about', hash: '#section' } })
        expect(link.route.value?.hash).toBe('#section')
      })
    })

    describe('isActive 计算', () => {
      it('当前路由匹配时应该返回 true', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/about' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about' })
        expect(link.isActive.value).toBe(true)
      })

      it('当前路由不匹配时应该返回 false', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about' })
        expect(link.isActive.value).toBe(false)
      })

      it('没有匹配路由时应该返回 false', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/nonexistent' })
        expect(link.isActive.value).toBe(false)
        warnSpy.mockRestore()
      })
    })

    describe('isExactActive 计算', () => {
      it('当前路由完全匹配时应该返回 true', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/about' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about' })
        expect(link.isExactActive.value).toBe(true)
      })

      it('当前路由部分匹配时应该返回 false', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/about' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/' })
        expect(link.isExactActive.value).toBe(false)
      })

      it('没有匹配路由时应该返回 false', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/nonexistent' })
        expect(link.isExactActive.value).toBe(false)
        warnSpy.mockRestore()
      })
    })

    describe('navigate 方法', () => {
      it('应该导航到目标路由', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about' })
        await link.navigate()
        expect(router.route.path).toBe('/about')
      })

      it('应该使用 push 默认导航', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about' })
        await link.navigate()
        expect(router.route.path).toBe('/about')
      })

      it('应该使用 replace 导航', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about', replace: true })
        await link.navigate()
        expect(router.route.path).toBe('/about')
      })

      it('应该优先使用 to.replace 而不是 props.replace', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: { index: '/about', replace: true }, replace: false })
        await link.navigate()
        expect(router.route.path).toBe('/about')
      })

      it('没有匹配路由时应该不导航', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/nonexistent' })
        const result = await link.navigate()
        expect(result).toBeUndefined()
        warnSpy.mockRestore()
      })

      it('应该阻止默认事件行为', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about' })
        const event = { preventDefault: vi.fn() } as unknown as MouseEvent
        await link.navigate(event)
        expect(event.preventDefault).toHaveBeenCalled()
      })

      it('HTTP 链接应该不导航', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: 'https://example.com' })
        const result = await link.navigate()
        expect(result).toBeUndefined()
      })
    })

    describe('边界情况', () => {
      it('应该正确处理空路径', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/' })
        expect(link.route.value?.path).toBe('/')
      })

      it('应该正确处理带参数的路由', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: { index: 'user', params: { id: '456' } } })
        expect(link.route.value?.params.id).toBe('456')
      })

      it('应该正确处理带查询参数和 hash 的路径', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about?a=1#section' })
        expect(link.route.value?.query.a).toBe('1')
        expect(link.route.value?.hash).toBe('#section')
      })

      it('应该正确处理只有查询参数的路径', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about?a=1' })
        expect(link.route.value?.query.a).toBe('1')
      })

      it('应该正确处理只有 hash 的路径', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about#section' })
        expect(link.route.value?.hash).toBe('#section')
      })

      it('应该正确处理路径中带 # 但没有 hash 内容', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about#' })
        expect(link.route.value?.path).toBe('/about')
      })

      it('应该正确处理路径中带 ? 但没有查询参数', async () => {
        router = createMemoryRouter({ routes: basicRoutes, mode: 'path' })
        await router.replace({ index: '/' })
        mockUseRouter(router)

        const { useLink } = await import('../../../src/core/shared/link.js')
        const link = useLink({ to: '/about?' })
        expect(link.route.value?.path).toBe('/about')
      })
    })
  })
})
