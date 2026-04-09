/**
 * @fileoverview 配置工具模块测试
 *
 * 测试配置解析功能，包括：
 * - 默认配置
 * - 自定义配置
 * - 多页面目录配置
 */
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveConfig } from '../../../src/file-router/config/index.js'
import { createTestHelpers } from '../testUtils.js'

const { tempDir, createTestDir, cleanupTestDir, createPagesDir } =
  createTestHelpers('config')

describe('config/configUtils', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('resolveConfig', () => {
    it('应该使用默认配置', () => {
      createPagesDir('src/pages')

      const config = resolveConfig({
        root: tempDir
      })

      expect(config.root).toBe(tempDir)
      expect(config.importMode).toBe('lazy')
      expect(config.pathStrategy).toBe('kebab')
    })

    it('应该正确解析自定义配置', () => {
      createPagesDir('src/views')

      const config = resolveConfig({
        root: tempDir,
        pages: 'src/views',
        importMode: 'sync',
        pathStrategy: 'lowercase',
        injectImports: ["import { helper } from './helper'"]
      })

      expect(config.root).toBe(tempDir)
      expect(config.importMode).toBe('sync')
      expect(config.pathStrategy).toBe('lowercase')
      expect(config.injectImports).toEqual(["import { helper } from './helper'"])
    })

    it('应该正确解析字符串形式的页面目录', () => {
      createPagesDir('src/pages')

      const config = resolveConfig({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(config.pages).toHaveLength(1)
      expect(config.pages[0].dir).toBe(path.join(tempDir, 'src/pages'))
      expect(config.pages[0].prefix).toBe('/')
    })

    it('应该正确解析对象形式的页面目录', () => {
      createPagesDir('src/pages')

      const config = resolveConfig({
        root: tempDir,
        pages: {
          dir: 'src/pages',
          prefix: '/app/',
          include: ['**/*.tsx'],
          exclude: ['**/components/**']
        }
      })

      expect(config.pages).toHaveLength(1)
      expect(config.pages[0].prefix).toBe('/app/')
    })

    it('应该正确解析数组形式的多个页面目录', () => {
      createPagesDir('src/pages')
      createPagesDir('src/admin')

      const config = resolveConfig({
        root: tempDir,
        pages: [
          { dir: 'src/pages', prefix: '/' },
          { dir: 'src/admin', prefix: '/admin/' }
        ]
      })

      expect(config.pages).toHaveLength(2)
      expect(config.pages[0].prefix).toBe('/')
      expect(config.pages[1].prefix).toBe('/admin/')
    })

    it('应该正确解析字符串数组的页面目录', () => {
      createPagesDir('src/pages')
      createPagesDir('src/admin')

      const config = resolveConfig({
        root: tempDir,
        pages: ['src/pages', 'src/admin']
      })

      expect(config.pages).toHaveLength(2)
    })

    it('应该正确处理绝对路径', () => {
      const absolutePath = createPagesDir('absolute/pages')

      const config = resolveConfig({
        root: tempDir,
        pages: absolutePath
      })

      expect(config.pages[0].dir).toBe(absolutePath)
    })
  })
})
