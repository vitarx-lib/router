/**
 * @fileoverview 文件过滤工具测试
 *
 * 测试文件过滤功能，包括：
 * - include 规则
 * - exclude 规则
 */
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { shouldProcessFile } from '../../../src/file-router/scanner/filterUtils.js'

describe('scanner/filterUtils', () => {
  describe('shouldProcessFile', () => {
    const pagesDir = '/project/src/pages'

    it('应该处理普通文件', () => {
      const filePath = path.join(pagesDir, 'index.tsx')
      const result = shouldProcessFile(filePath, pagesDir, [], [], false)
      expect(result).toBe(true)
    })

    it('应该处理目录', () => {
      const dirPath = path.join(pagesDir, 'users')
      const result = shouldProcessFile(dirPath, pagesDir, [], [], true)
      expect(result).toBe(true)
    })

    it('应该根据 include 规则过滤文件', () => {
      const filePath = path.join(pagesDir, 'index.tsx')
      const result = shouldProcessFile(filePath, pagesDir, ['**/*.tsx'], [], false)
      expect(result).toBe(true)
    })

    it('应该根据 exclude 规则排除文件', () => {
      const filePath = path.join(pagesDir, 'components', 'Button.tsx')
      const result = shouldProcessFile(filePath, pagesDir, [], ['**/components/**'], false)
      expect(result).toBe(false)
    })

    it('应该正确处理 include 和 exclude 组合', () => {
      const filePath = path.join(pagesDir, 'components', 'Button.tsx')
      const result = shouldProcessFile(filePath, pagesDir, ['**/*.tsx'], ['**/components/**'], false)
      expect(result).toBe(false)
    })

    it('应该根据 exclude 规则排除 node_modules 目录', () => {
      const dirPath = path.join(pagesDir, 'node_modules')
      const result = shouldProcessFile(dirPath, pagesDir, [], ['node_modules/**'], true)
      expect(result).toBe(false)
    })
  })
})
