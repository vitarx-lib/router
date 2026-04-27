/**
 * @fileoverview 页面解析模块测试
 *
 * 测试页面文件解析功能，包括：
 * - 路由路径生成
 * - 动态参数识别
 * - 路由名称生成
 * - 命名视图解析
 * - 异常处理
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PageParseError, parsePageFile } from '../../../src/file-router/parser/parsePage.js'
import type { PageParser } from '../../../src/file-router/types/index.js'
import { createTestHelpers } from '../testUtils.js'

const { createTestDir, cleanupTestDir } = createTestHelpers('parse-page')

describe('parser/parsePage', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('parseRoutePath', () => {
    describe('无自定义解析器', () => {
      it('应该正确解析普通文件名', () => {
        const result = parsePageFile('about')
        expect(result.path).toBe('about')
      })

      it('应该正确解析 index 文件名', () => {
        const result = parsePageFile('index')
        expect(result.path).toBe('index')
      })

      it('应该正确解析动态路由参数', () => {
        const result = parsePageFile('[id]')
        expect(result.path).toBe('[id]')
      })

      it('应该正确解析命名视图', () => {
        const result = parsePageFile('index@sidebar')
        expect(result.path).toBe('index')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该正确解析动态参数带命名视图', () => {
        const result = parsePageFile('[id]@modal')
        expect(result.path).toBe('[id]')
        expect(result.viewName).toBe('modal')
      })

      it('无命名视图时 viewName 应为 undefined', () => {
        const result = parsePageFile('about')
        expect(result.viewName).toBeUndefined()
      })

      it('应该抛出错误当只有命名视图无路由路径', () => {
        expect(() => parsePageFile('@sidebar')).toThrow(PageParseError)
        expect(() => parsePageFile('@sidebar')).toThrow('PageParser returned empty path')
      })

      it('应该正确解析带多个 @ 的文件名（仅第一个生效）', () => {
        const result = parsePageFile('about@sidebar@extra')
        expect(result.path).toBe('about')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该正确处理带扩展名的文件路径', () => {
        const result = parsePageFile('about.tsx')
        expect(result.path).toBe('about')
      })

      it('应该正确处理带扩展名和命名视图的文件路径', () => {
        const result = parsePageFile('about@sidebar.tsx')
        expect(result.path).toBe('about')
        expect(result.viewName).toBe('sidebar')
      })
    })

    describe('自定义解析器返回字符串', () => {
      it('应该正确解析字符串路径', () => {
        const parser: PageParser = () => 'custom-path'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('custom-path')
      })

      it('应该支持 @ 语法提取视图名称', () => {
        const parser: PageParser = () => 'admin@sidebar'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('admin')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该支持 @ 语法且仅第一个 @ 生效', () => {
        const parser: PageParser = () => 'path@view@extra'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('path')
        expect(result.viewName).toBe('view')
      })

      it('应该去除路径开头的斜杠', () => {
        const parser: PageParser = () => '/leading-slash'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('leading-slash')
      })

      it('应该去除路径开头的多个斜杠', () => {
        const parser: PageParser = () => '///multiple-slashes'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('multiple-slashes')
      })

      it('应该去除路径结尾的斜杠', () => {
        const parser: PageParser = () => 'trailing-slash/'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('trailing-slash')
      })

      it('应该去除路径首尾的斜杠', () => {
        const parser: PageParser = () => '/both-slashes/'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('both-slashes')
      })

      it('应该去除路径首尾空白', () => {
        const parser: PageParser = () => '  trimmed-path  '
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('trimmed-path')
      })

      it('应该将路径中的 . 替换为 -', () => {
        const parser: PageParser = () => 'api.v2'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('api-v2')
      })

      it('应该将路径中的 # 替换为 -', () => {
        const parser: PageParser = () => 'section#part'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('section-part')
      })

      it('应该将路径中的 . 和 # 同时替换为 -', () => {
        const parser: PageParser = () => 'api.v2#release'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('api-v2-release')
      })

      it('应该支持 @ 语法与 .# 替换组合', () => {
        const parser: PageParser = () => 'api.v2@sidebar'
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('api-v2')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该抛出错误当返回空字符串', () => {
        const parser: PageParser = () => ''
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow('PageParser returned empty path')
      })

      it('应该抛出错误当返回只有空白字符的字符串', () => {
        const parser: PageParser = () => '   '
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow('PageParser returned empty path')
      })

      it('应该抛出错误当返回只有斜杠的字符串', () => {
        const parser: PageParser = () => '///'
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
      })
    })

    describe('自定义解析器返回对象', () => {
      it('应该正确解析包含 path 的对象', () => {
        const parser: PageParser = () => ({ path: 'custom-path' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('custom-path')
      })

      it('应该正确解析包含 path 和 viewName 的对象', () => {
        const parser: PageParser = () => ({ path: 'custom-path', viewName: 'sidebar' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('custom-path')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该正确解析包含 options 的对象', () => {
        const parser: PageParser = () => ({
          path: 'custom-path',
          options: { name: 'custom-name', meta: { auth: true } }
        })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('custom-path')
        expect(result.options).toEqual({ name: 'custom-name', meta: { auth: true } })
      })

      it('应该正确解析包含 options 和 viewName 的对象', () => {
        const parser: PageParser = () => ({
          path: 'custom-path',
          viewName: 'sidebar',
          options: { name: 'custom-name' }
        })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('custom-path')
        expect(result.viewName).toBe('sidebar')
        expect(result.options).toEqual({ name: 'custom-name' })
      })

      it('options 为 undefined 时应通过验证', () => {
        const parser: PageParser = () => ({
          path: 'custom-path',
          options: undefined
        })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('custom-path')
        expect(result.options).toBeUndefined()
      })

      it('应该抛出错误当 options 为非对象类型（字符串）', () => {
        const parser: PageParser = () => ({ path: 'valid', options: 'invalid' as any })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned invalid options type'
        )
      })

      it('应该抛出错误当 options 为非对象类型（数字）', () => {
        const parser: PageParser = () => ({ path: 'valid', options: 123 as any })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned invalid options type'
        )
      })

      it('应该抛出错误当 options 为数组', () => {
        const parser: PageParser = () => ({ path: 'valid', options: [] as any })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned invalid options type'
        )
      })

      it('应该正确处理 viewName 为 undefined', () => {
        const parser: PageParser = () => ({ path: 'custom-path', viewName: undefined })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('custom-path')
      })

      it('应该正确处理 viewName 为空字符串', () => {
        const parser: PageParser = () => ({ path: 'custom-path', viewName: '' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('custom-path')
      })

      it('应该去除路径开头的斜杠', () => {
        const parser: PageParser = () => ({ path: '/leading-slash' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('leading-slash')
      })

      it('应该去除路径结尾的斜杠', () => {
        const parser: PageParser = () => ({ path: 'trailing-slash/' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('trailing-slash')
      })

      it('应该去除路径首尾的斜杠', () => {
        const parser: PageParser = () => ({ path: '/both-slashes/' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('both-slashes')
      })

      it('应该将路径中的 . 替换为 -', () => {
        const parser: PageParser = () => ({ path: 'api.v2' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('api-v2')
      })

      it('应该将路径中的 # 替换为 -', () => {
        const parser: PageParser = () => ({ path: 'section#part' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('section-part')
      })

      it('应该将路径中的 . 和 # 同时替换为 -', () => {
        const parser: PageParser = () => ({ path: 'api.v2#release' })
        const result = parsePageFile('about.tsx', parser)
        expect(result.path).toBe('api-v2-release')
      })

      it('应该抛出错误当 path 不是字符串', () => {
        const parser: PageParser = () => ({ path: 123 as unknown as string })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned non-string path'
        )
      })

      it('应该抛出错误当 path 为 null', () => {
        const parser: PageParser = () => ({ path: null as unknown as string })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned non-string path'
        )
      })

      it('应该抛出错误当 path 为空字符串', () => {
        const parser: PageParser = () => ({ path: '' })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned empty or whitespace-only path'
        )
      })

      it('应该抛出错误当 path 只有空白字符', () => {
        const parser: PageParser = () => ({ path: '   ' })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned empty or whitespace-only path'
        )
      })

      it('应该抛出错误当 path 只有斜杠', () => {
        const parser: PageParser = () => ({ path: '///' })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned empty path after normalization'
        )
      })

      it('应该抛出错误当 viewName 不是字符串', () => {
        const parser: PageParser = () => ({
          path: 'valid',
          viewName: 123 as unknown as string
        })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned non-string viewName'
        )
      })

      it('应该抛出错误当 viewName 为 null', () => {
        const parser: PageParser = () => ({
          path: 'valid',
          viewName: null as unknown as string
        })
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned non-string viewName'
        )
      })
    })

    describe('自定义解析器返回无效类型', () => {
      it('应该抛出错误当返回 null', () => {
        const parser: PageParser = () => null as unknown as string
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned invalid result type'
        )
      })

      it('应该抛出错误当返回 number', () => {
        const parser: PageParser = () => 123 as unknown as string
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned invalid result type'
        )
      })

      it('应该抛出错误当返回 boolean', () => {
        const parser: PageParser = () => true as unknown as string
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned invalid result type'
        )
      })

      it('应该抛出错误当返回数组', () => {
        const parser: PageParser = () => ['path'] as unknown as string
        expect(() => parsePageFile('about.tsx', parser)).toThrow(PageParseError)
        expect(() => parsePageFile('about.tsx', parser)).toThrow(
          'PageParser returned invalid result type'
        )
      })
    })
  })

  describe('PathParseError', () => {
    it('应该正确创建错误实例', () => {
      const error = new PageParseError('test error')
      expect(error).toBeInstanceOf(TypeError)
      expect(error).toBeInstanceOf(PageParseError)
      expect(error.name).toBe('PathParseError')
      expect(error.message).toBe('test error')
    })

    it('应该正确设置文件路径上下文', () => {
      const error = new PageParseError('test error', { filePath: '/path/to/file.ts' })
      expect(error.filePath).toBe('/path/to/file.ts')
    })

    it('应该正确设置字段名称', () => {
      const error = new PageParseError('test error', { field: 'path' })
      expect(error.field).toBe('path')
    })

    it('应该正确设置原始值', () => {
      const error = new PageParseError('test error', { originalValue: 123 })
      expect(error.originalValue).toBe(123)
    })

    it('应该正确设置 cause', () => {
      const cause = new Error('original error')
      const error = new PageParseError('test error', { cause })
      expect(error.cause).toBe(cause)
    })

    it('toString 应该包含所有上下文信息', () => {
      const error = new PageParseError('test error', {
        filePath: '/path/to/file.ts',
        field: 'path',
        originalValue: 123
      })
      const str = error.toString()
      expect(str).toContain('PathParseError: test error')
      expect(str).toContain('File: /path/to/file.ts')
      expect(str).toContain('Field: path')
      expect(str).toContain('Value: 123')
    })

    it('toString 应该只包含已设置的上下文信息', () => {
      const error = new PageParseError('test error', { filePath: '/path/to/file.ts' })
      const str = error.toString()
      expect(str).toContain('PathParseError: test error')
      expect(str).toContain('File: /path/to/file.ts')
      expect(str).not.toContain('Field:')
      expect(str).not.toContain('Value:')
    })

    it('应该包含堆栈跟踪', () => {
      const error = new PageParseError('test error')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('PathParseError')
    })
  })
})
