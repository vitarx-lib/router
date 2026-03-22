import { type App as VitarxApp, type Component, createApp, Dynamic, h } from 'vitarx'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterView } from '../../src/components/index.js'
import {
  __ROUTER_KEY__,
  createRouter,
  defineRoutes,
  NavState,
  type Route
} from '../../src/index.js'

function createMockComponent(name = 'MockComponent'): Component {
  return () => h('div', { 'data-testid': name }, name)
}

const basicRoutes: Route[] = defineRoutes(
  {
    path: '/',
    component: { default: createMockComponent('Home') },
    name: 'home',
    props: { default: {} }
  },
  {
    path: '/about',
    component: { default: createMockComponent('About') },
    name: 'about',
    props: { default: {} }
  },
  {
    path: '/user/{id}',
    component: { default: createMockComponent('User') },
    name: 'user',
    props: { default: true }
  },
  {
    path: '/admin',
    component: {
      default: createMockComponent('Admin'),
      sidebar: createMockComponent('AdminSidebar')
    },
    name: 'admin',
    props: { default: { title: 'Admin Panel' }, sidebar: {} }
  },
  {
    path: '/custom-props',
    component: { default: createMockComponent('CustomProps') },
    props: { default: (route: any) => ({ routePath: route.path }) }
  }
)

