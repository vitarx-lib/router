/**
 * @fileoverview 页面解析模块测试
 *
 * 测试页面文件解析功能，包括：
 * - 路由路径生成
 * - 动态参数识别
 * - 路由名称生成
 * - 命名视图解析
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseRoutePath } from '../../../src/file-router/parser/parsePage.js'
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

    it('应该正确解析仅命名视图无路由路径', () => {
      const result = parseRoutePath('@sidebar')
      expect(result.routePath).toBe('')
      expect(result.viewName).toBe('sidebar')
    })

    it('应该正确解析带多个 @ 的文件名（仅第一个生效）', () => {
      const result = parseRoutePath('about@sidebar@extra')
      expect(result.routePath).toBe('about')
      expect(result.viewName).toBe('sidebar')
    })
  })
})
