import { describe, expect, it } from 'vitest'
import {
  extractVariables,
  isVariablePath,
  mergePathVariable,
  mergePattern,
  optionalVariableCount,
  validateAliasVariables
} from '../../../src/core/common/variable.js'
import type { ResolvedPattern } from '../../../src/core/types/index.js'

describe('common/variable', () => {
  describe('isVariablePath', () => {
    it('应该对包含变量的路径返回 true', () => {
      expect(isVariablePath('/user/{id}')).toBe(true)
      expect(isVariablePath('/user/{id?}')).toBe(true)
      expect(isVariablePath('/post/{category}/{slug}')).toBe(true)
    })

    it('应该对不包含变量的路径返回 false', () => {
      expect(isVariablePath('/home')).toBe(false)
      expect(isVariablePath('/user/123')).toBe(false)
      expect(isVariablePath('/')).toBe(false)
    })

    it('应该对空字符串返回 false', () => {
      expect(isVariablePath('')).toBe(false)
    })

    it('应该正确处理边缘情况', () => {
      expect(isVariablePath('/user/{}')).toBe(false)
      expect(isVariablePath('/user/{ }')).toBe(true)
    })
  })

  describe('extractVariables', () => {
    it('应该正确提取单个变量', () => {
      const result = extractVariables('/user/{id}')
      expect(result).toEqual([{ name: 'id', optional: false }])
    })

    it('应该正确提取可选变量', () => {
      const result = extractVariables('/user/{id?}')
      expect(result).toEqual([{ name: 'id', optional: true }])
    })

    it('应该正确提取多个变量', () => {
      const result = extractVariables('/post/{category}/{slug}')
      expect(result).toEqual([
        { name: 'category', optional: false },
        { name: 'slug', optional: false }
      ])
    })

    it('应该正确提取混合的必填和可选变量', () => {
      const result = extractVariables('/user/{id}/{name?}')
      expect(result).toEqual([
        { name: 'id', optional: false },
        { name: 'name', optional: true }
      ])
    })

    it('应该对没有变量的路径返回空数组', () => {
      expect(extractVariables('/home')).toEqual([])
      expect(extractVariables('/')).toEqual([])
    })

    it('应该对空字符串返回空数组', () => {
      expect(extractVariables('')).toEqual([])
    })
  })

  describe('validateAliasVariables', () => {
    const createPattern = (
      items: Array<{ name: string; optional: boolean }>
    ): ResolvedPattern[] => {
      return items.map(item => ({
        name: item.name,
        regex: /[^/]+/,
        optional: item.optional
      }))
    }

    it('应该对变量一致的别名返回 true', () => {
      const mainPattern = createPattern([{ name: 'id', optional: false }])
      expect(validateAliasVariables(mainPattern, '/user/{id}')).toBe(true)
    })

    it('应该对可选性一致的别名返回 true', () => {
      const mainPattern = createPattern([{ name: 'id', optional: true }])
      expect(validateAliasVariables(mainPattern, '/user/{id?}')).toBe(true)
    })

    it('应该对变量名称不一致返回 false', () => {
      const mainPattern = createPattern([{ name: 'id', optional: false }])
      expect(validateAliasVariables(mainPattern, '/user/{userId}')).toBe(false)
    })

    it('应该对可选性不一致返回 false', () => {
      const mainPattern = createPattern([{ name: 'id', optional: false }])
      expect(validateAliasVariables(mainPattern, '/user/{id?}')).toBe(false)
    })

    it('应该对变量数量不一致返回 false', () => {
      const mainPattern = createPattern([{ name: 'id', optional: false }])
      expect(validateAliasVariables(mainPattern, '/user/{id}/{name}')).toBe(false)
    })

    it('应该对空主 pattern 和有变量的别名返回 false', () => {
      expect(validateAliasVariables([], '/user/{id}')).toBe(false)
    })

    it('应该对空主 pattern 和无变量的别名返回 true', () => {
      expect(validateAliasVariables([], '/home')).toBe(true)
    })

    it('应该对 undefined 主 pattern 和无变量的别名返回 true', () => {
      expect(validateAliasVariables(undefined, '/home')).toBe(true)
    })

    it('应该对 undefined 主 pattern 和有变量的别名返回 false', () => {
      expect(validateAliasVariables(undefined, '/user/{id}')).toBe(false)
    })

    it('应该正确验证多个变量', () => {
      const mainPattern = createPattern([
        { name: 'category', optional: false },
        { name: 'slug', optional: true }
      ])
      expect(validateAliasVariables(mainPattern, '/post/{category}/{slug?}')).toBe(true)
      expect(validateAliasVariables(mainPattern, '/article/{category}/{slug?}')).toBe(true)
    })

    it('应该对多个变量顺序不一致返回 true（只检查名称和可选性）', () => {
      const mainPattern = createPattern([
        { name: 'category', optional: false },
        { name: 'slug', optional: true }
      ])
      expect(validateAliasVariables(mainPattern, '/post/{slug?}/{category}')).toBe(true)
      expect(validateAliasVariables(mainPattern, '/article/{category}/{slug?}')).toBe(true)
    })
  })

  describe('optionalVariableCount', () => {
    it('应该正确计算可选变量数量', () => {
      expect(optionalVariableCount('/user/{id?}')).toBe(1)
      expect(optionalVariableCount('/user/{id?}/{name?}')).toBe(2)
    })

    it('应该对没有可选变量的路径返回 0', () => {
      expect(optionalVariableCount('/home')).toBe(0)
      expect(optionalVariableCount('/user/{id}')).toBe(0)
    })

    it('应该对空字符串返回 0', () => {
      expect(optionalVariableCount('')).toBe(0)
    })

    it('应该正确处理混合变量', () => {
      expect(optionalVariableCount('/user/{id}/{name?}')).toBe(1)
      expect(optionalVariableCount('/user/{id}/{name?}/{age?}')).toBe(2)
    })

    it('应该正确处理带空格的路径', () => {
      expect(optionalVariableCount('/user/{ id? }')).toBe(1)
      expect(optionalVariableCount('/user/{ id ? }/{ name ? }')).toBe(2)
    })

    it('应该正确处理带连字符的变量名', () => {
      expect(optionalVariableCount('/user/{user-id?}')).toBe(1)
    })
  })

  describe('mergePathVariable', () => {
    it('应该正确合并参数到路径', () => {
      expect(mergePathVariable('/user/{id}', { id: '123' })).toBe('/user/123')
    })

    it('应该正确处理可选参数', () => {
      expect(mergePathVariable('/user/{id?}', { id: '123' })).toBe('/user/123')
    })

    it('应该正确处理缺失的可选参数', () => {
      expect(mergePathVariable('/user/{id?}', {})).toBe('/user')
    })

    it('应该正确处理 null 值的可选参数', () => {
      expect(mergePathVariable('/user/{id?}', { id: null as any })).toBe('/user')
    })

    it('应该正确处理 undefined 值的可选参数', () => {
      expect(mergePathVariable('/user/{id?}', { id: undefined as any })).toBe('/user')
    })

    it('应该正确处理多个参数', () => {
      expect(
        mergePathVariable('/post/{category}/{slug}', { category: 'tech', slug: 'hello' })
      ).toBe('/post/tech/hello')
    })

    it('应该正确处理数字类型的参数', () => {
      expect(mergePathVariable('/user/{id}', { id: 123 })).toBe('/user/123')
    })

    it('应该正确处理参数值中的空格', () => {
      expect(mergePathVariable('/user/{name}', { name: 'hello world' })).toBe('/user/hello_world')
    })

    it('应该正确处理没有参数的路径', () => {
      expect(mergePathVariable('/home', {})).toBe('/home')
    })

    it('应该正确处理根路径', () => {
      expect(mergePathVariable('/', {})).toBe('/')
    })

    it('应该正确处理带连字符的参数名', () => {
      expect(mergePathVariable('/user/{user-id}', { 'user-id': '123' })).toBe('/user/123')
    })

    it('应该正确处理双斜杠情况', () => {
      expect(mergePathVariable('/user/{id?}/{name?}', { id: undefined as any, name: 'test' })).toBe(
        '/user/test'
      )
    })
  })

  describe('mergePattern', () => {
    it('应该正确合并两个 pattern 对象', () => {
      const p1 = { id: /\d+/ }
      const p2 = { name: /[a-z]+/ }
      const result = mergePattern(p1, p2)
      expect(result).toEqual({
        id: /\d+/,
        name: /[a-z]+/
      })
    })

    it('应该用 p2 覆盖 p1 中相同的 key', () => {
      const p1 = { id: /\d+/ }
      const p2 = { id: /[a-z]+/ }
      const result = mergePattern(p1, p2)
      expect(result.id).toBe(p2.id)
    })

    it('应该正确处理 p1 为 undefined', () => {
      const p2 = { id: /\d+/ }
      const result = mergePattern(undefined, p2)
      expect(result).toEqual({ id: /\d+/ })
    })

    it('应该正确处理 p2 为 undefined', () => {
      const p1 = { id: /\d+/ }
      const result = mergePattern(p1, undefined)
      expect(result).toEqual({ id: /\d+/ })
    })

    it('应该正确处理两个都为 undefined', () => {
      const result = mergePattern(undefined, undefined)
      expect(result).toEqual({})
    })

    it('应该正确处理空对象', () => {
      const result = mergePattern({}, {})
      expect(result).toEqual({})
    })

    it('应该忽略非正则值', () => {
      const p1 = { id: /\d+/, name: 'invalid' as any }
      const p2 = { age: 123 as any }
      const result = mergePattern(p1, p2)
      expect(result).toEqual({ id: /\d+/ })
    })

    it('应该保留 p1 中的正则值当 p2 中有非正则值覆盖时', () => {
      const p1 = { id: /\d+/ }
      const p2 = { id: 'invalid' as any }
      const result = mergePattern(p1, p2)
      expect(result).toEqual({ id: /\d+/ })
    })
  })
})
