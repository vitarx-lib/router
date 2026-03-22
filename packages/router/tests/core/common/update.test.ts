import { describe, expect, it } from 'vitest'
import {
  isSameRouteLocation,
  updateRouteLocation
} from '../../../src/core/common/update.js'
import type { RouteLocation, RouteLocationRaw, RouteRecord } from '../../../src/core/types/index.js'

describe('common/update', () => {
  describe('isSameRouteLocation', () => {
    const createRouteLocation = (
      path: string,
      matched: RouteRecord[] = []
    ): RouteLocation => {
      return {
        path,
        matched,
        href: path,
        hash: '',
        params: {},
        query: {},
        meta: {}
      } as RouteLocation
    }

    it('应该对相同路径和匹配记录返回 true', () => {
      const matchedItem = { path: '/home' } as unknown as RouteRecord
      const route1 = createRouteLocation('/home', [matchedItem])
      const route2 = createRouteLocation('/home', [matchedItem])
      expect(isSameRouteLocation(route1, route2)).toBe(true)
    })

    it('应该对不同路径返回 false', () => {
      const route1 = createRouteLocation('/home')
      const route2 = createRouteLocation('/about')
      expect(isSameRouteLocation(route1, route2)).toBe(false)
    })

    it('应该对不同长度的 matched 返回 false', () => {
      const matchedItem = { path: '/home' } as unknown as RouteRecord
      const route1 = createRouteLocation('/home', [matchedItem])
      const route2 = createRouteLocation('/home', [matchedItem, matchedItem])
      expect(isSameRouteLocation(route1, route2)).toBe(false)
    })

    it('应该对不同的 matched 最后一个元素返回 false', () => {
      const matchedItem1 = { path: '/home' } as unknown as RouteRecord
      const matchedItem2 = { path: '/about' } as unknown as RouteRecord
      const route1 = createRouteLocation('/home', [matchedItem1])
      const route2 = createRouteLocation('/home', [matchedItem2])
      expect(isSameRouteLocation(route1, route2)).toBe(false)
    })

    it('应该对空 matched 数组返回 true', () => {
      const route1 = createRouteLocation('/home', [])
      const route2 = createRouteLocation('/home', [])
      expect(isSameRouteLocation(route1, route2)).toBe(true)
    })
  })

  describe('updateRouteLocation', () => {
    const createRouteLocation = (overrides: Partial<RouteLocation> = {}): RouteLocation => {
      const matchedItem = { path: '/home' } as unknown as RouteRecord
      return {
        path: '/home',
        href: '/home',
        hash: '',
        params: { id: '123' },
        query: { search: 'test' },
        matched: [matchedItem],
        meta: { title: 'Home' },
        ...overrides
      } as RouteLocation
    }

    it('应该创建新的路由位置对象', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const newLocation = createRouteLocation()
      const result = updateRouteLocation(cache, newLocation)

      expect(result.path).toBe('/home')
      expect(result.params).toEqual({ id: '123' })
      expect(result.query).toEqual({ search: 'test' })
      expect(cache.has('/home')).toBe(true)
    })

    it('应该对相同路径使用缓存进行差异化更新', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem = { path: '/home' } as unknown as RouteRecord

      const firstLocation = createRouteLocation({
        params: { id: '123' },
        query: { search: 'test' },
        matched: [matchedItem]
      })
      const firstResult = updateRouteLocation(cache, firstLocation)

      const secondLocation = createRouteLocation({
        params: { id: '456' },
        query: { search: 'new' },
        matched: [matchedItem]
      })
      const secondResult = updateRouteLocation(cache, secondLocation)

      expect(secondResult).toBe(firstResult)
      expect(secondResult.params).toEqual({ id: '456' })
      expect(secondResult.query).toEqual({ search: 'new' })
    })

    it('应该正确更新 href', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem = { path: '/home' } as unknown as RouteRecord

      const firstLocation = createRouteLocation({
        href: '/home',
        matched: [matchedItem]
      })
      updateRouteLocation(cache, firstLocation)

      const secondLocation = createRouteLocation({
        href: '/home?id=456',
        matched: [matchedItem]
      })
      const result = updateRouteLocation(cache, secondLocation)

      expect(result.href).toBe('/home?id=456')
    })

    it('应该正确更新 hash', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem = { path: '/home' } as unknown as RouteRecord

      const firstLocation = createRouteLocation({
        hash: '',
        matched: [matchedItem]
      })
      updateRouteLocation(cache, firstLocation)

      const secondLocation = createRouteLocation({
        hash: '#section',
        matched: [matchedItem]
      })
      const result = updateRouteLocation(cache, secondLocation)

      expect(result.hash).toBe('#section')
    })

    it('应该正确更新 matched 数组', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem1 = { path: '/home' } as unknown as RouteRecord
      const matchedItem2 = { path: '/home/detail' } as unknown as RouteRecord

      const firstLocation = createRouteLocation({
        matched: [matchedItem1]
      })
      const firstResult = updateRouteLocation(cache, firstLocation)
      expect(firstResult.matched).toEqual([matchedItem1])

      const secondLocation = createRouteLocation({
        matched: [matchedItem1, matchedItem2]
      })
      const secondResult = updateRouteLocation(cache, secondLocation)
      expect(secondResult.matched).toEqual([matchedItem1, matchedItem2])
    })

    it('应该正确更新 params 对象', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem = { path: '/home' } as unknown as RouteRecord

      const firstLocation = createRouteLocation({
        params: { id: '123', name: 'test' },
        matched: [matchedItem]
      })
      updateRouteLocation(cache, firstLocation)

      const secondLocation = createRouteLocation({
        params: { id: '456' },
        matched: [matchedItem]
      })
      const result = updateRouteLocation(cache, secondLocation)

      expect(result.params).toEqual({ id: '456' })
    })

    it('应该正确更新 query 对象', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem = { path: '/home' } as unknown as RouteRecord

      const firstLocation = createRouteLocation({
        query: { search: 'test', page: '1' },
        matched: [matchedItem]
      })
      updateRouteLocation(cache, firstLocation)

      const secondLocation = createRouteLocation({
        query: { search: 'new' },
        matched: [matchedItem]
      })
      const result = updateRouteLocation(cache, secondLocation)

      expect(result.query).toEqual({ search: 'new' })
    })

    it('应该正确处理 redirectFrom', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem = { path: '/home' } as unknown as RouteRecord
      const redirectFrom = { path: '/old' } as unknown as RouteLocation

      const location = createRouteLocation({
        redirectFrom,
        matched: [matchedItem]
      })
      const result = updateRouteLocation(cache, location)

      expect(result.redirectFrom).toBeDefined()
      expect(result.redirectFrom?.path).toBe('/old')
    })

    it('应该正确处理没有 redirectFrom 的情况', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem = { path: '/home' } as unknown as RouteRecord

      const firstLocation = createRouteLocation({
        redirectFrom: { path: '/old' } as unknown as RouteLocation,
        matched: [matchedItem]
      })
      updateRouteLocation(cache, firstLocation)

      const secondLocation = createRouteLocation({
        redirectFrom: undefined,
        matched: [matchedItem]
      })
      const result = updateRouteLocation(cache, secondLocation)

      expect(result.redirectFrom).toBeUndefined()
    })

    it('应该正确处理 meta 数据', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const matchedItem = { path: '/home' } as unknown as RouteRecord

      const location = createRouteLocation({
        meta: { title: 'Home', auth: true },
        matched: [matchedItem]
      })
      const result = updateRouteLocation(cache, location)

      expect(result.meta).toEqual({ title: 'Home', auth: true })
    })

    it('应该正确处理不同路径的缓存', () => {
      const cache = new Map<string, RouteLocationRaw>()
      const homeMatched = { path: '/home' } as unknown as RouteRecord
      const aboutMatched = { path: '/about' } as unknown as RouteRecord

      const homeLocation = createRouteLocation({
        path: '/home',
        matched: [homeMatched]
      })
      const homeResult = updateRouteLocation(cache, homeLocation)

      const aboutLocation = createRouteLocation({
        path: '/about',
        matched: [aboutMatched]
      })
      const aboutResult = updateRouteLocation(cache, aboutLocation)

      expect(homeResult.path).toBe('/home')
      expect(aboutResult.path).toBe('/about')
      expect(homeResult).not.toBe(aboutResult)
      expect(cache.size).toBe(2)
    })
  })
})
