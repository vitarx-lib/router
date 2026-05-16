import { describe, expect, it } from 'vitest'
import {
  cloneRouteLocation,
  createMissingRoute,
  normalizePath,
  parseQuery,
  removeTrailingSlash,
  stringifyQuery
} from '../../../src/core/shared/utils.js'
import type { NotFoundTarget, RouteLocation, RouteRecord } from '../../../src/core/types/index.js'

describe('shared/utils', () => {
  describe('normalizePath', () => {
    it('应该正确格式化路径', () => {
      expect(normalizePath('home')).toBe('/home')
      expect(normalizePath('/home')).toBe('/home')
      expect(normalizePath('/home/', true)).toBe('/home')
      expect(normalizePath('home/')).toBe('/home/')
    })

    it('应该处理重复斜杠', () => {
      expect(normalizePath('//home//page')).toBe('/home/page')
      expect(normalizePath('///home')).toBe('/home')
    })

    it('应该去除空格', () => {
      expect(normalizePath(' / home / page ')).toBe('/home/page')
    })

    it('应该正确处理根路径', () => {
      expect(normalizePath('/')).toBe('/')
      expect(normalizePath('')).toBe('/')
    })

    it('应该正确处理特殊路径', () => {
      expect(normalizePath('/#/')).toBe('/#/')
    })
  })

  describe('parseQuery', () => {
    it('应该正确解析查询字符串', () => {
      expect(parseQuery('?key1=value1&key2=value2')).toEqual({
        key1: 'value1',
        key2: 'value2'
      })
    })

    it('应该正确处理没有?前缀的字符串', () => {
      expect(parseQuery('key=value')).toEqual({ key: 'value' })
    })

    it('应该正确处理空字符串', () => {
      expect(parseQuery('')).toEqual({})
      expect(parseQuery('?')).toEqual({})
    })

    it('应该正确解码URI编码', () => {
      expect(parseQuery('?name=%E4%B8%AD%E6%96%87')).toEqual({ name: '中文' })
    })

    it('应该正确处理重复的键', () => {
      const result = parseQuery('?key=value1&key=value2')
      expect(result).toHaveProperty('key')
    })
  })

  describe('stringifyQuery', () => {
    it('应该正确将对象转换为查询字符串', () => {
      const result = stringifyQuery({ key1: 'value1', key2: 'value2' })
      expect(result).toContain('key1=value1')
      expect(result).toContain('key2=value2')
      expect(result.startsWith('?')).toBe(true)
    })

    it('应该对空对象返回空字符串', () => {
      expect(stringifyQuery({})).toBe('')
    })
  })

  describe('removeTrailingSlash', () => {
    it('应该去除路径末尾的斜杠', () => {
      expect(removeTrailingSlash('/foo/')).toBe('/foo')
      expect(removeTrailingSlash('/foo/bar/')).toBe('/foo/bar')
    })

    it('应该对没有末尾斜杠的路径原样返回', () => {
      expect(removeTrailingSlash('/foo')).toBe('/foo')
      expect(removeTrailingSlash('/foo/bar')).toBe('/foo/bar')
    })

    it('应该对根路径原样返回', () => {
      expect(removeTrailingSlash('/')).toBe('/')
    })

    it('应该保持类型推断', () => {
      const result = removeTrailingSlash('/foo/')
      expect(typeof result).toBe('string')
    })
  })

  describe('cloneRouteLocation', () => {
    it('应该正确克隆路由位置对象', () => {
      const route: RouteLocation = {
        path: '/user',
        href: '/user?id=123',
        hash: '',
        params: { id: '123' },
        query: { id: '123' },
        matched: [],
        meta: { title: 'User' }
      }

      const cloned = cloneRouteLocation(route)

      expect(cloned).not.toBe(route)
      expect(cloned.path).toBe(route.path)
      expect(cloned.params).toEqual(route.params)
    })

    it('应该正确克隆matched数组', () => {
      const matchedItem = { path: '/user' } as unknown as RouteRecord
      const route: RouteLocation = {
        path: '/user',
        href: '/user',
        hash: '',
        params: {},
        query: {},
        matched: [matchedItem],
        meta: {}
      }

      const cloned = cloneRouteLocation(route)

      expect(cloned.matched).toEqual([matchedItem])
      expect(cloned.matched).not.toBe(route.matched)
    })
  })

  describe('createMissingRoute', () => {
    const mockComponent = {} as any

    it('应该创建有效的 RouteLocation', () => {
      const target: NotFoundTarget = { index: '/not-found' }
      const result = createMissingRoute(mockComponent, target)

      expect(result.path).toBe('/not-found')
      expect(result.href).toBe('/not-found')
      expect(result.hash).toBe('')
      expect(result.params).toEqual({})
      expect(result.query).toEqual({})
      expect(result.meta).toEqual({})
      expect(result.matched).toHaveLength(1)
      expect(result.matched[0].path).toBe('/not-found')
      expect(result.matched[0].component).toEqual({ default: mockComponent })
    })

    it('应该支持自定义 meta', () => {
      const target: NotFoundTarget = { index: '/404' }
      const meta = { title: '页面未找到', statusCode: 404 }
      const result = createMissingRoute(mockComponent, target, meta)

      expect(result.meta).toEqual(meta)
    })

    it('应该保留 target 中的 query 和 hash', () => {
      const target: NotFoundTarget = { index: '/missing', query: { q: 'test' }, hash: '#section' }
      const result = createMissingRoute(mockComponent, target)

      expect(result.query).toEqual({ q: 'test' })
      expect(result.hash).toBe('#section')
    })

    it('应该保留 target 中的 params', () => {
      const target: NotFoundTarget = { index: '/missing', params: { id: '123' } }
      const result = createMissingRoute(mockComponent, target)

      expect(result.params).toEqual({ id: '123' })
    })
  })
})
