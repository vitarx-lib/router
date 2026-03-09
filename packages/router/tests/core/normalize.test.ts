import { describe, expect, it, vi } from 'vitest'
import normalizeRouteComponent from '../../src/core/normalize/component.js'
import normalizeRoute from '../../src/core/normalize/index.js'
import normalizeInjectProps from '../../src/core/normalize/inject-props.js'
import type { Route, RouteNormalized } from '../../src/index.js'

function createMockComponent() {
  return vi.fn()
}

describe('normalize', () => {
  describe('normalizeRoute', () => {
    it('应该正确规范化基本路由', () => {
      const route: Route = {
        path: '/home',
        component: createMockComponent()
      }

      const result = normalizeRoute(route, undefined, '*')

      expect(result.path).toBe('/home')
      expect(result.meta).toEqual({})
      expect(result.pattern).toEqual({})
      expect(result.children).toEqual([])
      expect(result.suffix).toBe('*')
    })

    it('应该正确处理带父路由的路由', () => {
      const parent: RouteNormalized = {
        path: '/parent',
        meta: {},
        pattern: {},
        children: [],
        suffix: 'html',
        component: undefined,
        props: undefined,
        isDynamic: false
      } as RouteNormalized

      const route: Route = {
        path: '/child',
        component: createMockComponent()
      }

      const result = normalizeRoute(route, parent, '*')

      expect(result.path).toBe('/parent/child')
    })

    it('应该继承父路由的配置', () => {
      const beforeEnter = vi.fn()
      const afterEnter = vi.fn()

      const parent: RouteNormalized = {
        path: '/parent',
        meta: {},
        pattern: {},
        children: [],
        suffix: 'html',
        component: undefined,
        props: undefined,
        beforeEnter,
        afterEnter,
        isDynamic: false
      } as RouteNormalized

      const route: Route = {
        path: '/child',
        component: createMockComponent()
      }

      const result = normalizeRoute(route, parent, '*')

      expect(result.suffix).toBe('html')
      expect(result.beforeEnter).toBe(beforeEnter)
      expect(result.afterEnter).toBe(afterEnter)
    })

    it('应该在children不是数组时抛出错误', () => {
      const route: Route = {
        path: '/home',
        component: createMockComponent(),
        children: 'invalid' as unknown as Route[]
      }

      expect(() => {
        normalizeRoute(route, undefined, '*')
      }).toThrow(
        '[Router] Route "/home" has invalid "children" configuration, it must be an array type.'
      )
    })

    it('应该在path为空时抛出错误', () => {
      const route = {
        path: '',
        component: createMockComponent()
      }

      expect(() => {
        normalizeRoute(route as Route, undefined, '*')
      }).toThrow('[Router] Route configuration "path" cannot be empty')
    })

    it('应该在path只有空格时抛出错误', () => {
      const route = {
        path: '   ',
        component: createMockComponent()
      }

      expect(() => {
        normalizeRoute(route as Route, undefined, '*')
      }).toThrow('[Router] Route configuration "path" cannot be empty')
    })

    it('应该正确处理带元数据的路由', () => {
      const route: Route = {
        path: '/user',
        component: createMockComponent(),
        meta: { title: 'User', auth: true }
      }

      const result = normalizeRoute(route, undefined, '*')

      expect(result.meta).toEqual({ title: 'User', auth: true })
    })

    it('应该正确处理自定义suffix', () => {
      const route: Route = {
        path: '/page',
        component: createMockComponent(),
        suffix: 'html'
      }

      const result = normalizeRoute(route, undefined, '*')

      expect(result.suffix).toBe('html')
    })
  })

  describe('normalizeRouteComponent', () => {
    it('应该正确处理函数组件', () => {
      const component = createMockComponent()
      const route: Route = {
        path: '/home',
        component,
        children: []
      }

      normalizeRouteComponent(route)

      expect(route.component).toEqual({ default: component })
    })

    it('应该正确处理命名视图组件', () => {
      const defaultComponent = createMockComponent()
      const sidebarComponent = createMockComponent()

      const route: Route = {
        path: '/layout',
        component: {
          default: defaultComponent,
          sidebar: sidebarComponent
        },
        children: []
      }

      normalizeRouteComponent(route)

      expect(route.component).toEqual({
        default: defaultComponent,
        sidebar: sidebarComponent
      })
    })

    it('应该在命名视图缺少default时抛出错误', () => {
      const route: Route = {
        path: '/layout',
        component: {
          sidebar: createMockComponent()
        } as any,
        children: []
      }

      expect(() => {
        normalizeRouteComponent(route)
      }).toThrow(
        '[Router] Invalid route configuration for "/layout": when "component" is an object (named views), it must have a "default" view'
      )
    })

    it('应该在component和children都为空时抛出错误', () => {
      const route: Route = {
        path: '/home',
        children: []
      }

      expect(() => {
        normalizeRouteComponent(route)
      }).toThrow('[Router] Route "/home" must have either "component" or "children" configured')
    })

    it('应该在component类型无效时抛出错误', () => {
      const route: Route = {
        path: '/home',
        component: 'invalid' as any,
        children: []
      }

      expect(() => {
        normalizeRouteComponent(route)
      }).toThrow('[Router] Invalid "component" configuration for route "/home"')
    })

    it('应该正确处理有children的路由组', () => {
      const route: Route = {
        path: '/parent',
        children: [{ path: '/child', component: createMockComponent() }]
      }

      expect(() => {
        normalizeRouteComponent(route)
      }).not.toThrow()
    })
  })

  describe('normalizeInjectProps', () => {
    it('应该正确处理true值', () => {
      const route: Route = {
        path: '/user',
        component: createMockComponent(),
        props: true
      }

      normalizeInjectProps(route)

      expect(route.props).toEqual({ default: true })
    })

    it('应该正确处理对象值', () => {
      const route: Route = {
        path: '/user',
        component: createMockComponent(),
        props: { id: '123' }
      }

      normalizeInjectProps(route)

      expect(route.props).toEqual({ default: { id: '123' } })
    })

    it('应该正确处理函数值', () => {
      const propsHandler = vi.fn()
      const route: Route = {
        path: '/user',
        component: createMockComponent(),
        props: propsHandler
      }

      normalizeInjectProps(route)

      expect(route.props).toEqual({ default: propsHandler })
    })

    it('应该正确处理命名视图的props', () => {
      const route: Route = {
        path: '/layout',
        component: {
          default: createMockComponent(),
          sidebar: createMockComponent()
        },
        props: {
          default: { title: 'Main' },
          sidebar: { collapsed: false }
        }
      }

      normalizeInjectProps(route)

      expect(route.props).toEqual({
        default: { title: 'Main' },
        sidebar: { collapsed: false }
      })
    })

    it('应该为命名视图设置默认props', () => {
      const route: Route = {
        path: '/layout',
        component: {
          default: createMockComponent(),
          sidebar: createMockComponent()
        },
        props: {
          default: { title: 'Main' }
        } as any
      }

      normalizeInjectProps(route)

      expect(route.props).toEqual({
        default: { title: 'Main' },
        sidebar: true
      })
    })

    it('应该在命名视图使用非对象props时抛出错误', () => {
      const route: Route = {
        path: '/layout',
        component: {
          default: createMockComponent(),
          sidebar: createMockComponent()
        },
        props: true as any
      }

      expect(() => {
        normalizeInjectProps(route)
      }).toThrow(
        '[Router] Invalid route configuration for "/layout": "props" must be an object with view names as keys when using named views (e.g., { default: true, sidebar: {} })'
      )
    })

    it('应该在props类型无效时抛出错误', () => {
      const route: Route = {
        path: '/user',
        component: createMockComponent(),
        props: 'invalid' as any
      }

      expect(() => {
        normalizeInjectProps(route)
      }).toThrow(
        '[Router] Invalid route configuration for "/user": "props" has invalid type, only boolean, object, or function types are supported'
      )
    })

    it('应该在命名视图props值无效时抛出错误', () => {
      const route: Route = {
        path: '/layout',
        component: {
          default: createMockComponent()
        },
        props: {
          default: 'invalid' as any
        }
      }

      expect(() => {
        normalizeInjectProps(route)
      }).toThrow(
        '[Router] Invalid route configuration for "/layout": "props.default" has invalid type, only boolean, object, or function types are supported'
      )
    })

    it('应该在没有component时直接返回', () => {
      const route: Route = {
        path: '/home',
        children: []
      }

      expect(() => {
        normalizeInjectProps(route)
      }).not.toThrow()
    })
  })
})
