/**
 * @fileoverview FileRouter 编排层测试
 *
 * 测试 FileRouter 类的公共 API：
 * - 配置解析
 * - 路由代码生成
 * - 类型定义生成
 * - definePage 宏处理
 * - 缓存机制
 * - 重新加载
 * - 文件映射表
 * - getRouteFullPath
 */
import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileRouter } from '../../../src/file-router/index.js'
import { createTestHelpers } from '../testUtils.js'

const { tempDir, createTestDir, cleanupTestDir, createFile, resolvePath } =
  createTestHelpers('file-router-manager')

describe('file-router/manager/index (FileRouter)', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('配置解析', () => {
    it('应该使用默认配置创建 FileRouter', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir
      })

      expect(router.config).toBeDefined()
      expect(router.config.importMode).toBe('lazy')
      expect(router.config.pathStrategy).toBe('kebab')
    })

    it('应该正确解析自定义配置', () => {
      createFile('src/views/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/views',
        importMode: 'sync',
        pathStrategy: 'lowercase'
      })

      expect(router.config.root).toBe(tempDir)
      expect(router.config.importMode).toBe('sync')
      expect(router.config.pathStrategy).toBe('lowercase')
    })

    it('应该正确解析多个页面目录配置', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: [
          { dir: 'src/pages', prefix: '/' },
          { dir: 'src/admin', prefix: '/admin/' }
        ]
      })

      expect(router.config.pages).toHaveLength(2)
    })
  })

  describe('路由代码生成', () => {
    it('应该生成正确的路由代码', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const result = router.generate()

      expect(result.code).toBeDefined()
      expect(result.code).toContain('export default')
    })

    it('应该使用 lazy 导入模式', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        importMode: 'lazy'
      })

      const result = router.generate()

      expect(result.code).toContain('import { lazy } from "vitarx"')
      expect(result.code).toContain('lazy(() => import(')
    })

    it('应该使用 sync 导入模式', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        importMode: 'sync'
      })

      const result = router.generate()

      expect(result.code).not.toContain('import { lazy } from "vitarx"')
    })
  })

  describe('类型定义生成', () => {
    it('应该生成正确的类型定义', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        dts: true
      })

      const result = router.generate()

      expect(result.dts).toContain('declare module')
      expect(result.dts).toContain('RouteIndexMap')
    })

    it('应该正确写入类型定义文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        dts: 'typed-router.d.ts'
      })

      router.generate()

      const dtsPath = resolvePath('typed-router.d.ts')
      expect(fs.existsSync(dtsPath)).toBe(true)
    })

    it('禁用类型定义时不应该生成文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        dts: false
      })

      router.generate()

      const dtsPath = resolvePath('typed-router.d.ts')
      expect(fs.existsSync(dtsPath)).toBe(false)
    })
  })

  describe('definePage 宏处理', () => {
    it('应该移除 definePage 调用', () => {
      createFile('src/pages/test.tsx', 'export default function Test() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const code = `
        definePage({
          name: 'home',
          meta: { title: 'Home' }
        })
        export default function Home() { return null }
      `

      const filePath = resolvePath('src/pages/test.tsx')
      const result = router.removeDefinePage(code, filePath)

      expect(result).toBeDefined()
      expect(result!.code).not.toContain('definePage')
      expect(result!.code).toContain('export default function Home')
    })

    it('没有 definePage 时应该返回 null', () => {
      createFile('src/pages/test.tsx', 'export default function Test() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const code = 'export default function Home() { return null }'
      const filePath = resolvePath('src/pages/test.tsx')
      const result = router.removeDefinePage(code, filePath)

      expect(result).toBeNull()
    })

    it('非页面文件应该返回 null', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const code = `
        definePage({
          name: 'home'
        })
        export default function Home() { return null }
      `

      const result = router.removeDefinePage(code, '/non/page/file.tsx')

      expect(result).toBeDefined()
    })
  })

  describe('缓存机制', () => {
    it('应该正确清除缓存', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.generate()
      router.clearGenerateResult()

      const result = router.generate()
      expect(result.code).toBeDefined()
    })

    it('应该缓存生成结果', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const result1 = router.generate()
      const result2 = router.generate()

      expect(result1).toBe(result2)
    })
  })

  describe('重新加载', () => {
    it('应该正确重新加载所有页面', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.nodeTree).toHaveLength(1)

      createFile('src/pages/about.tsx', 'export default function About() { return null }')
      router.reload()

      expect(router.nodeTree).toHaveLength(2)
    })

    it('重新加载应该保持文件映射有效', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.fileMap.size).toBe(1)

      router.reload()

      expect(router.fileMap.size).toBe(1)
    })
  })

  describe('文件映射表', () => {
    it('应该正确维护文件映射表', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.fileMap.size).toBe(2)

      const indexPath = resolvePath('src/pages/index.tsx')
      const aboutPath = resolvePath('src/pages/about.tsx')

      expect(router.fileMap.has(indexPath)).toBe(true)
      expect(router.fileMap.has(aboutPath)).toBe(true)
    })

    it('应该正确映射文件到路由节点', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/index.tsx')
      const node = router.fileMap.get(filePath)

      expect(node).toBeDefined()
      expect(node?.path).toBe('/')
      expect(node?.filePath).toBe(filePath)
    })
  })

  describe('getRouteFullPath', () => {
    it('应该返回页面文件的完整路由路径', () => {
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/about.tsx')
      expect(router.getRouteFullPath(filePath)).toBe('/about')
    })

    it('应该返回 index 页面的根路径', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/index.tsx')
      expect(router.getRouteFullPath(filePath)).toBe('/')
    })

    it('应该返回嵌套路由的完整路径', () => {
      createFile('src/pages/users/profile.tsx', 'export default function Profile() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/users/profile.tsx')
      expect(router.getRouteFullPath(filePath)).toBe('/users/profile')
    })

    it('应该正确处理动态路由参数', () => {
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/users/[id].tsx')
      expect(router.getRouteFullPath(filePath)).toBe('/users/{id}')
    })

    it('布局文件应返回 null', () => {
      createFile('src/pages/_layout.tsx', 'export default function Layout() { return null }')
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const layoutPath = resolvePath('src/pages/_layout.tsx')
      expect(router.getRouteFullPath(layoutPath)).toBeNull()
    })

    it('非页面文件应返回 null', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/utils/helper.ts', 'export function helper() {}')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const helperPath = resolvePath('src/utils/helper.ts')
      expect(router.getRouteFullPath(helperPath)).toBeNull()
    })

    it('未扫描的页面文件应推算 fullPath', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      createFile('src/pages/new-page.tsx', 'export default function NewPage() { return null }')
      const newPagePath = resolvePath('src/pages/new-page.tsx')
      expect(router.getRouteFullPath(newPagePath)).toBe('/new-page')
    })

    it('应该正确应用 kebab 路径策略', () => {
      createFile(
        'src/pages/UserProfile.tsx',
        'export default function UserProfile() { return null }'
      )

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        pathStrategy: 'kebab'
      })

      const filePath = resolvePath('src/pages/UserProfile.tsx')
      expect(router.getRouteFullPath(filePath)).toBe('/user-profile')
    })

    it('带前缀的页面目录应正确计算 fullPath', () => {
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: [{ dir: 'src/admin', prefix: '/admin/', group: false }]
      })

      const filePath = resolvePath('src/admin/dashboard.tsx')
      expect(router.getRouteFullPath(filePath)).toBe('/admin/dashboard')
    })
  })
})
