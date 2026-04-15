/**
 * @fileoverview 文件过滤工具模块测试
 *
 * 测试基于 glob 模式的文件包含/排除过滤功能，包括：
 * - isPageFile 单目录文件过滤
 * - isPageFileInDirs 多目录文件过滤
 */
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { FilterOptions } from '../../../src/file-router/parser/filterUtils.js'
import { isPageFile, isPageFileInDirs } from '../../../src/file-router/parser/filterUtils.js'

const DIR = '/project/src/pages'

function makeOptions(overrides: Partial<FilterOptions> = {}): FilterOptions {
  return {
    dir: DIR,
    include: [],
    exclude: [],
    ...overrides
  }
}

describe('parser/filterUtils', () => {
  describe('isPageFile', () => {
    it('应该在文件不在指定目录下时返回 false', () => {
      expect(isPageFile('/other/dir/index.tsx', makeOptions())).toBe(false)
    })

    it('应该在文件在指定目录下且 include 为空时返回 true', () => {
      expect(isPageFile(path.join(DIR, 'index.tsx'), makeOptions())).toBe(true)
    })

    it('应该在文件匹配 include 模式时返回 true', () => {
      const options = makeOptions({ include: ['**/*.tsx'] })
      expect(isPageFile(path.join(DIR, 'index.tsx'), options)).toBe(true)
    })

    it('应该在文件不匹配 include 模式时返回 false', () => {
      const options = makeOptions({ include: ['**/*.tsx'] })
      expect(isPageFile(path.join(DIR, 'index.md'), options)).toBe(false)
    })

    it('应该在文件匹配 exclude 模式时返回 false', () => {
      const options = makeOptions({ include: ['**/*'], exclude: ['**/components/**'] })
      expect(isPageFile(path.join(DIR, 'components/Header.tsx'), options)).toBe(false)
    })

    it('应该在文件不匹配 exclude 模式时返回 true', () => {
      const options = makeOptions({ include: ['**/*'], exclude: ['**/components/**'] })
      expect(isPageFile(path.join(DIR, 'index.tsx'), options)).toBe(true)
    })

    it('应该正确处理嵌套目录中的文件', () => {
      const options = makeOptions({ include: ['**/*.tsx'] })
      expect(isPageFile(path.join(DIR, 'user/profile.tsx'), options)).toBe(true)
      expect(isPageFile(path.join(DIR, 'user/profile.css'), options)).toBe(false)
    })

    it('应该正确处理多个 include 模式', () => {
      const options = makeOptions({ include: ['**/*.tsx', '**/*.jsx'] })
      expect(isPageFile(path.join(DIR, 'index.tsx'), options)).toBe(true)
      expect(isPageFile(path.join(DIR, 'index.jsx'), options)).toBe(true)
      expect(isPageFile(path.join(DIR, 'index.ts'), options)).toBe(false)
    })

    it('应该正确处理多个 exclude 模式', () => {
      const options = makeOptions({
        include: ['**/*'],
        exclude: ['**/components/**', '**/utils/**']
      })
      expect(isPageFile(path.join(DIR, 'components/Header.tsx'), options)).toBe(false)
      expect(isPageFile(path.join(DIR, 'utils/helper.ts'), options)).toBe(false)
      expect(isPageFile(path.join(DIR, 'index.tsx'), options)).toBe(true)
    })

    it('应该正确处理 dot 文件', () => {
      const options = makeOptions({ include: ['**/*'] })
      expect(isPageFile(path.join(DIR, '.hidden.tsx'), options)).toBe(true)
    })
  })

  describe('isPageFileInDirs', () => {
    const DIR_A = '/project/src/pages'
    const DIR_B = '/project/src/admin'

    const pages: readonly FilterOptions[] = [
      makeOptions({ dir: DIR_A, include: ['**/*.tsx'] }),
      makeOptions({ dir: DIR_B, include: ['**/*.jsx'] })
    ]

    it('应该在文件属于第一个目录时返回对应配置', () => {
      const result = isPageFileInDirs(path.join(DIR_A, 'index.tsx'), pages)
      expect(result).not.toBe(false)
      if (result !== false) {
        expect(result.dir).toBe(DIR_A)
      }
    })

    it('应该在文件属于第二个目录时返回对应配置', () => {
      const result = isPageFileInDirs(path.join(DIR_B, 'dashboard.jsx'), pages)
      expect(result).not.toBe(false)
      if (result !== false) {
        expect(result.dir).toBe(DIR_B)
      }
    })

    it('应该在文件不属于任何目录时返回 false', () => {
      expect(isPageFileInDirs('/other/dir/index.tsx', pages)).toBe(false)
    })

    it('应该在文件不匹配目录的 include 模式时返回 false', () => {
      expect(isPageFileInDirs(path.join(DIR_A, 'index.jsx'), pages)).toBe(false)
      expect(isPageFileInDirs(path.join(DIR_B, 'dashboard.tsx'), pages)).toBe(false)
    })

    it('应该在空 pages 数组时返回 false', () => {
      expect(isPageFileInDirs('/any/path.tsx', [])).toBe(false)
    })

    it('应该优先返回第一个匹配的目录配置', () => {
      const overlappingPages: readonly FilterOptions[] = [
        makeOptions({ dir: DIR_A, include: ['**/*'] }),
        makeOptions({ dir: DIR_A, include: ['**/*.tsx'] })
      ]
      const result = isPageFileInDirs(path.join(DIR_A, 'index.tsx'), overlappingPages)
      expect(result).not.toBe(false)
      if (result !== false) {
        expect(result.include).toEqual(['**/*'])
      }
    })
  })
})
