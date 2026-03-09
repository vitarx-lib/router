import { type App as VitarxApp, createApp, h } from 'vitarx'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Route } from '../../src/index.js'
import { createRouter, defineRoutes, NavigateStatus, RouterLink } from '../../src/index.js'

function createMockComponent() {
  return vi.fn()
}

const basicRoutes: Route[] = defineRoutes(
  { path: '/', component: createMockComponent(), name: 'home' },
  { path: '/about', component: createMockComponent(), name: 'about' },
  { path: '/user/{id}', component: createMockComponent(), name: 'user' },
  {
    path: '/admin',
    component: createMockComponent(),
    name: 'admin',
    children: [{ path: '/admin/dashboard', component: createMockComponent(), name: 'dashboard' }]
  }
)

function waitForRender(timeout = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

interface TestContext {
  app: VitarxApp | null
  container: HTMLElement
  router: ReturnType<typeof createRouter> | null
}

function setupTest(): TestContext {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return {
    app: null,
    container,
    router: null
  }
}

function cleanupTest(ctx: TestContext) {
  if (ctx.app) {
    ctx.app.unmount()
  }
  if (ctx.router) {
    ctx.router.destroy()
  }
  if (ctx.container.parentNode) {
    document.body.removeChild(ctx.container)
  }
}

function mountComponent(
  ctx: TestContext,
  component: ReturnType<typeof h>,
  router?: ReturnType<typeof createRouter>
): void {
  ctx.router = router ?? createRouter({ mode: 'hash', routes: basicRoutes })
  ctx.app = createApp(() => component)
  ctx.app.provide('router', ctx.router)
  ctx.app.mount(ctx.container)
}

function getLink(ctx: TestContext): HTMLAnchorElement | null {
  return ctx.container.querySelector('a')
}

describe('RouterLink', () => {
  let ctx: TestContext

  beforeEach(() => {
    ctx = setupTest()
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    cleanupTest(ctx)
  })

  describe('基础渲染', () => {
    it('应该渲染为 a 标签', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about' }))
      await waitForRender()

      const link = getLink(ctx)
      expect(link?.tagName.toLowerCase()).toBe('a')
    })

    it('应该正确设置 href 属性', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about' }))
      await waitForRender()

      expect(getLink(ctx)?.getAttribute('href')).toBeDefined()
    })

    it('应该正确渲染子节点', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about' }, 'About Page'))
      await waitForRender()

      expect(getLink(ctx)?.textContent).toBe('About Page')
    })

    it('应该正确传递额外的 HTML 属性', async () => {
      mountComponent(
        ctx,
        h(RouterLink, {
          to: '/about',
          class: 'nav-link',
          id: 'about-link',
          target: '_blank'
        })
      )
      await waitForRender()

      const link = getLink(ctx)
      expect(link?.classList.contains('nav-link')).toBe(true)
      expect(link?.id).toBe('about-link')
      expect(link?.getAttribute('target')).toBe('_blank')
    })
  })

  describe('to 属性处理', () => {
    it('应该正确处理字符串路径', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about' }))
      await waitForRender()

      expect(getLink(ctx)?.getAttribute('href')).toContain('about')
    })

    it('应该正确处理对象路径', async () => {
      mountComponent(ctx, h(RouterLink, { to: { index: '/about', query: { id: '123' } } }))
      await waitForRender()

      expect(getLink(ctx)?.getAttribute('href')).toContain('about')
    })

    it('应该正确处理动态路由参数', async () => {
      mountComponent(ctx, h(RouterLink, { to: { index: '/user/123', params: { id: '123' } } }))
      await waitForRender()

      expect(getLink(ctx)?.getAttribute('href')).toContain('user')
    })

    it('应该正确处理带 hash 的路径', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about#section' }))
      await waitForRender()

      expect(getLink(ctx)?.getAttribute('href')).toBeDefined()
    })

    it('应该正确处理外部链接', async () => {
      mountComponent(ctx, h(RouterLink, { to: 'https://example.com' }))
      await waitForRender()

      expect(getLink(ctx)?.getAttribute('href')).toBe('https://example.com')
    })

    it('应该正确处理纯 hash 锚点', async () => {
      mountComponent(ctx, h(RouterLink, { to: '#section' }))
      await waitForRender()

      expect(getLink(ctx)?.getAttribute('href')).toBe('#section')
    })

    it('应该正确处理未匹配的路由', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountComponent(ctx, h(RouterLink, { to: '/nonexistent' }))
      await waitForRender()

      expect(getLink(ctx)?.getAttribute('href')).toBeDefined()
      warnSpy.mockRestore()
    })
  })

  describe('disabled 属性', () => {
    it('禁用时应该设置 disabled 属性', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about', disabled: true }))
      await waitForRender()

      expect(getLink(ctx)?.hasAttribute('disabled')).toBe(true)
    })

    it('禁用时点击不应该导航', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about', disabled: true }))
      await waitForRender()

      const navigateSpy = vi.spyOn(ctx.router!, 'navigate')
      getLink(ctx)?.click()
      await waitForRender()

      expect(navigateSpy).not.toHaveBeenCalled()
      navigateSpy.mockRestore()
    })
  })

  describe('active 属性', () => {
    const activeTestCases = [
      {
        active: 'none' as const,
        to: '/',
        expectedAria: null,
        description: 'none 时不应该添加 aria-current'
      },
      {
        active: 'strict' as const,
        to: '/',
        expectedAria: 'page',
        description: 'strict 时严格匹配应该添加 aria-current'
      },
      {
        active: 'strict' as const,
        to: '/about',
        expectedAria: null,
        description: 'strict 时不匹配不应该添加 aria-current'
      },
      {
        active: 'obscure' as const,
        to: '/',
        expectedAria: 'page',
        description: 'obscure 时模糊匹配应该添加 aria-current'
      }
    ]

    activeTestCases.forEach(({ active, to, expectedAria, description }) => {
      it(`${description}`, async () => {
        mountComponent(ctx, h(RouterLink, { to, active }))
        await waitForRender(100)

        const ariaCurrent = getLink(ctx)?.getAttribute('aria-current')
        expect(ariaCurrent).toBe(expectedAria)
      })
    })
  })

  describe('点击导航', () => {
    it('点击应该触发导航', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about' }))
      await waitForRender()

      getLink(ctx)?.click()
      await waitForRender(100)

      expect(ctx.router!.route.path).toBe('/about')
    })

    it('点击外部链接不应该触发导航', async () => {
      mountComponent(ctx, h(RouterLink, { to: 'https://example.com' }))
      await waitForRender()

      const navigateSpy = vi.spyOn(ctx.router!, 'navigate')
      getLink(ctx)?.click()
      await waitForRender()

      expect(navigateSpy).not.toHaveBeenCalled()
      navigateSpy.mockRestore()
    })
  })

  describe('callback 属性', () => {
    it('导航完成后应该调用 callback', async () => {
      const callback = vi.fn()
      mountComponent(ctx, h(RouterLink, { to: '/about', callback }))
      await waitForRender()

      getLink(ctx)?.click()
      await waitForRender(100)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ status: NavigateStatus.success })
      )
    })
  })

  describe('URL 编码处理', () => {
    it('应该正确解码 URL 编码的路径', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountComponent(ctx, h(RouterLink, { to: '/about%20page' }))
      await waitForRender()

      expect(getLink(ctx)).toBeDefined()
      warnSpy.mockRestore()
    })
  })

  describe('查询参数解析', () => {
    it('应该正确解析字符串路径中的查询参数', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about?id=123&name=test' }))
      await waitForRender()

      const link = getLink(ctx)
      expect(link).toBeDefined()
      expect(link?.getAttribute('href')).toContain('id=123')
      expect(link?.getAttribute('href')).toContain('name=test')
    })

    it('应该正确解析带 URL 编码的查询参数', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about?name=%E4%B8%AD%E6%96%87' }))
      await waitForRender()

      const link = getLink(ctx)
      expect(link).toBeDefined()
    })

    it('应该正确解析带 hash 和查询参数的路径', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about?id=123#section' }))
      await waitForRender()

      const link = getLink(ctx)
      expect(link).toBeDefined()
      expect(link?.getAttribute('href')).toContain('id=123')
      expect(link?.getAttribute('href')).toContain('#section')
    })

    it('应该正确解析没有值的查询参数', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about?debug' }))
      await waitForRender()

      const link = getLink(ctx)
      expect(link).toBeDefined()
    })

    it('应该正确解析多个查询参数', async () => {
      mountComponent(ctx, h(RouterLink, { to: '/about?q=vitarx&page=1&size=10' }))
      await waitForRender()

      const link = getLink(ctx)
      expect(link).toBeDefined()
      expect(link?.getAttribute('href')).toContain('q=vitarx')
      expect(link?.getAttribute('href')).toContain('page=1')
      expect(link?.getAttribute('href')).toContain('size=10')
    })
  })

  describe('命名路由', () => {
    it('应该正确处理命名路由的激活状态', async () => {
      mountComponent(ctx, h(RouterLink, { to: 'home', active: 'strict' }))
      await waitForRender(100)

      expect(getLink(ctx)?.getAttribute('aria-current')).toBe('page')
    })
  })

  describe('draggable 属性', () => {
    const draggableTestCases = [
      { draggable: true, expected: 'true', description: '应该正确设置 draggable 属性' },
      { draggable: undefined, expected: 'false', description: '默认 draggable 应该为 false' }
    ]

    draggableTestCases.forEach(({ draggable, expected, description }) => {
      it(`${description}`, async () => {
        mountComponent(ctx, h(RouterLink, { to: '/about', draggable }))
        await waitForRender()

        expect(getLink(ctx)?.getAttribute('draggable')).toBe(expected)
      })
    })
  })
})
