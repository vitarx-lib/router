/**
 * @fileoverview 配置工具模块测试
 *
 * 测试配置解析功能，包括：
 * - 默认配置
 * - 自定义配置
 * - 多页面目录配置
 */
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../../../src/file-router/config/index.js'

describe('config/configUtils', () => {
  describe('resolveConfig', () => {
    it('应该使用默认配置', () => {
      const config = resolveConfig({})

      expect(config.root).toBe(process.cwd())
      expect(config.extensions).toEqual(['.tsx', '.jsx'])
      expect(config.importMode).toBe('lazy')
      expect(config.namingStrategy).toBe('kebab')
      expect(config.injectImports).toEqual([])
    })

    it('应该正确解析自定义配置', () => {
      const customRoot = '/custom/root'
      const config = resolveConfig({
        root: customRoot,
        pages: 'src/views',
        extensions: ['.tsx'],
        importMode: 'file',
        namingStrategy: 'lowercase',
        injectImports: ["import { helper } from './helper'"]
      })

      expect(config.root).toBe(customRoot)
      expect(config.extensions).toEqual(['.tsx'])
      expect(config.importMode).toBe('file')
      expect(config.namingStrategy).toBe('lowercase')
      expect(config.injectImports).toEqual(["import { helper } from './helper'"])
    })

    it('应该正确解析字符串形式的页面目录', () => {
      const config = resolveConfig({
        root: '/project',
        pages: 'src/pages'
      })

      expect(config.pages).toHaveLength(1)
      expect(config.pages[0].dir).toBe(path.resolve('/project', 'src/pages'))
      expect(config.pages[0].prefix).toBe('')
    })

    it('应该正确解析对象形式的页面目录', () => {
      const config = resolveConfig({
        root: '/project',
        pages: {
          dir: 'src/pages',
          prefix: '/app/',
          include: ['**/*.tsx'],
          exclude: ['**/components/**']
        }
      })

      expect(config.pages).toHaveLength(1)
      expect(config.pages[0].prefix).toBe('/app/')
      expect(config.pages[0].include).toEqual(['**/*.tsx'])
      expect(config.pages[0].exclude).toEqual(['**/components/**'])
    })

    it('应该正确解析数组形式的多个页面目录', () => {
      const config = resolveConfig({
        root: '/project',
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
      const config = resolveConfig({
        root: '/project',
        pages: ['src/pages', 'src/admin']
      })

      expect(config.pages).toHaveLength(2)
    })

    it('应该正确处理绝对路径', () => {
      const absolutePath = '/absolute/path/to/pages'
      const config = resolveConfig({
        root: '/project',
        pages: absolutePath
      })

      expect(config.pages[0].dir).toBe(absolutePath)
    })

    it('应该正确合并全局 include/exclude 配置', () => {
      const config = resolveConfig({
        root: '/project',
        pages: [{ dir: 'src/pages' }, { dir: 'src/admin', include: ['**/*.admin.tsx'] }],
        include: ['**/*.tsx'],
        exclude: ['**/test/**']
      })

      expect(config.pages[0].include).toEqual(['**/*.tsx'])
      expect(config.pages[0].exclude).toEqual(['**/test/**'])
      expect(config.pages[1].include).toEqual(['**/*.admin.tsx'])
      expect(config.pages[1].exclude).toEqual(['**/test/**'])
    })
  })
})
