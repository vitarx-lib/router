import { beforeEach, describe, expect, it, vi } from 'vitest'
import RouterRegistry from '../../src/core/router-registry.js'
import type { Route, RouterOptions } from '../../src/index.js'

function createMockComponent() {
  return vi.fn()
}

class TestRouterRegistry extends RouterRegistry {
  constructor(options: RouterOptions) {
    super(options)
    this.setupRoutes(this._options.routes)
  }

  protected initializeRouter(): void {}
}

describe('RouterRegistry', () => {
  let registry: TestRouterRegistry

  const basicRoutes: Route[] = [
    { path: '/', component: createMockComponent() },
    { path: '/home', component: createMockComponent() },
    { path: '/about', component: createMockComponent() }
  ]

  beforeEach(() => {
    registry = new TestRouterRegistry({ routes: [] })
  })

  describe('构造函数', () => {
    it('应该使用默认值初始化配置', () => {
      expect(registry.options.base).toBe('/')
      expect(registry.options.mode).toBe('path')
      expect(registry.options.strict).toBe(false)
      expect(registry.options.scrollBehavior).toBe('auto')
      expect(registry.options.suffix).toBe('*')
    })

    it('应该正确处理base路径', () => {
      const customRegistry = new TestRouterRegistry({
        routes: [],
        base: '/app'
      })
      expect(customRegistry.options.base).toBe('/app')
    })

    it('应该正确处理带斜杠的base路径', () => {
      const customRegistry = new TestRouterRegistry({
        routes: [],
        base: '//app//'
      })
      expect(customRegistry.options.base).toBe('/app')
    })

    it('应该正确处理suffix配置', () => {
      const customRegistry = new TestRouterRegistry({
        routes: [],
        suffix: '.html'
      })
      expect(customRegistry.options.suffix).toBe('html')
    })

    it('应该正确处理suffix数组配置', () => {
      const customRegistry = new TestRouterRegistry({
        routes: [],
        suffix: ['.html', '.htm']
      })
      expect(customRegistry.options.suffix).toEqual(['html', 'htm'])
    })

    it('应该在missing配置无效时抛出错误', () => {
      expect(() => {
        new TestRouterRegistry({
          routes: [],
          missing: 'invalid' as any
        })
      }).toThrow('[Router]：missing配置无效')
    })
  })

  describe('addRoute', () => {
    it('应该正确添加路由', () => {
      registry.addRoute({ path: '/new', component: createMockComponent() })

      expect(registry.findRoute('/new')).toBeDefined()
    })

    it('应该正确添加带名称的路由', () => {
      registry.addRoute({
        path: '/user',
        name: 'user',
        component: createMockComponent()
      })

      expect(registry.findNamedRoute('user')).toBeDefined()
      expect(registry.findRoute('/user')).toBeDefined()
    })

    it('应该正确添加子路由', () => {
      registry.addRoute({ path: '/parent', component: createMockComponent() })
      registry.addRoute({ path: '/child', component: createMockComponent() }, '/parent')

      const parent = registry.findRoute('/parent')
      expect(parent?.children.length).toBe(1)
    })

    it('应该在父路由不存在时抛出错误', () => {
      expect(() => {
        registry.addRoute({ path: '/child', component: createMockComponent() }, '/nonexistent')
      }).toThrow('[Vitarx.Router.addRoute][ERROR]：父路由/nonexistent不存在')
    })
  })

  describe('removeRoute', () => {
    it('应该正确删除路由', () => {
      registry.addRoute({ path: '/test', component: createMockComponent() })
      expect(registry.findRoute('/test')).toBeDefined()

      const removed = registry.removeRoute('/test')

      expect(removed).toBeDefined()
      expect(removed?.path).toBe('/test')
      expect(registry.findRoute('/test')).toBeUndefined()
    })

    it('应该正确删除命名路由', () => {
      registry.addRoute({
        path: '/user',
        name: 'user',
        component: createMockComponent()
      })

      const removed = registry.removeRoute('user')

      expect(removed).toBeDefined()
      expect(registry.findNamedRoute('user')).toBeUndefined()
    })

    it('应该在路由不存在时返回undefined', () => {
      const removed = registry.removeRoute('/nonexistent')
      expect(removed).toBeUndefined()
    })
  })

  describe('findRoute', () => {
    beforeEach(() => {
      registry = new TestRouterRegistry({
        routes: [
          { path: '/home', component: createMockComponent() },
          { path: '/user/{id}', component: createMockComponent() },
          { name: 'about', path: '/about', component: createMockComponent() }
        ]
      })
    })

    it('应该通过路径查找路由', () => {
      const route = registry.findRoute('/home')
      expect(route).toBeDefined()
      expect(route?.path).toBe('/home')
    })

    it('应该通过名称查找路由', () => {
      const route = registry.findRoute('about')
      expect(route).toBeDefined()
      expect(route?.name).toBe('about')
    })

    it('应该正确匹配动态路由', () => {
      const target = { index: '/user/123' } as any
      const route = registry.findRoute(target)

      expect(route).toBeDefined()
      expect(route?.path).toBe('/user/{id}')
      expect(target.params).toEqual({ id: '123' })
    })

    it('应该在路由不存在时返回undefined', () => {
      expect(registry.findRoute('/nonexistent')).toBeUndefined()
    })

    it('应该在索引类型错误时抛出错误', () => {
      expect(() => {
        registry.findRoute(123 as any)
      }).toThrow('[Router]: findRoute() 路由索引123类型错误，必须给定字符串类型')
    })
  })

  describe('findPathRoute', () => {
    beforeEach(() => {
      registry = new TestRouterRegistry({
        routes: [{ path: '/Home', component: createMockComponent() }]
      })
    })

    it('应该正确查找路径路由', () => {
      const route = registry.findPathRoute('/Home')
      expect(route).toBeDefined()
    })

    it('应该在非严格模式下忽略大小写', () => {
      const route = registry.findPathRoute('/home')
      expect(route).toBeDefined()
    })
  })

  describe('findNamedRoute', () => {
    beforeEach(() => {
      registry = new TestRouterRegistry({
        routes: [{ name: 'home', path: '/', component: createMockComponent() }]
      })
    })

    it('应该正确查找命名路由', () => {
      const route = registry.findNamedRoute('home')
      expect(route).toBeDefined()
      expect(route?.name).toBe('home')
    })

    it('应该在路由不存在时返回undefined', () => {
      expect(registry.findNamedRoute('nonexistent')).toBeUndefined()
    })
  })

  describe('matchRoute', () => {
    beforeEach(() => {
      registry = new TestRouterRegistry({
        routes: [
          { path: '/', component: createMockComponent() },
          { path: '/home', component: createMockComponent() },
          { path: '/user/{id}', component: createMockComponent() },
          { path: '/post/{id?}', component: createMockComponent() },
          { path: '/category/{type}/{id}', component: createMockComponent() },
          { path: '/index', component: createMockComponent() }
        ]
      })
    })

    it('应该正确匹配静态路由', () => {
      const result = registry.matchRoute('/home')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/home')
      expect(result?.params).toBeUndefined()
    })

    it('应该正确匹配动态路由', () => {
      const result = registry.matchRoute('/user/123')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/user/{id}')
      expect(result?.params).toEqual({ id: '123' })
    })

    it('应该正确匹配可选参数路由', () => {
      const withParam = registry.matchRoute('/post/123')
      expect(withParam?.params).toEqual({ id: '123' })

      const withoutParam = registry.matchRoute('/post')
      expect(withoutParam).toBeDefined()
    })

    it('应该正确匹配多参数路由', () => {
      const result = registry.matchRoute('/category/article/456')
      expect(result).toBeDefined()
      expect(result?.params).toEqual({ type: 'article', id: '456' })
    })

    it('应该正确匹配根路由', () => {
      const result = registry.matchRoute('/')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/')
    })

    it('应该在未匹配时返回null', () => {
      const result = registry.matchRoute('/nonexistent')
      expect(result).toBeNull()
    })

    it('应该正确处理后缀匹配', () => {
      const suffixRegistry = new TestRouterRegistry({
        routes: [{ path: '/page', component: createMockComponent(), suffix: 'html' }]
      })

      const result = suffixRegistry.matchRoute('/page.html')
      expect(result).toBeDefined()

      const noSuffix = suffixRegistry.matchRoute('/page')
      expect(noSuffix).toBeNull()
    })
  })

  describe('动态路由', () => {
    it('应该正确注册动态路由', () => {
      registry = new TestRouterRegistry({
        routes: [{ path: '/user/{id}', component: createMockComponent() }]
      })

      expect(registry.dynamicRoutes.size).toBeGreaterThan(0)
    })

    it('应该正确匹配动态路由参数', () => {
      registry = new TestRouterRegistry({
        routes: [
          {
            path: '/user/{id}',
            component: createMockComponent(),
            pattern: { id: /^\d+$/ }
          }
        ]
      })

      const validResult = registry.matchRoute('/user/123')
      expect(validResult).toBeDefined()

      const invalidResult = registry.matchRoute('/user/abc')
      expect(invalidResult).toBeNull()
    })
  })

  describe('重复路由检测', () => {
    it('应该在检测到重复路径时抛出错误', () => {
      expect(() => {
        new TestRouterRegistry({
          routes: [
            { path: '/home', component: createMockComponent() },
            { path: '/home', component: createMockComponent() }
          ]
        })
      }).toThrow('[Router]：检测到重复的路由路径(path): /home')
    })

    it('应该在检测到重复名称时抛出错误', () => {
      expect(() => {
        new TestRouterRegistry({
          routes: [
            { name: 'home', path: '/', component: createMockComponent() },
            { name: 'home', path: '/home', component: createMockComponent() }
          ]
        })
      }).toThrow('[Router]：检测到重复的路由名称(name): home')
    })
  })

  describe('属性访问器', () => {
    beforeEach(() => {
      registry = new TestRouterRegistry({ routes: basicRoutes })
    })

    it('应该正确返回mode', () => {
      expect(registry.mode).toBe('path')
    })

    it('应该正确返回basePath', () => {
      expect(registry.basePath).toBe('/')
    })

    it('应该正确返回routes', () => {
      expect(registry.routes.length).toBe(3)
    })

    it('应该正确返回pathRoutes', () => {
      expect(registry.pathRoutes.size).toBe(3)
    })

    it('应该正确返回namedRoutes', () => {
      expect(registry.namedRoutes.size).toBe(0)
    })
  })
})
