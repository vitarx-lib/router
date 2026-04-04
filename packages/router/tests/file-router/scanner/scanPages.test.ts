/**
 * @fileoverview 页面扫描模块测试
 *
 * 测试页面扫描功能，包括：
 * - 单页面文件扫描
 * - 嵌套目录扫描
 * - 动态路由参数
 * - 路径前缀处理
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ResolvedPageConfig } from '../../../src/file-router/config/index.js'
import type { MultiScanOptions } from '../../../src/file-router/scanner/scanPages.js'
import { scanMultiplePages } from '../../../src/file-router/scanner/scanPages.js'
import { createTestHelpers } from '../testUtils.js'

const { createTestDir, cleanupTestDir, createFile, resolvePath } = createTestHelpers('scan-pages')

describe('scanner/scanPages', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('scanMultiplePages', () => {
    it('应该扫描单个页面文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return <div>Home</div> }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const options: MultiScanOptions = {
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      const pages = scanMultiplePages(options)

      expect(pages).toHaveLength(1)
      expect(pages[0].path).toBe('/')
      expect(pages[0].isIndex).toBe(true)
    })

    it('应该扫描嵌套目录结构', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')
      createFile('src/pages/users/index.tsx', 'export default function Users() { return null }')
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const options: MultiScanOptions = {
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      const pages = scanMultiplePages(options)

      expect(pages.length).toBeGreaterThan(0)
    })

    it('应该正确处理动态路由参数', () => {
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const options: MultiScanOptions = {
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      const pages = scanMultiplePages(options)

      const dynamicPage = pages.find(p => p.isDynamic)
      expect(dynamicPage).toBeDefined()
      expect(dynamicPage?.params).toContain('id')
      expect(dynamicPage?.path).toBe('/users/{id}')
    })

    it('应该正确处理路径前缀', () => {
      createFile('admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('admin'),
        include: [],
        exclude: [],
        prefix: '/admin/'
      }

      const options: MultiScanOptions = {
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      const pages = scanMultiplePages(options)

      expect(pages[0].path).toBe('/admin/dashboard')
    })

    it('应该正确处理多个页面目录', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const options: MultiScanOptions = {
        pages: [
          { dir: resolvePath('src/pages'), include: [], exclude: [], prefix: '/' },
          { dir: resolvePath('src/admin'), include: [], exclude: [], prefix: '/admin/' }
        ],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      const pages = scanMultiplePages(options)

      expect(pages.length).toBe(2)
    })

    it('应该正确处理布局文件', () => {
      createFile(
        'src/pages/users/_layout.tsx',
        'export default function UsersLayout() { return null }'
      )
      createFile('src/pages/users/index.tsx', 'export default function Users() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const options: MultiScanOptions = {
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      const pages = scanMultiplePages(options)

      const layoutPage = pages.find(p => p.path === '/users')
      expect(layoutPage?.isLayoutFile).toBe(true)
    })

    it('应该正确处理命名布局文件', () => {
      createFile(
        'src/pages/users/_layout.admin.tsx',
        'export default function AdminLayout() { return null }'
      )
      createFile('src/pages/users/index.tsx', 'export default function Users() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const options: MultiScanOptions = {
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      const pages = scanMultiplePages(options)

      const layoutPage = pages.find(p => p.path === '/users' && p.isLayoutFile)
      expect(layoutPage).toBeDefined()
      expect(layoutPage?.filePath).toContain('_layout.admin.tsx')
    })

    it('应该在同名文件和目录同时存在时抛出异常', () => {
      createFile('src/pages/users.tsx', 'export default function Users() { return null }')
      createFile(
        'src/pages/users/index.tsx',
        'export default function UsersIndex() { return null }'
      )

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const options: MultiScanOptions = {
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      expect(() => scanMultiplePages(options)).toThrow(/不允许同名文件和目录同时存在/)
    })

    it('应该正确处理不存在的目录', () => {
      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('non-existent'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const options: MultiScanOptions = {
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      }

      const pages = scanMultiplePages(options)

      expect(pages).toHaveLength(0)
    })
  })
})
