import { describe, expect, it } from 'vitest'
import { patchUpdateRoute } from '../../src/core/update.js'
import type { RouteLocation, RouteNormalized } from '../../src/core/router-types.js'

function createMockRouteNormalized(path: string): RouteNormalized {
  return {
    path,
    meta: {},
    pattern: {},
    children: [],
    suffix: '*',
    component: undefined,
    props: undefined
  } as RouteNormalized
}

describe('update', () => {
  describe('patchUpdateRoute', () => {
    it('应该正确更新字符串值属性', () => {
      const location: RouteLocation = {
        __is_route_location: true,
        index: '/old',
        path: '/old',
        fullPath: '/old',
        hash: '',
        params: {},
        query: {},
        matched: [],
        meta: {},
        suffix: ''
      }

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/new',
        path: '/new',
        fullPath: '/new?test=1',
        hash: '#section',
        params: {},
        query: {},
        matched: [],
        meta: {},
        suffix: ''
      }

      patchUpdateRoute(location, newLocation)

      expect(location.index).toBe('/new')
      expect(location.path).toBe('/new')
      expect(location.fullPath).toBe('/new?test=1')
      expect(location.hash).toBe('#section')
    })

    it('应该正确更新params对象', () => {
      const location: RouteLocation = {
        __is_route_location: true,
        index: '/user',
        path: '/user',
        fullPath: '/user',
        hash: '',
        params: { id: 'old', name: 'oldName' },
        query: {},
        matched: [],
        meta: {},
        suffix: ''
      }

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/user',
        path: '/user',
        fullPath: '/user',
        hash: '',
        params: { id: 'new' },
        query: {},
        matched: [],
        meta: {},
        suffix: ''
      }

      patchUpdateRoute(location, newLocation)

      expect(location.params).toEqual({ id: 'new' })
      expect(location.params).not.toHaveProperty('name')
    })

    it('应该正确更新query对象', () => {
      const location: RouteLocation = {
        __is_route_location: true,
        index: '/search',
        path: '/search',
        fullPath: '/search',
        hash: '',
        params: {},
        query: { q: 'old', page: '1' },
        matched: [],
        meta: {},
        suffix: ''
      }

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/search',
        path: '/search',
        fullPath: '/search',
        hash: '',
        params: {},
        query: { q: 'new' },
        matched: [],
        meta: {},
        suffix: ''
      }

      patchUpdateRoute(location, newLocation)

      expect(location.query).toEqual({ q: 'new' })
      expect(location.query).not.toHaveProperty('page')
    })

    it('应该正确更新meta对象', () => {
      const location: RouteLocation = {
        __is_route_location: true,
        index: '/page',
        path: '/page',
        fullPath: '/page',
        hash: '',
        params: {},
        query: {},
        matched: [],
        meta: { title: 'Old Title', auth: true },
        suffix: ''
      }

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/page',
        path: '/page',
        fullPath: '/page',
        hash: '',
        params: {},
        query: {},
        matched: [],
        meta: { title: 'New Title' },
        suffix: ''
      }

      patchUpdateRoute(location, newLocation)

      expect(location.meta).toEqual({ title: 'New Title' })
      expect(location.meta).not.toHaveProperty('auth')
    })

    it('应该正确更新matched数组', () => {
      const matched1 = createMockRouteNormalized('/parent')
      const matched2 = createMockRouteNormalized('/parent/child')
      const matched3 = createMockRouteNormalized('/parent/child/grandchild')

      const location: RouteLocation = {
        __is_route_location: true,
        index: '/parent/child',
        path: '/parent/child',
        fullPath: '/parent/child',
        hash: '',
        params: {},
        query: {},
        matched: [matched1, matched2],
        meta: {},
        suffix: ''
      }

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/parent/child/grandchild',
        path: '/parent/child/grandchild',
        fullPath: '/parent/child/grandchild',
        hash: '',
        params: {},
        query: {},
        matched: [matched1, matched2, matched3],
        meta: {},
        suffix: ''
      }

      patchUpdateRoute(location, newLocation)

      expect(location.matched.length).toBe(3)
      expect(location.matched[2]).toBe(matched3)
    })

    it('应该正确截断matched数组', () => {
      const matched1 = createMockRouteNormalized('/parent')
      const matched2 = createMockRouteNormalized('/parent/child')
      const matched3 = createMockRouteNormalized('/parent/child/grandchild')

      const location: RouteLocation = {
        __is_route_location: true,
        index: '/parent/child/grandchild',
        path: '/parent/child/grandchild',
        fullPath: '/parent/child/grandchild',
        hash: '',
        params: {},
        query: {},
        matched: [matched1, matched2, matched3],
        meta: {},
        suffix: ''
      }

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/parent/child',
        path: '/parent/child',
        fullPath: '/parent/child',
        hash: '',
        params: {},
        query: {},
        matched: [matched1, matched2],
        meta: {},
        suffix: ''
      }

      patchUpdateRoute(location, newLocation)

      expect(location.matched.length).toBe(2)
    })

    it('应该正确处理空matched数组', () => {
      const location: RouteLocation = {
        __is_route_location: true,
        index: '/old',
        path: '/old',
        fullPath: '/old',
        hash: '',
        params: {},
        query: {},
        matched: [],
        meta: {},
        suffix: ''
      }

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/new',
        path: '/new',
        fullPath: '/new',
        hash: '',
        params: {},
        query: {},
        matched: [],
        meta: {},
        suffix: ''
      }

      patchUpdateRoute(location, newLocation)

      expect(location.matched.length).toBe(0)
    })

    it('应该保持对象引用不变（差异化更新）', () => {
      const location: RouteLocation = {
        __is_route_location: true,
        index: '/page',
        path: '/page',
        fullPath: '/page',
        hash: '',
        params: { id: '123' },
        query: { search: 'test' },
        matched: [],
        meta: { title: 'Page' },
        suffix: ''
      }

      const originalParamsRef = location.params
      const originalQueryRef = location.query
      const originalMetaRef = location.meta

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/page',
        path: '/page',
        fullPath: '/page',
        hash: '',
        params: { id: '123' },
        query: { search: 'test' },
        matched: [],
        meta: { title: 'Page' },
        suffix: ''
      }

      patchUpdateRoute(location, newLocation)

      expect(location.params).toBe(originalParamsRef)
      expect(location.query).toBe(originalQueryRef)
      expect(location.meta).toBe(originalMetaRef)
    })

    it('应该正确处理suffix属性', () => {
      const location: RouteLocation = {
        __is_route_location: true,
        index: '/page',
        path: '/page',
        fullPath: '/page',
        hash: '',
        params: {},
        query: {},
        matched: [],
        meta: {},
        suffix: ''
      }

      const newLocation: RouteLocation = {
        __is_route_location: true,
        index: '/page.html',
        path: '/page',
        fullPath: '/page.html',
        hash: '',
        params: {},
        query: {},
        matched: [],
        meta: {},
        suffix: '.html'
      }

      patchUpdateRoute(location, newLocation)

      expect(location.suffix).toBe('')
      expect(location.fullPath).toBe('/page.html')
    })
  })
})
