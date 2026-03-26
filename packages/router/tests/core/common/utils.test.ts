import { describe, expect, it, vi } from 'vitest'
import {
  hasOnlyChangeHash,
  hasValidNavTarget,
  hasValidPath,
  hasValidRouteIndex,
  parseHashContent,
  processGuardResult,
  registerHookTool,
  removePathSuffix,
  resolveNavTarget
} from '../../../src/core/common/utils.js'
import type { NavTarget, RouteLocation, RouteRecord } from '../../../src/core/types/index.js'

describe('common/utils', () => {
  describe('hasValidRouteIndex', () => {
    it('应该对字符串路径返回 true', () => {
      expect(hasValidRouteIndex('/home')).toBe(true)
      expect(hasValidRouteIndex('/user/123')).toBe(true)
      expect(hasValidRouteIndex('home')).toBe(true)
      expect(hasValidRouteIndex('')).toBe(true)
    })

    it('应该对 symbol 返回 true', () => {
      const sym = Symbol('route')
      expect(hasValidRouteIndex(sym)).toBe(true)
    })

    it('应该对其他类型返回 false', () => {
      expect(hasValidRouteIndex(123)).toBe(false)
      expect(hasValidRouteIndex(null)).toBe(false)
      expect(hasValidRouteIndex(undefined)).toBe(false)
      expect(hasValidRouteIndex({})).toBe(false)
      expect(hasValidRouteIndex([])).toBe(false)
      expect(hasValidRouteIndex(true)).toBe(false)
      expect(hasValidRouteIndex(false)).toBe(false)
    })
  })

  describe('hasValidPath', () => {
    it('应该对以 / 开头的字符串返回 true', () => {
      expect(hasValidPath('/')).toBe(true)
      expect(hasValidPath('/home')).toBe(true)
      expect(hasValidPath('/user/123')).toBe(true)
      expect(hasValidPath('/a/b/c/d')).toBe(true)
    })

    it('应该对不以 / 开头的字符串返回 false', () => {
      expect(hasValidPath('home')).toBe(false)
      expect(hasValidPath('')).toBe(false)
      expect(hasValidPath('./home')).toBe(false)
      expect(hasValidPath('../home')).toBe(false)
    })

    it('应该对非字符串返回 false', () => {
      expect(hasValidPath(123 as any)).toBe(false)
      expect(hasValidPath(null as any)).toBe(false)
      expect(hasValidPath(undefined as any)).toBe(false)
      expect(hasValidPath({} as any)).toBe(false)
      expect(hasValidPath([] as any)).toBe(false)
      expect(hasValidPath(true as any)).toBe(false)
    })
  })

  describe('hasValidNavTarget', () => {
    it('应该对有效的导航目标返回 true', () => {
      expect(hasValidNavTarget({ index: '/home' })).toBe(true)
      expect(hasValidNavTarget({ index: 'home', params: { id: '1' } })).toBe(true)
      expect(hasValidNavTarget({ index: Symbol('route') })).toBe(true)
      expect(hasValidNavTarget({ index: '/home', query: { search: 'test' } })).toBe(true)
      expect(hasValidNavTarget({ index: '/home', hash: '#section' })).toBe(true)
    })

    it('应该对无效的导航目标返回 false', () => {
      expect(hasValidNavTarget({})).toBe(false)
      expect(hasValidNavTarget({ index: 123 })).toBe(false)
      expect(hasValidNavTarget({ index: null })).toBe(false)
      expect(hasValidNavTarget({ index: undefined })).toBe(false)
      expect(hasValidNavTarget({ index: {} })).toBe(false)
      expect(hasValidNavTarget({ index: [] })).toBe(false)
      expect(hasValidNavTarget(null)).toBe(false)
      expect(hasValidNavTarget('/home')).toBe(false)
      expect(hasValidNavTarget(123)).toBe(false)
      expect(hasValidNavTarget(undefined)).toBe(false)
      expect(hasValidNavTarget([])).toBe(false)
    })
  })

  describe('hasOnlyChangeHash', () => {
    const createRoute = (
      path: string,
      hash: string,
      query: Record<string, string> = {}
    ): RouteLocation => {
      return {
        path,
        hash,
        query,
        href: path,
        params: {},
        matched: [],
        meta: {}
      } as RouteLocation
    }

    it('应该对只有 hash 不同的路由返回 true', () => {
      const route1 = createRoute('/home', '#section1')
      const route2 = createRoute('/home', '#section2')
      expect(hasOnlyChangeHash(route1, route2)).toBe(true)
    })

    it('应该对路径不同的路由返回 false', () => {
      const route1 = createRoute('/home', '#section')
      const route2 = createRoute('/about', '#section')
      expect(hasOnlyChangeHash(route1, route2)).toBe(false)
    })

    it('应该对查询参数不同的路由返回 false', () => {
      const route1 = createRoute('/home', '#section', { id: '1' })
      const route2 = createRoute('/home', '#section', { id: '2' })
      expect(hasOnlyChangeHash(route1, route2)).toBe(false)
    })

    it('应该对完全相同的路由返回 false', () => {
      const route1 = createRoute('/home', '#section')
      const route2 = createRoute('/home', '#section')
      expect(hasOnlyChangeHash(route1, route2)).toBe(false)
    })

    it('应该对空 hash 和有 hash 的路由返回 true', () => {
      const route1 = createRoute('/home', '')
      const route2 = createRoute('/home', '#section')
      expect(hasOnlyChangeHash(route1, route2)).toBe(true)
    })

    it('应该对有 hash 和空 hash 的路由返回 true', () => {
      const route1 = createRoute('/home', '#section')
      const route2 = createRoute('/home', '')
      expect(hasOnlyChangeHash(route1, route2)).toBe(true)
    })

    it('应该对相同查询参数的路由返回 true（当只有 hash 不同）', () => {
      const route1 = createRoute('/home', '#section1', { id: '1' })
      const route2 = createRoute('/home', '#section2', { id: '1' })
      expect(hasOnlyChangeHash(route1, route2)).toBe(true)
    })

    it('应该对空查询参数的路由返回 true（当只有 hash 不同）', () => {
      const route1 = createRoute('/home', '#section1', {})
      const route2 = createRoute('/home', '#section2', {})
      expect(hasOnlyChangeHash(route1, route2)).toBe(true)
    })
  })

  describe('removePathSuffix', () => {
    it('应该移除指定的后缀', () => {
      expect(removePathSuffix('/page.html', '.html')).toBe('/page')
      expect(removePathSuffix('/file.min.js', '.js')).toBe('/file.min')
      expect(removePathSuffix('/index.htm', '.htm')).toBe('/index')
    })

    it('应该对不匹配后缀的路径返回原路径', () => {
      expect(removePathSuffix('/page', '.html')).toBe('/page')
      expect(removePathSuffix('/page.htm', '.html')).toBe('/page.htm')
      expect(removePathSuffix('/page.html', '.htm')).toBe('/page.html')
    })

    it('应该只移除结尾的后缀', () => {
      expect(removePathSuffix('/page.html.html', '.html')).toBe('/page.html')
      expect(removePathSuffix('/file.js.min.js', '.js')).toBe('/file.js.min')
    })

    it('应该正确处理空路径', () => {
      expect(removePathSuffix('', '.html')).toBe('')
    })

    it('应该正确处理后缀等于路径的情况', () => {
      expect(removePathSuffix('.html', '.html')).toBe('')
    })

    it('应该正确处理多个点号的后缀', () => {
      expect(removePathSuffix('/file.min.js.map', '.js.map')).toBe('/file.min')
    })
  })

  describe('parseHashContent', () => {
    it('应该正确解析路径', () => {
      const result = parseHashContent('/home')
      expect(result.path).toBe('/home')
      expect(result.query).toEqual({})
      expect(result.hash).toBe('')
    })

    it('应该正确解析查询参数', () => {
      const result = parseHashContent('/home?a=1&b=2')
      expect(result.path).toBe('/home')
      expect(result.query).toEqual({ a: '1', b: '2' })
    })

    it('应该正确解析 hash', () => {
      const result = parseHashContent('/home#section')
      expect(result.path).toBe('/home')
      expect(result.hash).toBe('#section')
    })

    it('应该正确解析完整路径', () => {
      const result = parseHashContent('/home?a=1&b=2#section')
      expect(result.path).toBe('/home')
      expect(result.query).toEqual({ a: '1', b: '2' })
      expect(result.hash).toBe('#section')
    })

    it('应该正确处理空路径', () => {
      const result = parseHashContent('')
      expect(result.path).toBe('/')
    })

    it('应该正确处理只有 hash 的路径', () => {
      const result = parseHashContent('#section')
      expect(result.path).toBe('/')
      expect(result.hash).toBe('#section')
    })

    it('应该正确处理只有查询参数的路径', () => {
      const result = parseHashContent('?a=1&b=2')
      expect(result.path).toBe('/')
      expect(result.query).toEqual({ a: '1', b: '2' })
    })

    it('应该正确处理查询参数和 hash', () => {
      const result = parseHashContent('?a=1#section')
      expect(result.path).toBe('/')
      expect(result.query).toEqual({ a: '1' })
      expect(result.hash).toBe('#section')
    })

    it('应该正确解码 hash 中的特殊字符', () => {
      const result = parseHashContent('/home#%E4%B8%AD%E6%96%87')
      expect(result.hash).toBe('#中文')
    })

    it('应该正确处理带空格的路径', () => {
      const result = parseHashContent('  /home  ')
      expect(result.path).toBe('/home')
    })

    it('应该正确处理重复斜杠的路径', () => {
      const result = parseHashContent('//home//page')
      expect(result.path).toBe('/home/page')
    })

    it('应该正确处理带多个 # 的路径', () => {
      const result = parseHashContent('/home#section1#section2')
      expect(result.hash).toBe('#section1')
    })

    it('应该正确处理带多个 ? 的路径', () => {
      const result = parseHashContent('/home?a=1?b=2')
      expect(result.query).toEqual({ a: '1' })
    })

    it('应该正确处理空查询参数', () => {
      const result = parseHashContent('/home?')
      expect(result.query).toEqual({})
    })

    it('应该正确处理空 hash', () => {
      const result = parseHashContent('/home#')
      expect(result.hash).toBe('')
    })
  })

  describe('processGuardResult', () => {
    it('应该对 false 返回 false', () => {
      expect(processGuardResult(false)).toBe(false)
    })

    it('应该对非空字符串返回导航目标', () => {
      const result = processGuardResult('/home')
      expect(result).toEqual({ index: '/home' })
    })

    it('应该对空字符串返回 true', () => {
      expect(processGuardResult('')).toBe(true)
    })

    it('应该对 symbol 返回导航目标', () => {
      const sym = Symbol('route')
      const result = processGuardResult(sym)
      expect(result).toEqual({ index: sym })
    })

    it('应该对导航目标对象直接返回', () => {
      const target: NavTarget = { index: '/home', params: { id: '1' } }
      expect(processGuardResult(target)).toBe(target)
    })

    it('应该对其他值返回 true', () => {
      expect(processGuardResult(true)).toBe(true)
      expect(processGuardResult(undefined)).toBe(true)
      expect(processGuardResult(null as any)).toBe(true)
      expect(processGuardResult(0 as any)).toBe(true)
      expect(processGuardResult({} as any)).toBe(true)
      expect(processGuardResult([] as any)).toBe(true)
    })

    it('应该正确处理带 query 的导航目标', () => {
      const target: NavTarget = { index: '/home', query: { search: 'test' } }
      expect(processGuardResult(target)).toBe(target)
    })

    it('应该正确处理带 hash 的导航目标', () => {
      const target: NavTarget = { index: '/home', hash: '#section' }
      expect(processGuardResult(target)).toBe(target)
    })
  })

  describe('resolveNavTarget', () => {
    it('应该将字符串转换为导航目标', () => {
      const result = resolveNavTarget('/home')
      expect(result).toEqual({ index: '/home' })
    })

    it('应该将 symbol 转换为导航目标', () => {
      const sym = Symbol('route')
      const result = resolveNavTarget(sym)
      expect(result).toEqual({ index: sym })
    })

    it('应该对导航目标对象直接返回', () => {
      const target: NavTarget = { index: '/home' }
      expect(resolveNavTarget(target)).toBe(target)
    })

    it('应该从路由位置对象提取信息', () => {
      const routeLocation = {
        path: '/user/123',
        params: { id: '123' },
        query: { search: 'test' },
        matched: [{ path: '/user/{id}', name: 'user' } as unknown as RouteRecord]
      } as unknown as RouteLocation
      const result = resolveNavTarget(routeLocation)
      expect(result.index).toBe('user')
      expect(result.params).toEqual({ id: '123' })
      expect(result.query).toEqual({ search: 'test' })
    })

    it('应该对无效输入抛出错误', () => {
      expect(() => resolveNavTarget(123 as any)).toThrow('Invalid navigation target')
    })

    it('应该对 null 抛出错误', () => {
      expect(() => resolveNavTarget(null as any)).toThrow('Invalid navigation target')
    })

    it('应该对 undefined 抛出错误', () => {
      expect(() => resolveNavTarget(undefined as any)).toThrow('Invalid navigation target')
    })

    it('应该对空对象抛出错误', () => {
      expect(() => resolveNavTarget({} as any)).toThrow('Invalid navigation target')
    })

    it('应该对没有 matched 的路由位置使用 path 作为 index', () => {
      const routeLocation = {
        path: '/user/123',
        params: { id: '123' },
        query: { search: 'test' },
        matched: []
      } as unknown as RouteLocation
      const result = resolveNavTarget(routeLocation)
      expect(result.index).toBe('/user/123')
      expect(result.params).toEqual({ id: '123' })
      expect(result.query).toEqual({ search: 'test' })
    })

    it('应该对 matched 中最后一个没有 name 的路由使用 path', () => {
      const routeLocation = {
        path: '/user/123',
        params: { id: '123' },
        query: {},
        matched: [{ path: '/user/{id}' } as unknown as RouteRecord]
      } as unknown as RouteLocation
      const result = resolveNavTarget(routeLocation)
      expect(result.index).toBe('/user/123')
    })

    it('应该正确处理带 query 的导航目标', () => {
      const target: NavTarget = { index: '/home', query: { search: 'test' } }
      expect(resolveNavTarget(target)).toBe(target)
    })

    it('应该正确处理带 hash 的导航目标', () => {
      const target: NavTarget = { index: '/home', hash: '#section' }
      expect(resolveNavTarget(target)).toBe(target)
    })

    it('应该正确处理带 params 的导航目标', () => {
      const target: NavTarget = { index: 'user', params: { id: '123' } }
      expect(resolveNavTarget(target)).toBe(target)
    })
  })

  describe('registerHookTool', () => {
    it('应该创建新的 Set 并添加钩子', () => {
      const hooks: { beforeEach: Set<any> | null } = { beforeEach: null }
      const hook = vi.fn()
      registerHookTool(hooks, 'beforeEach', hook)
      expect(hooks.beforeEach).toBeInstanceOf(Set)
      expect(hooks.beforeEach!.has(hook)).toBe(true)
    })

    it('应该向现有 Set 添加钩子', () => {
      const existingHook = vi.fn()
      const hooks: { beforeEach: Set<any> | null } = { beforeEach: new Set([existingHook]) }
      const newHook = vi.fn()
      registerHookTool(hooks, 'beforeEach', newHook)
      expect(hooks.beforeEach!.size).toBe(2)
      expect(hooks.beforeEach!.has(newHook)).toBe(true)
    })

    it('应该支持多个钩子类型', () => {
      const hooks: { beforeEach: Set<any> | null; afterEach: Set<any> | null } = {
        beforeEach: null,
        afterEach: null
      }
      const beforeHook = vi.fn()
      const afterHook = vi.fn()
      registerHookTool(hooks, 'beforeEach', beforeHook)
      registerHookTool(hooks, 'afterEach', afterHook)
      expect(hooks.beforeEach!.has(beforeHook)).toBe(true)
      expect(hooks.afterEach!.has(afterHook)).toBe(true)
    })

    it('应该允许添加多个相同的钩子', () => {
      const hooks: { beforeEach: Set<any> | null } = { beforeEach: null }
      const hook = vi.fn()
      registerHookTool(hooks, 'beforeEach', hook)
      registerHookTool(hooks, 'beforeEach', hook)
      expect(hooks.beforeEach!.size).toBe(1)
    })
  })
})
