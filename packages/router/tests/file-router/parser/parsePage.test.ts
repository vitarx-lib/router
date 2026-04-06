/**
 * @fileoverview 页面解析模块测试
 *
 * 测试页面文件解析功能，包括：
 * - 路由路径生成
 * - 动态参数识别
 * - 路由名称生成
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parsePageFile } from '../../../src/file-router/parser/parsePage.js'
import { createTestHelpers } from '../testUtils.js'

const { createTestDir, cleanupTestDir, createFile, resolvePath } = createTestHelpers('parse-page')

describe('parser/parsePage', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('parsePageFile', () => {
    it('应该正确解析 index 页面', async () => {
      const filePath = createFile(
        'pages/index.tsx',
        'export default function Home() { return null }'
      )
      const pagesDir = resolvePath('pages')

      const result = await parsePageFile(filePath, pagesDir, '', 'kebab', '')

      expect(result).toBeDefined()
      expect(result?.path).toBe('/')
      expect(result?.isIndex).toBe(true)
    })

    it('应该正确解析普通页面', async () => {
      const filePath = createFile(
        'pages/about.tsx',
        'export default function About() { return null }'
      )
      const pagesDir = resolvePath('pages')

      const result = await parsePageFile(filePath, pagesDir, '', 'kebab', '')

      expect(result).toBeDefined()
      expect(result?.path).toBe('/about')
      expect(result?.isIndex).toBe(false)
    })

    it('应该正确解析动态路由参数', async () => {
      const filePath = createFile(
        'pages/users/[id].tsx',
        'export default function UserDetail() { return null }'
      )
      const pagesDir = resolvePath('pages')

      const result = await parsePageFile(filePath, pagesDir, '', 'kebab', '')

      expect(result).toBeDefined()
      expect(result?.isDynamic).toBe(true)
      expect(result?.params).toContain('id')
      expect(result?.path).toBe('/users/{id}')
    })

    it('应该正确处理路径前缀', async () => {
      const filePath = createFile(
        'admin/dashboard.tsx',
        'export default function Dashboard() { return null }'
      )
      const pagesDir = resolvePath('admin')

      const result = await parsePageFile(filePath, pagesDir, '', 'kebab', '/admin/')

      expect(result).toBeDefined()
      expect(result?.path).toBe('/admin/dashboard')
    })

    it('应该正确处理嵌套目录', async () => {
      const filePath = createFile(
        'pages/users/profile.tsx',
        'export default function Profile() { return null }'
      )
      const pagesDir = resolvePath('pages')

      const result = await parsePageFile(filePath, pagesDir, 'users', 'kebab', '')

      expect(result).toBeDefined()
      expect(result?.path).toBe('/users/profile')
    })

    it('应该正确应用命名策略', async () => {
      const filePath = createFile(
        'pages/UserProfile.tsx',
        'export default function UserProfile() { return null }'
      )
      const pagesDir = resolvePath('pages')

      const resultKebab = await parsePageFile(filePath, pagesDir, '', 'kebab', '')
      expect(resultKebab?.path).toBe('/user-profile')

      const resultLower = await parsePageFile(filePath, pagesDir, '', 'lowercase', '')
      expect(resultLower?.path).toBe('/userprofile')

      const resultNone = await parsePageFile(filePath, pagesDir, '', 'none', '')
      expect(resultNone?.path).toBe('/UserProfile')
    })

    it('应该正确解析命名视图', async () => {
      const filePath = createFile(
        'pages/index@sidebar.tsx',
        'export default function Sidebar() { return null }'
      )
      const pagesDir = resolvePath('pages')

      const result = await parsePageFile(filePath, pagesDir, '', 'kebab', '')

      expect(result).toBeDefined()
      expect(result?.viewName).toBe('sidebar')
    })

    it('缺少默认导出时应该返回 null', async () => {
      const filePath = createFile('pages/no-export.tsx', 'export const helper = () => {}')
      const pagesDir = resolvePath('pages')

      const result = await parsePageFile(filePath, pagesDir, '', 'kebab', '')

      expect(result).toBeNull()
    })
  })
})
