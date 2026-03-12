/**
 * @fileoverview 编译场景集成测试
 *
 * 测试完整的文件路由编译流程， * 包括文件扫描、路由树构建、代码生成等。
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateRoutes } from '../../src/vite/core/generateRoutes.js'
import * as logger from '../../src/vite/core/logger.js'
import { buildRouteTree, scanPages } from '../../src/vite/core/scanPages.js'

let tempDir: string

function createTempDir(): string {
  const dir = path.join(
    process.cwd(),
    'temp-test-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  )
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function createFile(relativePath: string, content: string = ''): void {
  const filePath = path.join(tempDir, relativePath)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, content)
}

function cleanupTempDir(): void {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

describe('编译场景集成测试', () => {
  beforeEach(() => {
    tempDir = createTempDir()
  })

  afterEach(() => {
    cleanupTempDir()
  })

  describe('布局路由（同名文件+目录）', () => {
    it('应正确处理同名文件+目录组合', async () => {
      // const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      createFile('users.tsx', 'export default function UsersLayout() {}')
      createFile('users/index.tsx', 'export default function UsersIndex() {}')
      createFile('users/profile.tsx', 'export default function UsersProfile() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)
      expect(tree.length).toBe(1)
      expect(tree[0].path).toBe('/users')
      expect(tree[0].isLayoutFile).toBe(true)
      expect(tree[0].children.length).toBe(2)

      // index 子路由
      const indexChild = tree[0].children.find(c => c.path === 'index')
      expect(indexChild).toBeDefined()

      // profile 子路由
      const profileChild = tree[0].children.find(c => c.path === 'profile')
      expect(profileChild).toBeDefined()

      // 自动 redirect
      expect(tree[0].redirect).toBe('/users/index')

      // 验证警告日志
      // expect(warnSpy).toHaveBeenCalled()
      // expect(warnSpy.mock.calls[0][0]).toContain('同名文件+目录')

      // warnSpy.mockRestore()
    })

    it('布局文件无 index 子路由时不应有 redirect', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      createFile('users.tsx', 'export default function UsersLayout() {}')
      createFile('users/profile.tsx', 'export default function UsersProfile() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)

      expect(tree.length).toBe(1)
      expect(tree[0].path).toBe('/users')
      expect(tree[0].isLayoutFile).toBe(true)
      expect(tree[0].children.length).toBe(1)
      expect(tree[0].redirect).toBeUndefined()

      warnSpy.mockRestore()
    })
  })

  describe('纯目录路由', () => {
    it('目录+index+子页面应正确构建', async () => {
      createFile('users/index.tsx', 'export default function UsersIndex() {}')
      createFile('users/profile.tsx', 'export default function UsersProfile() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)

      expect(tree.length).toBe(1)
      expect(tree[0].path).toBe('/users')
      expect(tree[0].isLayoutFile).toBeUndefined()
      expect(tree[0].children.length).toBe(2)

      // index 子路由
      const indexChild = tree[0].children.find(c => c.path === 'index')
      expect(indexChild).toBeDefined()

      // 自动 redirect
      expect(tree[0].redirect).toBe('/users/index')
    })

    it('目录+子页面（无index）不应有 component 和 redirect', async () => {
      createFile('users/profile1.tsx', 'export default function Profile1() {}')
      createFile('users/profile2.tsx', 'export default function Profile2() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)

      expect(tree.length).toBe(1)
      expect(tree[0].path).toBe('/users')
      expect(tree[0].children.length).toBe(2)
      expect(tree[0].redirect).toBeUndefined()
    })

    it('目录+index 应作为独立路由', async () => {
      createFile('users/index.tsx', 'export default function UsersIndex() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)

      expect(tree.length).toBe(1)
      expect(tree[0].path).toBe('/users')
      expect(tree[0].children.length).toBe(0)
    })
  })

  describe('嵌套目录', () => {
    it('应正确处理多层嵌套', async () => {
      createFile('users/index.tsx', 'export default function UsersIndex() {}')
      createFile('users/profile.tsx', 'export default function Profile() {}')
      createFile('users/settings/index.tsx', 'export default function SettingsIndex() {}')
      createFile('users/settings/security.tsx', 'export default function Security() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)

      expect(tree.length).toBe(1)
      expect(tree[0].path).toBe('/users')

      // 验证 settings 子路由
      const settingsRoute = tree[0].children.find(c => c.path === 'settings')
      expect(settingsRoute).toBeDefined()
      expect(settingsRoute?.children.length).toBe(2)

      // 验证 security 子路由
      const securityRoute = settingsRoute?.children.find(c => c.path === 'security')
      expect(securityRoute).toBeDefined()
    })
  })

  describe('纯文件路由', () => {
    it('纯文件应作为独立路由', async () => {
      createFile('users.tsx', 'export default function Users() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)

      expect(tree.length).toBe(1)
      expect(tree[0].path).toBe('/users')
      expect(tree[0].isLayoutFile).toBeUndefined()
      expect(tree[0].children.length).toBe(0)
    })
  })

  describe('同名扩展名冲突', () => {
    it('同名不同扩展名应抛出警告并忽略后者', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      createFile('users.tsx', 'export default function Users() {}')
      createFile('users.jsx', 'export default function Users() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
        include: [],
        exclude: []
      })

      // 应该只有一个（第一个被扫描到的）
      expect(pages.length).toBe(1)

      // 应该有警告
      expect(warnSpy).toHaveBeenCalled()
      expect(warnSpy.mock.calls[0][0]).toContain('同名文件冲突')

      warnSpy.mockRestore()
    })
  })

  describe('代码生成', () => {
    it('应正确生成布局路由代码', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      createFile('users.tsx', 'export default function UsersLayout() {}')
      createFile('users/index.tsx', 'export default function UsersIndex() {}')
      createFile('users/profile.tsx', 'export default function UsersProfile() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)
      const code = await generateRoutes(tree)

      // 验证导入语句
      expect(code).toContain("import { lazy } from 'vitarx'")

      // 验证布局路由
      expect(code).toContain("path: '/users'")
      expect(code).toContain("redirect: '/users/index'")

      // 验证子路由
      expect(code).toContain("path: 'index'")
      expect(code).toContain("path: 'profile'")

      warnSpy.mockRestore()
    })

    it('应正确生成纯目录路由代码', async () => {
      createFile('users/index.tsx', 'export default function UsersIndex() {}')
      createFile('users/profile.tsx', 'export default function UsersProfile() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)
      const code = await generateRoutes(tree)

      // 验证导入语句
      expect(code).toContain("import { lazy } from 'vitarx'")

      // 验证路由
      expect(code).toContain("path: '/users'")
      expect(code).toContain("redirect: '/users/index'")
      expect(code).toContain("path: 'index'")
      expect(code).toContain("path: 'profile'")
    })

    it('应正确生成 file 模式代码', async () => {
      createFile('users.tsx', 'export default function Users() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)
      const code = await generateRoutes(tree, { importMode: 'file' })

      // 不应包含 lazy 导入
      expect(code).not.toContain("import { lazy } from 'vitarx'")

      // component 应该是字符串路径
      expect(code).toContain("component: '")
    })
  })

  describe('无效目录', () => {
    it('空目录应返回空数组', () => {
      createFile('users/.gitkeep', '')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(pages.length).toBe(0)
    })

    it('无匹配文件的目录应返回空数组', () => {
      createFile('users/readme.md', '# Users')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(pages.length).toBe(0)
    })
  })

  describe('definePage 支持', () => {
    it('应正确解析 definePage 配置', async () => {
      createFile(
        'users.tsx',
        `import { definePage } from 'vitarx-router/auto-routes'
definePage({
  name: 'user-list',
  meta: { title: '用户列表' },
  pattern: { id: /^\\d+$/ }
})
export default function Users() {}`
      )

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(pages.length).toBe(1)
      expect(pages[0].name).toBe('user-list')
      expect(pages[0].meta?.title).toBe('用户列表')
      expect(pages[0].pattern?.id).toBeInstanceOf(RegExp)
    })

    it('应正确处理 redirect 配置', async () => {
      createFile(
        'old-page.tsx',
        `import { definePage } from 'vitarx-router/auto-routes'
definePage({
  redirect: '/new-page'
})
export default function OldPage() {}`
      )

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      expect(pages.length).toBe(1)
      expect(pages[0].redirect).toBe('/new-page')
    })
  })

  describe('复杂场景', () => {
    it('应正确处理混合场景', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      // 布局路由
      createFile('admin.tsx', 'export default function AdminLayout() {}')
      createFile('admin/index.tsx', 'export default function AdminIndex() {}')
      createFile('admin/users.tsx', 'export default function AdminUsers() {}')

      // 纯目录路由
      createFile('public/index.tsx', 'export default function PublicIndex() {}')
      createFile('public/about.tsx', 'export default function PublicAbout() {}')

      // 纯文件路由
      createFile('home.tsx', 'export default function Home() {}')

      const pages = scanPages({
        pagesDir: tempDir,
        extensions: ['.tsx', '.ts'],
        include: [],
        exclude: []
      })

      const tree = buildRouteTree(pages)

      // 应该有 3 个顶级路由
      expect(tree.length).toBe(3)

      // 验证 admin 布局路由
      const adminRoute = tree.find(r => r.path === '/admin')
      expect(adminRoute).toBeDefined()
      expect(adminRoute?.isLayoutFile).toBe(true)
      expect(adminRoute?.children.length).toBe(2)

      // 验证 public 目录路由
      const publicRoute = tree.find(r => r.path === '/public')
      expect(publicRoute).toBeDefined()
      expect(publicRoute?.children.length).toBe(2)

      // 验证 home 文件路由
      const homeRoute = tree.find(r => r.path === '/home')
      expect(homeRoute).toBeDefined()
      expect(homeRoute?.children.length).toBe(0)

      warnSpy.mockRestore()
    })
  })
})
