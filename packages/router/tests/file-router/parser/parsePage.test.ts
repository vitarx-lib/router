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
import { parseRoutePath, PathParseError } from '../../../src/file-router/parser/parsePage.js'
import { createTestHelpers } from '../testUtils.js'
import type { PathParser } from '../../../src/file-router/types/index.js'

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
        const result = parseRoutePath('about')
        expect(result.routePath).toBe('about')
        expect(result.viewName).toBe('default')
      })

      it('应该正确解析 index 文件名', () => {
        const result = parseRoutePath('index')
        expect(result.routePath).toBe('index')
        expect(result.viewName).toBe('default')
      })

      it('应该正确解析动态路由参数', () => {
        const result = parseRoutePath('[id]')
        expect(result.routePath).toBe('[id]')
        expect(result.viewName).toBe('default')
      })

      it('应该正确解析命名视图', () => {
        const result = parseRoutePath('index@sidebar')
        expect(result.routePath).toBe('index')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该正确解析动态参数带命名视图', () => {
        const result = parseRoutePath('[id]@modal')
        expect(result.routePath).toBe('[id]')
        expect(result.viewName).toBe('modal')
      })

      it('应该抛出错误当只有命名视图无路由路径', () => {
        expect(() => parseRoutePath('@sidebar')).toThrow(PathParseError)
        expect(() => parseRoutePath('@sidebar')).toThrow('pathParser returned empty routePath')
      })

      it('应该正确解析带多个 @ 的文件名（仅第一个生效）', () => {
        const result = parseRoutePath('about@sidebar@extra')
        expect(result.routePath).toBe('about')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该正确处理带扩展名的文件路径', () => {
        const result = parseRoutePath('about.tsx')
        expect(result.routePath).toBe('about')
        expect(result.viewName).toBe('default')
      })

      it('应该正确处理带扩展名和命名视图的文件路径', () => {
        const result = parseRoutePath('about@sidebar.tsx')
        expect(result.routePath).toBe('about')
        expect(result.viewName).toBe('sidebar')
      })
    })

    describe('自定义解析器返回字符串', () => {
      it('应该正确解析字符串路径', () => {
        const parser: PathParser = () => 'custom-path'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('custom-path')
        expect(result.viewName).toBe('default')
      })

      it('应该支持 @ 语法提取视图名称', () => {
        const parser: PathParser = () => 'admin@sidebar'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('admin')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该支持 @ 语法且仅第一个 @ 生效', () => {
        const parser: PathParser = () => 'path@view@extra'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('path')
        expect(result.viewName).toBe('view')
      })

      it('应该去除路径开头的斜杠', () => {
        const parser: PathParser = () => '/leading-slash'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('leading-slash')
      })

      it('应该去除路径开头的多个斜杠', () => {
        const parser: PathParser = () => '///multiple-slashes'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('multiple-slashes')
      })

      it('应该去除路径结尾的斜杠', () => {
        const parser: PathParser = () => 'trailing-slash/'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('trailing-slash')
      })

      it('应该去除路径首尾的斜杠', () => {
        const parser: PathParser = () => '/both-slashes/'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('both-slashes')
      })

      it('应该去除路径首尾空白', () => {
        const parser: PathParser = () => '  trimmed-path  '
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('trimmed-path')
      })

      it('应该将路径中的 . 替换为 -', () => {
        const parser: PathParser = () => 'api.v2'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('api-v2')
      })

      it('应该将路径中的 # 替换为 -', () => {
        const parser: PathParser = () => 'section#part'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('section-part')
      })

      it('应该将路径中的 . 和 # 同时替换为 -', () => {
        const parser: PathParser = () => 'api.v2#release'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('api-v2-release')
      })

      it('应该支持 @ 语法与 .# 替换组合', () => {
        const parser: PathParser = () => 'api.v2@sidebar'
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('api-v2')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该抛出错误当返回空字符串', () => {
        const parser: PathParser = () => ''
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned empty routePath')
      })

      it('应该抛出错误当返回只有空白字符的字符串', () => {
        const parser: PathParser = () => '   '
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned empty routePath')
      })

      it('应该抛出错误当返回只有斜杠的字符串', () => {
        const parser: PathParser = () => '///'
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
      })
    })

    describe('自定义解析器返回对象', () => {
      it('应该正确解析包含 routePath 的对象', () => {
        const parser: PathParser = () => ({ routePath: 'custom-path' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('custom-path')
        expect(result.viewName).toBe('default')
      })

      it('应该正确解析包含 routePath 和 viewName 的对象', () => {
        const parser: PathParser = () => ({ routePath: 'custom-path', viewName: 'sidebar' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('custom-path')
        expect(result.viewName).toBe('sidebar')
      })

      it('应该正确处理 viewName 为 undefined', () => {
        const parser: PathParser = () => ({ routePath: 'custom-path', viewName: undefined })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('custom-path')
        expect(result.viewName).toBe('default')
      })

      it('应该正确处理 viewName 为空字符串', () => {
        const parser: PathParser = () => ({ routePath: 'custom-path', viewName: '' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('custom-path')
        expect(result.viewName).toBe('default')
      })

      it('应该去除路径开头的斜杠', () => {
        const parser: PathParser = () => ({ routePath: '/leading-slash' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('leading-slash')
      })

      it('应该去除路径结尾的斜杠', () => {
        const parser: PathParser = () => ({ routePath: 'trailing-slash/' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('trailing-slash')
      })

      it('应该去除路径首尾的斜杠', () => {
        const parser: PathParser = () => ({ routePath: '/both-slashes/' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('both-slashes')
      })

      it('应该将路径中的 . 替换为 -', () => {
        const parser: PathParser = () => ({ routePath: 'api.v2' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('api-v2')
      })

      it('应该将路径中的 # 替换为 -', () => {
        const parser: PathParser = () => ({ routePath: 'section#part' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('section-part')
      })

      it('应该将路径中的 . 和 # 同时替换为 -', () => {
        const parser: PathParser = () => ({ routePath: 'api.v2#release' })
        const result = parseRoutePath('about.tsx', parser)
        expect(result.routePath).toBe('api-v2-release')
      })

      it('应该抛出错误当 routePath 不是字符串', () => {
        const parser: PathParser = () => ({ routePath: 123 as unknown as string })
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned non-string routePath')
      })

      it('应该抛出错误当 routePath 为 null', () => {
        const parser: PathParser = () => ({ routePath: null as unknown as string })
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned non-string routePath')
      })

      it('应该抛出错误当 routePath 为空字符串', () => {
        const parser: PathParser = () => ({ routePath: '' })
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned empty or whitespace-only routePath')
      })

      it('应该抛出错误当 routePath 只有空白字符', () => {
        const parser: PathParser = () => ({ routePath: '   ' })
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned empty or whitespace-only routePath')
      })

      it('应该抛出错误当 routePath 只有斜杠', () => {
        const parser: PathParser = () => ({ routePath: '///' })
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned empty routePath after normalization')
      })

      it('应该抛出错误当 viewName 不是字符串', () => {
        const parser: PathParser = () => ({ routePath: 'valid', viewName: 123 as unknown as string })
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned non-string viewName')
      })

      it('应该抛出错误当 viewName 为 null', () => {
        const parser: PathParser = () => ({ routePath: 'valid', viewName: null as unknown as string })
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned non-string viewName')
      })
    })

    describe('自定义解析器返回无效类型', () => {
      it('应该抛出错误当返回 null', () => {
        const parser: PathParser = () => null as unknown as string
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned invalid result type')
      })

      it('应该抛出错误当返回 number', () => {
        const parser: PathParser = () => 123 as unknown as string
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned invalid result type')
      })

      it('应该抛出错误当返回 boolean', () => {
        const parser: PathParser = () => true as unknown as string
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned invalid result type')
      })

      it('应该抛出错误当返回数组', () => {
        const parser: PathParser = () => ['path'] as unknown as string
        expect(() => parseRoutePath('about.tsx', parser)).toThrow(PathParseError)
        expect(() => parseRoutePath('about.tsx', parser)).toThrow('pathParser returned invalid result type')
      })
    })
  })

  describe('PathParseError', () => {
    it('应该正确创建错误实例', () => {
      const error = new PathParseError('test error')
      expect(error).toBeInstanceOf(TypeError)
      expect(error).toBeInstanceOf(PathParseError)
      expect(error.name).toBe('PathParseError')
      expect(error.message).toBe('test error')
    })

    it('应该正确设置文件路径上下文', () => {
      const error = new PathParseError('test error', { filePath: '/path/to/file.ts' })
      expect(error.filePath).toBe('/path/to/file.ts')
    })

    it('应该正确设置字段名称', () => {
      const error = new PathParseError('test error', { field: 'routePath' })
      expect(error.field).toBe('routePath')
    })

    it('应该正确设置原始值', () => {
      const error = new PathParseError('test error', { originalValue: 123 })
      expect(error.originalValue).toBe(123)
    })

    it('应该正确设置 cause', () => {
      const cause = new Error('original error')
      const error = new PathParseError('test error', { cause })
      expect(error.cause).toBe(cause)
    })

    it('toString 应该包含所有上下文信息', () => {
      const error = new PathParseError('test error', {
        filePath: '/path/to/file.ts',
        field: 'routePath',
        originalValue: 123
      })
      const str = error.toString()
      expect(str).toContain('PathParseError: test error')
      expect(str).toContain('File: /path/to/file.ts')
      expect(str).toContain('Field: routePath')
      expect(str).toContain('Value: 123')
    })

    it('toString 应该只包含已设置的上下文信息', () => {
      const error = new PathParseError('test error', { filePath: '/path/to/file.ts' })
      const str = error.toString()
      expect(str).toContain('PathParseError: test error')
      expect(str).toContain('File: /path/to/file.ts')
      expect(str).not.toContain('Field:')
      expect(str).not.toContain('Value:')
    })

    it('应该包含堆栈跟踪', () => {
      const error = new PathParseError('test error')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('PathParseError')
    })
  })
})
