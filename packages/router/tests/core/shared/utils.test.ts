import { describe, expect, it } from 'vitest'
import {
  cloneRouteLocation,
  normalizePath,
  parseQuery,
  stringifyQuery
} from '../../../src/core/shared/utils.js'
import type { RouteLocation, RouteRecord } from '../../../src/core/types/index.js'

describe('shared/utils', () => {
  describe('normalizePath', () => {
    it('应该正确格式化路径', () => {
      expect(normalizePath('home')).toBe('/home')
      expect(normalizePath('/home')).toBe('/home')
      expect(normalizePath('/home/')).toBe('/home')
      expect(normalizePath('home/')).toBe('/home')
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
      expect(normalizePath('/#/')).toBe('/#')
    })

    it('应该在 hash 模式下正确处理 /#/', () => {
      expect(normalizePath('/#/', true)).toBe('/#/')
      expect(normalizePath('/#/home', true)).toBe('/#/home')
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
})
