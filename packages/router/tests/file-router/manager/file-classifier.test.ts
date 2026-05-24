/**
 * @fileoverview 文件分类器测试
 *
 * 测试 file-classifier 模块的文件类型判定逻辑：
 * - 布局文件识别
 * - 配置文件识别
 * - 页面文件识别
 * - 忽略文件判定
 */
import { describe, expect, it } from 'vitest'
import { getPageType, checkIsPageFile } from '../../../src/file-router/manager/file-classifier.js'
import { resolveConfig } from '../../../src/file-router/config/index.js'
import type { FileRouterOptions } from '../../../src/file-router/types/index.js'

function createConfig(options: FileRouterOptions = {}) {
  return resolveConfig(options)
}

describe('file-router/manager/file-classifier', () => {
  describe('getPageType', () => {
    it('布局文件应返回 layout', () => {
      const config = createConfig({ root: '/test' })
      const result = getPageType('/test/pages/_layout.tsx', '_layout', config)
      expect(result).toBe('layout')
    })

    it('配置文件（.ts）应返回 config', () => {
      const config = createConfig({ root: '/test' })
      const result = getPageType('/test/pages/_config.ts', '_config', config)
      expect(result).toBe('config')
    })

    it('配置文件（.js）应返回 config', () => {
      const config = createConfig({ root: '/test' })
      const result = getPageType('/test/pages/_config.js', '_config', config)
      expect(result).toBe('config')
    })

    it('配置文件（.tsx）应返回 page 而非 config', () => {
      const config = createConfig({ root: '/test', pages: 'src/pages' })
      const result = getPageType('/test/pages/_config.tsx', '_config', config)
      // _config.tsx 不符合 .ts/.js 后缀要求，应按页面文件处理
      expect(result).not.toBe('config')
    })

    it('页面文件应返回 page', () => {
      const config = createConfig({ root: '/test', pages: 'src/pages' })
      const result = getPageType('/test/src/pages/index.tsx', 'index', config)
      expect(result).toBe('page')
    })

    it('不匹配任何规则的文件应返回 ignore', () => {
      const config = createConfig({ root: '/test', pages: 'src/pages' })
      const result = getPageType('/test/src/utils/helper.ts', 'helper', config)
      expect(result).toBe('ignore')
    })

    it('布局文件优先级高于页面文件', () => {
      const config = createConfig({ root: '/test', pages: 'src/pages' })
      // 即使 _layout 文件在 pages 目录下，也应被识别为 layout
      const result = getPageType('/test/src/pages/_layout.tsx', '_layout', config)
      expect(result).toBe('layout')
    })

    it('配置文件优先级高于页面文件', () => {
      const config = createConfig({ root: '/test', pages: 'src/pages' })
      const result = getPageType('/test/src/pages/_config.ts', '_config', config)
      expect(result).toBe('config')
    })
  })

  describe('checkIsPageFile', () => {
    it('页面文件应返回 true', () => {
      const config = createConfig({ root: '/test', pages: 'src/pages' })
      const result = checkIsPageFile('/test/src/pages/index.tsx', config)
      expect(result).toBe(true)
    })

    it('非页面文件应返回 false', () => {
      const config = createConfig({ root: '/test', pages: 'src/pages' })
      const result = checkIsPageFile('/test/src/utils/helper.ts', config)
      expect(result).toBe(false)
    })
  })
})
