/**
 * @fileoverview scanPages 模块测试
 *
 * 测试页面扫描和路由树构建功能，包括：
 * - 目录扫描
 * - 扩展名过滤
 * - 包含/排除规则
 * - 路由树构建
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { scanPages, scanMultiplePages, buildRouteTree } from '../../../src/vite/core/scanPages.js'
import type { ParsedPage } from '../../../src/vite/core/types.js'

function createMockParsedPage(overrides: Partial<ParsedPage> = {}): ParsedPage {
  return {
    path: '/',
    filePath: '/src/pages/index.tsx',
    name: 'home',
    params: [],
    isIndex: true,
    isDynamic: false,
    children: [],
    parentPath: '',
    ...overrides
  }
}

// 每个测试使用独立的临时目录
let testDir: string

function setupTestDir(): void {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitarx-router-scan-'))
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
  // 默认创建带有默认导出的函数组件
  const defaultContent = content || `export default function Page() { return null }`
  fs.writeFileSync(fullPath, defaultContent, 'utf-8')
}

describe('scanPages', () => {
  beforeEach(() => {
    setupTestDir()
  })

  afterEach(() => {
    teardownTestDir()
  })

  describe('基本扫描功能', () => {
    it('目录不存在时应返回空数组', () => {
      const result = scanPages({
        pagesDir: '/non/existent/path',
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })
      expect(result).toEqual([])
    })

    it('应该正确扫描单个索引文件', () => {
      createPageFile('index.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/')
      expect(result[0].isIndex).toBe(true)
    })

    it('应该正确扫描多层目录结构', () => {
      createPageFile('index.tsx')
      createPageFile('user/index.tsx')
      createPageFile('user/[id].tsx')
      createPageFile('about.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(4)
      const paths = result.map(p => p.path)
      expect(paths).toContain('/')
      expect(paths).toContain('/user')
      expect(paths).toContain('/user/{id}')
      expect(paths).toContain('/about')
    })
  })

  describe('扩展名过滤', () => {
    it('应该只扫描指定扩展名的文件', () => {
      createPageFile('index.tsx')
      createPageFile('about.ts')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/')
    })

    it('应该支持自定义扩展名', () => {
      createPageFile('index.vue')
      createPageFile('about.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.vue'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/')
    })
  })

  describe('包含规则', () => {
    it('应该只包含匹配 include 模式的文件', () => {
      createPageFile('index.tsx')
      createPageFile('admin/index.tsx')
      createPageFile('user/index.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: ['admin/**'],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/admin')
    })

    it('应该支持多个 include 模式', () => {
      createPageFile('index.tsx')
      createPageFile('admin/index.tsx')
      createPageFile('user/index.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: ['admin/**', 'user/**'],
        exclude: []
      })

      expect(result.length).toBe(2)
      const paths = result.map(p => p.path)
      expect(paths).toContain('/admin')
      expect(paths).toContain('/user')
    })

    it('空 include 应匹配所有文件', () => {
      createPageFile('index.tsx')
      createPageFile('admin/index.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(2)
    })
  })

  describe('排除规则', () => {
    it('应该排除匹配排除模式的文件', () => {
      createPageFile('index.tsx')
      createPageFile('admin/index.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: ['admin/**']
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/')
    })

    it('应该支持多个排除模式', () => {
      createPageFile('index.tsx')
      createPageFile('admin/index.tsx')
      createPageFile('components/Button.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: ['admin/**', 'components/**']
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/')
    })
  })

  describe('包含和排除组合', () => {
    it('应该先应用包含规则再应用排除规则', () => {
      createPageFile('index.tsx')
      createPageFile('admin/index.tsx')
      createPageFile('admin/users.tsx')
      createPageFile('user/index.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: ['admin/**'],
        exclude: ['admin/users.tsx']
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/admin')
    })
  })

  describe('动态路由扫描', () => {
    it('应该正确识别动态参数', () => {
      createPageFile('user/[id].tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].isDynamic).toBe(true)
      expect(result[0].params).toContain('id')
    })
  })

  describe('命名视图扫描', () => {
    it('应该正确扫描单个默认视图文件', () => {
      createPageFile('index.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/')
      expect(result[0].viewName).toBeNull()
      expect(result[0].namedViews).toBeUndefined()
    })

    it('应该正确扫描默认视图 + 命名视图组合', () => {
      createPageFile('index.tsx')
      createPageFile('index@aux.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/')
      expect(result[0].namedViews).toBeDefined()
      expect(Object.keys(result[0].namedViews!)).toContain('aux')
    })

    it('应该正确扫描多个命名视图', () => {
      createPageFile('index.tsx')
      createPageFile('index@aux.tsx')
      createPageFile('index@sidebar.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].namedViews).toBeDefined()
      expect(Object.keys(result[0].namedViews!)).toContain('aux')
      expect(Object.keys(result[0].namedViews!)).toContain('sidebar')
    })

    it('应该正确扫描嵌套目录中的命名视图', () => {
      createPageFile('user/profile.tsx')
      createPageFile('user/profile@detail.tsx')

      const result = scanPages({
        pagesDir: testDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(result.length).toBe(1)
      expect(result[0].path).toBe('/user/profile')
      expect(result[0].namedViews).toBeDefined()
      expect(Object.keys(result[0].namedViews!)).toContain('detail')
    })

    it('只有命名视图时应该抛出错误', () => {
      createPageFile('index@aux.tsx')

      expect(() => {
        scanPages({
          pagesDir: testDir,
          extensions: ['.tsx', '.ts'],
          include: [],
          exclude: []
        })
      }).toThrow('命名视图错误')
    })
  })
})

describe('buildRouteTree', () => {
  describe('路由树构建', () => {
    it('应该正确构建简单的路由树', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/', name: 'home', parentPath: '' }),
        createMockParsedPage({ path: '/about', name: 'about', isIndex: false, parentPath: '' })
      ]

      const tree = buildRouteTree(pages)

      expect(tree.length).toBe(2)
      expect(tree.find(r => r.path === '/')).toBeDefined()
      expect(tree.find(r => r.path === '/about')).toBeDefined()
    })

    it('应该正确构建嵌套路由树', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/', name: 'home', parentPath: '' }),
        createMockParsedPage({ path: '/user', name: 'user', parentPath: 'user' }),
        createMockParsedPage({
          path: '/user/{id}',
          name: 'user-id',
          isIndex: false,
          isDynamic: true,
          params: ['id'],
          parentPath: 'user'
        })
      ]

      const tree = buildRouteTree(pages)

      expect(tree.length).toBeGreaterThan(0)

      const userRoute = tree.find(r => r.path === '/user')
      expect(userRoute).toBeDefined()
    })
  })

  describe('路由排序', () => {
    it('索引路由应该排在前面', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/about', name: 'about', isIndex: false, parentPath: '' }),
        createMockParsedPage({ path: '/', name: 'home', isIndex: true, parentPath: '' })
      ]

      const tree = buildRouteTree(pages)

      expect(tree[0].path).toBe('/')
      expect(tree[1].path).toBe('/about')
    })

    it('静态路由应该排在动态路由前面', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/user/{id}',
          name: 'user-id',
          isIndex: false,
          isDynamic: true,
          parentPath: ''
        }),
        createMockParsedPage({ path: '/about', name: 'about', isIndex: false, parentPath: '' })
      ]

      const tree = buildRouteTree(pages)

      const aboutIndex = tree.findIndex(r => r.path === '/about')
      const userIdIndex = tree.findIndex(r => r.path === '/user/{id}')

      expect(aboutIndex).toBeLessThan(userIdIndex)
    })
  })
})

describe('scanMultiplePages', () => {
  let testDir1: string
  let testDir2: string

  beforeEach(() => {
    testDir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'vitarx-router-scan1-'))
    testDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'vitarx-router-scan2-'))
  })

  afterEach(() => {
    if (fs.existsSync(testDir1)) {
      fs.rmSync(testDir1, { recursive: true, force: true })
    }
    if (fs.existsSync(testDir2)) {
      fs.rmSync(testDir2, { recursive: true, force: true })
    }
  })

  function createPageFileInDir(dir: string, relativePath: string, content: string = ''): void {
    const fullPath = path.join(dir, relativePath)
    const dirPath = path.dirname(fullPath)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    // 默认创建带有默认导出的函数组件
    const defaultContent = content || `export default function Page() { return null }`
    fs.writeFileSync(fullPath, defaultContent, 'utf-8')
  }

  describe('多目录扫描', () => {
    it('应该扫描多个目录', () => {
      createPageFileInDir(testDir1, 'index.tsx')
      createPageFileInDir(testDir2, 'admin/index.tsx')

      const result = scanMultiplePages({
        pagesDirs: [
          { dir: testDir1 },
          { dir: testDir2 }
        ],
        extensions: ['.tsx', '.ts']
      })

      expect(result.length).toBe(2)
      const paths = result.map(p => p.path)
      expect(paths).toContain('/')
      expect(paths).toContain('/admin')
    })

    it('应该合并多个目录的页面', () => {
      createPageFileInDir(testDir1, 'index.tsx')
      createPageFileInDir(testDir1, 'user/index.tsx')
      createPageFileInDir(testDir2, 'admin/index.tsx')
      createPageFileInDir(testDir2, 'admin/users.tsx')

      const result = scanMultiplePages({
        pagesDirs: [
          { dir: testDir1 },
          { dir: testDir2 }
        ],
        extensions: ['.tsx', '.ts']
      })

      expect(result.length).toBe(4)
    })

    it('每个目录应该支持独立的 include 规则', () => {
      createPageFileInDir(testDir1, 'index.tsx')
      createPageFileInDir(testDir1, 'components/Button.tsx')
      createPageFileInDir(testDir2, 'admin/index.tsx')
      createPageFileInDir(testDir2, 'admin/components/Layout.tsx')

      const result = scanMultiplePages({
        pagesDirs: [
          { dir: testDir1, include: [] },
          { dir: testDir2, include: ['admin/**'] }
        ],
        extensions: ['.tsx', '.ts']
      })

      // testDir1: include 为空匹配所有 -> 2 个文件
      // testDir2: include 为 admin/** -> 2 个文件
      expect(result.length).toBe(4)
      const paths = result.map(p => p.path)
      expect(paths).toContain('/')
      // 注意：命名策略默认为 kebab，Button -> button
      expect(paths).toContain('/components/button')
      expect(paths).toContain('/admin')
      expect(paths).toContain('/admin/components/layout')
    })

    it('每个目录应该支持独立的 exclude 规则', () => {
      createPageFileInDir(testDir1, 'index.tsx')
      createPageFileInDir(testDir1, 'components/Button.tsx')
      createPageFileInDir(testDir2, 'admin/index.tsx')
      createPageFileInDir(testDir2, 'admin/components/Layout.tsx')

      const result = scanMultiplePages({
        pagesDirs: [
          { dir: testDir1, exclude: ['components/**'] },
          { dir: testDir2, exclude: ['admin/components/**'] }
        ],
        extensions: ['.tsx', '.ts']
      })

      expect(result.length).toBe(2)
      const paths = result.map(p => p.path)
      expect(paths).toContain('/')
      expect(paths).toContain('/admin')
    })

    it('目录不存在时应返回空数组', () => {
      const result = scanMultiplePages({
        pagesDirs: [
          { dir: '/non/existent/path1' },
          { dir: '/non/existent/path2' }
        ],
        extensions: ['.tsx', '.ts']
      })

      expect(result).toEqual([])
    })
  })
})
