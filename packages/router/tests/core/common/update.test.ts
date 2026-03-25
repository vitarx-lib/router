import { describe, expect, it } from 'vitest'
import { updateRouteLocation } from '../../../src/core/common/update.js'
import type { RouteLocation, RouteLocationRaw, RouteRecord } from '../../../src/core/types/index.js'

describe('common/update', () => {
  const createRouteRecord = (path: string): RouteRecord =>
    ({ path, isGroup: false }) as unknown as RouteRecord

  const createRouteLocation = (overrides: Partial<RouteLocation> = {}): RouteLocation =>
    ({
      path: '/home',
      href: '/home',
      hash: '' as const,
      params: {},
      query: {},
      meta: {},
      matched: [createRouteRecord('/home')],
      ...overrides
    }) as RouteLocation

  const createRouteLocationRaw = (overrides: Partial<RouteLocationRaw> = {}): RouteLocationRaw =>
    ({
      path: '/home',
      href: '/home',
      hash: '' as const,
      params: {},
      query: {},
      meta: {},
      matched: [createRouteRecord('/home')],
      ...overrides
    }) as RouteLocationRaw

  describe('updateRouteLocation', () => {
    it('应该更新 href', () => {
      const current = createRouteLocationRaw({ href: '/home' })
      const newLocation = createRouteLocation({ href: '/home?id=123' })

      updateRouteLocation(current, newLocation)

      expect(current.href).toBe('/home?id=123')
    })

    it('应该更新 path', () => {
      const current = createRouteLocationRaw({ path: '/home' })
      const newLocation = createRouteLocation({ path: '/about' })

      updateRouteLocation(current, newLocation)

      expect(current.path).toBe('/about')
    })

    it('应该更新 hash', () => {
      const current = createRouteLocationRaw({ hash: '' })
      const newLocation = createRouteLocation({ hash: '#section' })

      updateRouteLocation(current, newLocation)

      expect(current.hash).toBe('#section')
    })

    it('应该更新 matched 数组', () => {
      const matched1 = createRouteRecord('/home')
      const matched2 = createRouteRecord('/home/detail')
      const current = createRouteLocationRaw({ matched: [matched1] })
      const newLocation = createRouteLocation({ matched: [matched1, matched2] })

      updateRouteLocation(current, newLocation)

      expect(current.matched).toHaveLength(2)
      expect(current.matched[0]).toBe(matched1)
      expect(current.matched[1]).toBe(matched2)
    })

    it('应该截断过长的 matched 数组', () => {
      const matched1 = createRouteRecord('/home')
      const matched2 = createRouteRecord('/home/detail')
      const current = createRouteLocationRaw({ matched: [matched1, matched2] })
      const newLocation = createRouteLocation({ matched: [matched1] })

      updateRouteLocation(current, newLocation)

      expect(current.matched).toHaveLength(1)
      expect(current.matched[0]).toBe(matched1)
    })

    it('应该更新 params 对象', () => {
      const current = createRouteLocationRaw({ params: { id: '123', name: 'old' } })
      const newLocation = createRouteLocation({ params: { id: '456' } })

      updateRouteLocation(current, newLocation)

      expect(current.params).toEqual({ id: '456' })
    })

    it('应该删除被清空的 params', () => {
      const current = createRouteLocationRaw({ params: { id: '123' } })
      const newLocation = createRouteLocation({ params: {} })

      updateRouteLocation(current, newLocation)

      expect(current.params).toEqual({})
      expect('id' in current.params).toBe(false)
    })

    it('应该更新 query 对象', () => {
      const current = createRouteLocationRaw({ query: { search: 'old', page: '1' } })
      const newLocation = createRouteLocation({ query: { search: 'new' } })

      updateRouteLocation(current, newLocation)

      expect(current.query).toEqual({ search: 'new' })
    })

    it('应该删除被清空的 query', () => {
      const current = createRouteLocationRaw({ query: { search: 'test' } })
      const newLocation = createRouteLocation({ query: {} })

      updateRouteLocation(current, newLocation)

      expect(current.query).toEqual({})
      expect('search' in current.query).toBe(false)
    })

    it('应该更新 meta 对象', () => {
      const current = createRouteLocationRaw({ meta: { title: 'Old', auth: true } })
      const newLocation = createRouteLocation({ meta: { title: 'New' } })

      updateRouteLocation(current, newLocation)

      expect(current.meta).toEqual({ title: 'New' })
    })

    it('应该删除被清空的 meta', () => {
      const current = createRouteLocationRaw({ meta: { title: 'Home' } })
      const newLocation = createRouteLocation({ meta: {} })

      updateRouteLocation(current, newLocation)

      expect(current.meta).toEqual({})
      expect('title' in current.meta).toBe(false)
    })

    it('应该设置 redirectFrom', () => {
      const redirectFrom = createRouteLocation({ path: '/old' })
      const current = createRouteLocationRaw({ redirectFrom: undefined })
      const newLocation = createRouteLocation({ redirectFrom })

      updateRouteLocation(current, newLocation)

      expect(current.redirectFrom).toBeDefined()
      expect(current.redirectFrom?.path).toBe('/old')
    })

    it('应该清除 redirectFrom', () => {
      const current = createRouteLocationRaw({
        redirectFrom: createRouteLocation({ path: '/old' })
      })
      const newLocation = createRouteLocation({ redirectFrom: undefined })

      updateRouteLocation(current, newLocation)

      expect(current.redirectFrom).toBeUndefined()
    })

    it('应该保持未变化的 matched 项引用不变', () => {
      const matched1 = createRouteRecord('/home')
      const matched2 = createRouteRecord('/home/detail')
      const matched3 = createRouteRecord('/home/detail/edit')
      const current = createRouteLocationRaw({ matched: [matched1, matched2] })
      const newLocation = createRouteLocation({ matched: [matched1, matched3] })

      updateRouteLocation(current, newLocation)

      expect(current.matched[0]).toBe(matched1)
      expect(current.matched[1]).toBe(matched3)
    })

    it('应该处理从空 matched 到有 matched', () => {
      const matched1 = createRouteRecord('/home')
      const current = createRouteLocationRaw({ matched: [] })
      const newLocation = createRouteLocation({ matched: [matched1] })

      updateRouteLocation(current, newLocation)

      expect(current.matched).toHaveLength(1)
      expect(current.matched[0]).toBe(matched1)
    })

    it('应该处理从有 matched 到空 matched', () => {
      const matched1 = createRouteRecord('/home')
      const current = createRouteLocationRaw({ matched: [matched1] })
      const newLocation = createRouteLocation({ matched: [] })

      updateRouteLocation(current, newLocation)

      expect(current.matched).toHaveLength(0)
    })
  })
})
