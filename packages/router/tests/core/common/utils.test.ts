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
  resolveNavTarget,
  runLeaveGuards,
  runRouteUpdateHooks
} from '../../../src/core/common/utils.js'
import type { NavTarget, RouteLocation, RouteRecord } from '../../../src/core/types/index.js'

describe('common/utils', () => {
  describe('hasValidRouteIndex', () => {
    it('应该对字符串路径返回 true', () => {
      expect(hasValidRouteIndex('/home')).toBe(true)
      expect(hasValidRouteIndex('/user/123')).toBe(true)
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
    })
  })

  describe('hasValidPath', () => {
    it('应该对以 / 开头的字符串返回 true', () => {
      expect(hasValidPath('/')).toBe(true)
      expect(hasValidPath('/home')).toBe(true)
      expect(hasValidPath('/user/123')).toBe(true)
    })

    it('应该对不以 / 开头的字符串返回 false', () => {
      expect(hasValidPath('home')).toBe(false)
      expect(hasValidPath('')).toBe(false)
    })

    it('应该对非字符串返回 false', () => {
      expect(hasValidPath(123 as any)).toBe(false)
      expect(hasValidPath(null as any)).toBe(false)
    })
  })

  describe('hasValidNavTarget', () => {
    it('应该对有效的导航目标返回 true', () => {
      expect(hasValidNavTarget({ index: '/home' })).toBe(true)
      expect(hasValidNavTarget({ index: 'home', params: { id: '1' } })).toBe(true)
    })

    it('应该对无效的导航目标返回 false', () => {
      expect(hasValidNavTarget({})).toBe(false)
      expect(hasValidNavTarget({ index: 123 })).toBe(false)
      expect(hasValidNavTarget(null)).toBe(false)
      expect(hasValidNavTarget('/home')).toBe(false)
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
  })

  describe('removePathSuffix', () => {
    it('应该移除指定的后缀', () => {
      expect(removePathSuffix('/page.html', '.html')).toBe('/page')
      expect(removePathSuffix('/file.min.js', '.js')).toBe('/file.min')
    })

    it('应该对不匹配后缀的路径返回原路径', () => {
      expect(removePathSuffix('/page', '.html')).toBe('/page')
      expect(removePathSuffix('/page.htm', '.html')).toBe('/page.htm')
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
  })

  describe('processGuardResult', () => {
    it('应该对 false 返回 false', () => {
      expect(processGuardResult(false)).toBe(false)
    })

    it('应该对字符串返回导航目标', () => {
      const result = processGuardResult('/home')
      expect(result).toEqual({ index: '/home' })
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
  })

  describe('runLeaveGuards', () => {
    it('应该在没有守卫时返回 true', async () => {
      const from = {} as RouteLocation
      const to = {} as RouteLocation
      const result = await runLeaveGuards(to, from)
      expect(result).toBe(true)
    })
  })

  describe('runRouteUpdateHooks', () => {
    it('应该调用所有更新钩子', () => {
      const hook1 = vi.fn()
      const hook2 = vi.fn()
      const from = { beforeUpdateHooks: [hook1, hook2] } as unknown as RouteLocation
      const to = {} as RouteLocation
      runRouteUpdateHooks(to, from)
      expect(hook1).toHaveBeenCalledWith(to, from)
      expect(hook2).toHaveBeenCalledWith(to, from)
    })

    it('应该在没有钩子时不报错', () => {
      const from = {} as RouteLocation
      const to = {} as RouteLocation
      expect(() => runRouteUpdateHooks(to, from)).not.toThrow()
    })
  })
})
