/**
 * @fileoverview parsePage 模块测试
 * 
 * 测试页面文件解析功能，包括：
 * - 文件路径解析
 * - 动态参数识别
 * - definePage 宏解析
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parsePageFile, parseDefinePage, extractParamsFromPath } from '../../../src/vite/core/parsePage.js'

// 每个测试使用独立的临时目录
let testDir: string

function setupTestDir(): void {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitarx-router-parse-'))
}

function teardownTestDir(): void {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true })
  }
}

function createPageFile(relativePath: string, content: string = ''): void {
  const fullPath = path.join(testDir, relativePath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(fullPath, content, 'utf-8')
}

describe('parsePageFile', () => {
  describe('索引文件解析', () => {
    it('应该正确解析根索引文件', () => {
      const result = parsePageFile('/src/pages/index.tsx', '/src/pages', '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
      expect(result!.name).toBe('')
      expect(result!.isIndex).toBe(true)
      expect(result!.isDynamic).toBe(false)
      expect(result!.params).toEqual([])
    })

    it('应该正确解析嵌套索引文件', () => {
      const result = parsePageFile('/src/pages/user/index.tsx', '/src/pages', 'user')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/user')
      expect(result!.name).toBe('user')
      expect(result!.isIndex).toBe(true)
    })

    it('应该正确解析多层嵌套索引文件', () => {
      const result = parsePageFile('/src/pages/admin/user/index.tsx', '/src/pages', 'admin/user')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/admin/user')
      expect(result!.name).toBe('admin-user')
      expect(result!.isIndex).toBe(true)
    })
  })

  describe('动态路由解析', () => {
    it('应该正确解析动态参数路由', () => {
      const result = parsePageFile('/src/pages/user/[id].tsx', '/src/pages', 'user')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/user/{id}')
      expect(result!.name).toBe('user-id')
      expect(result!.isIndex).toBe(false)
      expect(result!.isDynamic).toBe(true)
      expect(result!.params).toContain('id')
    })

    it('应该正确解析根级动态路由', () => {
      const result = parsePageFile('/src/pages/[slug].tsx', '/src/pages', '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/{slug}')
      expect(result!.name).toBe('slug')
      expect(result!.isDynamic).toBe(true)
      expect(result!.params).toContain('slug')
    })
  })

  describe('静态路由解析', () => {
    it('应该正确解析静态路由文件', () => {
      const result = parsePageFile('/src/pages/user/settings.tsx', '/src/pages', 'user')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/user/settings')
      expect(result!.name).toBe('user-settings')
      expect(result!.isIndex).toBe(false)
      expect(result!.isDynamic).toBe(false)
    })

    it('应该正确解析根级静态路由', () => {
      const result = parsePageFile('/src/pages/about.tsx', '/src/pages', '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/about')
      expect(result!.name).toBe('about')
      expect(result!.isIndex).toBe(false)
    })
  })

  describe('不同扩展名', () => {
    it('应该正确解析 .ts 文件', () => {
      const result = parsePageFile('/src/pages/index.ts', '/src/pages', '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
    })

    it('应该正确解析 .jsx 文件', () => {
      const result = parsePageFile('/src/pages/index.jsx', '/src/pages', '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
    })

    it('应该正确解析 .js 文件', () => {
      const result = parsePageFile('/src/pages/index.js', '/src/pages', '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
    })
  })
})

describe('parseDefinePage', () => {
  beforeEach(() => {
    setupTestDir()
  })

  afterEach(() => {
    teardownTestDir()
  })

  describe('基本解析', () => {
    it('应该正确解析基本的 definePage 配置', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ name: 'user-detail' })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result).not.toBeNull()
      expect(result!.name).toBe('user-detail')
    })

    it('应该正确解析包含 meta 的配置', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({
          name: 'user-detail',
          meta: { title: '用户详情', requiresAuth: true }
        })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result).not.toBeNull()
      expect(result!.name).toBe('user-detail')
      expect(result!.meta).toEqual({
        title: '用户详情',
        requiresAuth: true
      })
    })
  })

  describe('导入别名支持', () => {
    it('应该正确识别导入别名', () => {
      const content = `
        import { definePage as config } from 'vitarx-router/auto-routes'
        config({ name: 'aliased' })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result).not.toBeNull()
      expect(result!.name).toBe('aliased')
    })
  })

  describe('错误处理', () => {
    it('文件不存在时应返回 null', () => {
      const result = parseDefinePage('/non/existent/file.tsx')
      expect(result).toBeNull()
    })

    it('没有 definePage 时应返回 null', () => {
      createPageFile('test.tsx', 'export default function Page() {}')
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      expect(result).toBeNull()
    })

    it('未导入 definePage 时应发出警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const content = `definePage({ name: 'no-import' })`
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(warnSpy).toHaveBeenCalled()
      expect(result).not.toBeNull()
      
      warnSpy.mockRestore()
    })
  })

  describe('多个 definePage 处理', () => {
    it('应该合并多个 definePage 配置', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ name: 'first' })
        definePage({ meta: { title: 'Second' } })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result).not.toBeNull()
      expect(result!.name).toBe('first')
      expect(result!.meta).toEqual({ title: 'Second' })
      expect(warnSpy).toHaveBeenCalled()
      
      warnSpy.mockRestore()
    })
  })

  describe('meta 属性解析', () => {
    it('应该正确解析字符串类型的 meta 值', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ meta: { title: '首页', description: '网站首页' } })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result!.meta!.title).toBe('首页')
      expect(result!.meta!.description).toBe('网站首页')
    })

    it('应该正确解析布尔类型的 meta 值', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ meta: { requiresAuth: true, cache: false } })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result!.meta!.requiresAuth).toBe(true)
      expect(result!.meta!.cache).toBe(false)
    })

    it('应该正确解析数字类型的 meta 值', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ meta: { order: 1, weight: 3.14 } })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result!.meta!.order).toBe(1)
      expect(result!.meta!.weight).toBe(3.14)
    })
  })
})

describe('extractParamsFromPath', () => {
  it('应该从路径中提取单个参数', () => {
    const params = extractParamsFromPath('/user/{id}')
    expect(params).toEqual(['id'])
  })

  it('应该从路径中提取多个参数', () => {
    const params = extractParamsFromPath('/post/{category}/{slug}')
    expect(params).toEqual(['category', 'slug'])
  })

  it('静态路径应返回空数组', () => {
    const params = extractParamsFromPath('/about')
    expect(params).toEqual([])
  })

  it('根路径应返回空数组', () => {
    const params = extractParamsFromPath('/')
    expect(params).toEqual([])
  })
})
