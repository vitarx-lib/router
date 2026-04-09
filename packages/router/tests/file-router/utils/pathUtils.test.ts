/**
 * @fileoverview 路径处理工具模块测试
 *
 * 测试路径规范化、分隔符转换等通用路径处理功能，包括：
 * - normalizePathSeparator 路径分隔符规范化
 * - normalizeRoutePath 路由路径规范化
 * - resolvePathVariable 动态参数解析
 * - hasDynamicPath 动态路径检测
 */
import { describe, expect, it } from 'vitest'
import {
  hasDynamicPath,
  normalizePathSeparator,
  normalizeRoutePath,
  resolvePathVariable
} from '../../../src/file-router/utils/pathUtils.js'

describe('utils/pathUtils', () => {
  describe('normalizePathSeparator', () => {
    it('应该将 Windows 反斜杠转换为正斜杠', () => {
      expect(normalizePathSeparator('src\\pages\\index.tsx')).toBe('src/pages/index.tsx')
    })

    it('应该保持 Unix 风格路径不变', () => {
      expect(normalizePathSeparator('src/pages/index.tsx')).toBe('src/pages/index.tsx')
    })

    it('应该处理混合分隔符', () => {
      expect(normalizePathSeparator('src\\pages/sub\\index.tsx')).toBe('src/pages/sub/index.tsx')
    })

    it('应该处理连续的反斜杠', () => {
      expect(normalizePathSeparator('src\\\\pages\\\\index.tsx')).toBe('src/pages/index.tsx')
    })

    it('应该处理连续的正斜杠', () => {
      expect(normalizePathSeparator('src//pages//index.tsx')).toBe('src/pages/index.tsx')
    })

    it('应该处理混合连续分隔符', () => {
      expect(normalizePathSeparator('src\\/\\pages/index.tsx')).toBe('src/pages/index.tsx')
    })

    it('应该去除前后空格', () => {
      expect(normalizePathSeparator('  src/pages/index.tsx  ')).toBe('src/pages/index.tsx')
    })

    it('应该处理空字符串', () => {
      expect(normalizePathSeparator('')).toBe('')
    })

    it('应该处理根路径', () => {
      expect(normalizePathSeparator('/')).toBe('/')
    })

    it('应该处理仅包含空格的字符串', () => {
      expect(normalizePathSeparator('   ')).toBe('')
    })
  })

  describe('normalizeRoutePath', () => {
    it('应该去除尾部斜杠', () => {
      expect(normalizeRoutePath('/foo/')).toBe('/foo')
    })

    it('应该去除所有空格', () => {
      expect(normalizeRoutePath('/  foo')).toBe('/foo')
      expect(normalizeRoutePath('/foo  /bar')).toBe('/foo/bar')
    })

    it('应该替换重复斜杠', () => {
      expect(normalizeRoutePath('//foo//bar')).toBe('/foo/bar')
    })

    it('应该确保路径以斜杠开头', () => {
      expect(normalizeRoutePath('foo/')).toBe('/foo')
    })

    it('应该正确处理根路径', () => {
      expect(normalizeRoutePath('/')).toBe('/')
    })

    it('应该正确处理空字符串', () => {
      expect(normalizeRoutePath('')).toBe('/')
    })

    it('应该正确处理普通路径', () => {
      expect(normalizeRoutePath('/foo/bar')).toBe('/foo/bar')
    })

    it('应该正确处理带空格和尾部斜杠的路径', () => {
      expect(normalizeRoutePath('  foo/bar/  ')).toBe('/foo/bar')
    })
  })

  describe('resolvePathVariable', () => {
    it('应该将 [param] 转换为 {param}', () => {
      expect(resolvePathVariable('/user/[id]')).toBe('/user/{id}')
    })

    it('应该将 [param?] 转换为 {param?}', () => {
      expect(resolvePathVariable('/user/[id?]')).toBe('/user/{id?}')
    })

    it('应该处理多个动态参数', () => {
      expect(resolvePathVariable('/user/[userId]/post/[postId]')).toBe(
        '/user/{userId}/post/{postId}'
      )
    })

    it('应该保持已使用花括号的路径不变', () => {
      expect(resolvePathVariable('/user/{id}')).toBe('/user/{id}')
    })

    it('应该处理可选花括号参数', () => {
      expect(resolvePathVariable('/user/{id?}')).toBe('/user/{id?}')
    })

    it('应该在没有动态参数时返回原路径', () => {
      expect(resolvePathVariable('/user/profile')).toBe('/user/profile')
    })

    it('应该正确处理混合方括号和花括号参数', () => {
      expect(resolvePathVariable('/user/{id}/post/[postId]')).toBe('/user/{id}/post/{postId}')
    })

    it('应该正确处理空字符串', () => {
      expect(resolvePathVariable('')).toBe('')
    })

    it('应该正确处理根路径', () => {
      expect(resolvePathVariable('/')).toBe('/')
    })
  })

  describe('hasDynamicPath', () => {
    it('应该在路径包含花括号时返回 true', () => {
      expect(hasDynamicPath('/user/{id}')).toBe(true)
    })

    it('应该在路径不包含花括号时返回 false', () => {
      expect(hasDynamicPath('/user/profile')).toBe(false)
    })

    it('应该正确处理空字符串', () => {
      expect(hasDynamicPath('')).toBe(false)
    })

    it('应该正确处理根路径', () => {
      expect(hasDynamicPath('/')).toBe(false)
    })

    it('应该正确处理可选参数', () => {
      expect(hasDynamicPath('/user/{id?}')).toBe(true)
    })
  })
})