function waitForRender(timeout = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

describe('RouterView', () => {
  let app: VitarxApp | null = null
  let container: HTMLElement
  let router: ReturnType<typeof createRouter> | null = null

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    window.history.replaceState(null, '', '/')
  })

  afterEach(async () => {
    if (app) {
      app.unmount()
      app = null
    }
    if (router) {
      router.destroy()
      router = null
    }
    document.body.removeChild(container)
  })

  describe('基础渲染', () => {
    it('应该渲染匹配的组件', async () => {
      router = createRouter({ mode: 'hash', routes: basicRoutes })

      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      const rendered = container.querySelector('[data-testid="Home"]')
      expect(rendered).toBeDefined()
    })

    it('路由变化时应该更新渲染的组件', async () => {
      router = createRouter({ mode: 'hash', routes: basicRoutes })

      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(container.querySelector('[data-testid="Home"]')).toBeDefined()

      await router.push({ index: '/about' })
      await waitForRender(100)

      expect(container.querySelector('[data-testid="About"]')).toBeDefined()
      expect(container.querySelector('[data-testid="Home"]')).toBeNull()
    })
  })

  describe('命名视图', () => {
    it('应该渲染默认视图', async () => {
      router = createRouter({ mode: 'hash', routes: basicRoutes })

      app = createApp(() => h(RouterView, { name: 'default' }))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(container.querySelector('[data-testid="Home"]')).toBeDefined()
    })

    it('应该渲染命名视图', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      router = createRouter({ mode: 'hash', routes: basicRoutes })

      await router.push({ index: '/admin' })

      app = createApp(() =>
        h('div', {}, [h(RouterView, { name: 'default' }), h(RouterView, { name: 'sidebar' })])
      )
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(container.querySelector('[data-testid="Admin"]')).toBeDefined()
      expect(container.querySelector('[data-testid="AdminSidebar"]')).toBeDefined()
      warnSpy.mockRestore()
    })

    it('不存在的命名视图应该渲染空', async () => {
      router = createRouter({ mode: 'hash', routes: basicRoutes })

      app = createApp(() => h(RouterView, { name: 'nonexistent' }))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(container.children.length).toBe(0)
    })
  })

  describe('props 注入', () => {
    it('props 为 true 时应该注入路由参数', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      let receivedProps: any = null
      const TestComponent = (props: any) => {
        receivedProps = props
        return h('div', { 'data-testid': 'user' }, 'User')
      }

      const testRoutes: Route[] = [
        {
          path: '/',
          component: { default: createMockComponent('Home') },
          props: { default: {} }
        },
        {
          path: '/user/{id}',
          component: { default: TestComponent },
          props: { default: true }
        }
      ]

      router = createRouter({ mode: 'hash', routes: testRoutes })
      await router.push({ index: '/user/456' })

      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(receivedProps).toBeDefined()
      expect(receivedProps.id).toBe('456')
      warnSpy.mockRestore()
    })

    it('props 为对象时应该注入对象属性', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      let receivedProps: any = null
      const TestComponent = (props: any) => {
        receivedProps = props
        return h('div', { 'data-testid': 'admin' }, 'Admin')
      }

      const testRoutes: Route[] = [
        {
          path: '/',
          component: { default: createMockComponent('Home') },
          props: { default: {} }
        },
        {
          path: '/admin',
          component: { default: TestComponent },
          props: { default: { title: 'Admin Panel', role: 'admin' } }
        }
      ]

      router = createRouter({ mode: 'hash', routes: testRoutes })
      await router.push({ index: '/admin' })

      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(receivedProps).toBeDefined()
      expect(receivedProps.title).toBe('Admin Panel')
      expect(receivedProps.role).toBe('admin')
      warnSpy.mockRestore()
    })

    it('props 为函数时应该调用函数获取属性', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      let receivedProps: any = null
      const TestComponent = (props: any) => {
        receivedProps = props
        return h('div', { 'data-testid': 'custom' }, 'Custom')
      }

      const testRoutes: Route[] = [
        {
          path: '/',
          component: { default: createMockComponent('Home') },
          props: { default: {} }
        },
        {
          path: '/custom',
          component: { default: TestComponent },
          props: {
            default: (route: any) => ({
              routePath: route.path,
              timestamp: Date.now()
            })
          }
        }
      ]

      router = createRouter({ mode: 'hash', routes: testRoutes })
      await router.push({ index: '/custom' })

      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(receivedProps).toBeDefined()
      expect(receivedProps.routePath).toBe('/custom')
      expect(receivedProps.timestamp).toBeDefined()
      warnSpy.mockRestore()
    })

    it('props 为 false 时应该不注入属性', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      let receivedProps: any = null
      const TestComponent = (props: any) => {
        receivedProps = props
        return h('div', { 'data-testid': 'test' }, 'Test')
      }

      const testRoutes: Route[] = [
        {
          path: '/',
          component: { default: createMockComponent('Home') },
          props: { default: {} }
        },
        {
          path: '/test',
          component: { default: TestComponent },
          props: { default: false }
        }
      ]

      router = createRouter({ mode: 'hash', routes: testRoutes })
      await router.push({ index: '/test' })

      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(Object.keys(receivedProps).length).toBe(0)
      warnSpy.mockRestore()
    })
  })

  describe('自定义渲染', () => {
    it('应该使用自定义 children 函数', async () => {
      const customRender = vi.fn((component, props) => {
        return h(
          'section',
          { 'data-testid': 'custom-wrapper' },
          h(Dynamic, { is: component.value, 'v-bind': props.value })
        )
      })

      app = createApp(() => h(RouterView, { children: customRender }))
      router = createRouter({ mode: 'hash', routes: basicRoutes })
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(customRender).toHaveBeenCalled()
      expect(container.querySelector('[data-testid="custom-wrapper"]')).toBeDefined()
    })

    it('render 函数抛出错误时应该处理错误', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const customRender = () => {
        throw new Error('Render error')
      }

      app = createApp(() => h(RouterView, { children: customRender }))
      router = createRouter({ mode: 'hash', routes: basicRoutes })
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(errorSpy).toHaveBeenCalled()

      errorSpy.mockRestore()
    })
  })

  describe('missing 组件', () => {
    it('未匹配路由时应该渲染 missing 组件', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const missingComponent = createMockComponent('Missing')
      const testRoutes: Route[] = [
        { path: '/', component: { default: createMockComponent('Home') }, props: { default: {} } }
      ]

      router = createRouter({
        mode: 'hash',
        routes: testRoutes,
        missing: missingComponent
      })

      await router.push({ index: '/nonexistent' })

      app = createApp(() => h(RouterView))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(container.querySelector('[data-testid="Missing"]')).toBeDefined()
      warnSpy.mockRestore()
    })

    it('没有 missing 组件时不更新路线', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const testRoutes: Route[] = [
        { path: '/', component: { default: createMockComponent('Home') }, props: { default: {} } }
      ]

      router = createRouter({ mode: 'hash', routes: testRoutes })
      const result = await router.push({ index: '/nonexistent' })
      expect(result.state).toBe(NavState.notfound)
      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(container.children.length).toBe(1)
      warnSpy.mockRestore()
    })
  })

  describe('嵌套路由', () => {
    it('应该正确处理嵌套路由视图', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const ParentComponent = () =>
        h('div', { 'data-testid': 'parent' }, [h('h1', {}, 'Parent'), h(RouterView, {})])

      const ChildComponent = () => h('div', { 'data-testid': 'child' }, 'Child')

      const nestedRoutes: Route[] = [
        {
          path: '/',
          component: { default: createMockComponent('Home') },
          props: { default: {} }
        },
        {
          path: '/parent',
          component: { default: ParentComponent },
          props: { default: {} },
          children: [
            {
              path: '/parent/child',
              component: { default: ChildComponent },
              props: { default: {} }
            }
          ]
        }
      ]

      router = createRouter({ mode: 'hash', routes: nestedRoutes })
      await router.push({ index: '/parent/child' })

      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(container.querySelector('[data-testid="parent"]')).toBeDefined()
      expect(container.querySelector('[data-testid="child"]')).toBeDefined()
      warnSpy.mockRestore()
    })
  })

  describe('空路由处理', () => {
    it('没有匹配的路由记录时应该返回 null', async () => {
      const testRoutes: Route[] = [
        { path: '/', component: { default: createMockComponent('Home') }, props: { default: {} } }
      ]

      router = createRouter({ mode: 'hash', routes: testRoutes })

      app = createApp(() => h(RouterView, {}))
      app.provide(__ROUTER_KEY__, router)
      app.mount(container)

      await waitForRender(100)

      expect(container.querySelector('[data-testid="Home"]')).toBeDefined()
    })
  })
})
