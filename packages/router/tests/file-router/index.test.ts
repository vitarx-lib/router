/**
 * @fileoverview FileRouter 类测试
 *
 * 测试 FileRouter 类的核心功能，包括：
 * - 配置解析
 * - 页面扫描
 * - 路由代码生成
 * - 类型定义生成
 * - definePage 宏处理
 * - 缓存机制
 */
import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileRouter } from '../../src/file-router/index.js'
import { createTestHelpers } from './testUtils.js'

const { tempDir, createTestDir, cleanupTestDir, createFile, resolvePath } =
  createTestHelpers('file-router')

describe('file-router/index (FileRouter)', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('配置解析', () => {
    it('应该使用默认配置创建 FileRouter', () => {
      const router = new FileRouter()
      expect(router.config).toBeDefined()
      expect(router.config.extensions).toEqual(['.tsx', '.jsx'])
      expect(router.config.importMode).toBe('lazy')
      expect(router.config.namingStrategy).toBe('kebab')
    })

    it('应该正确解析自定义配置', () => {
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/views',
        extensions: ['.tsx'],
        importMode: 'file',
        namingStrategy: 'lowercase'
      })

      expect(router.config.root).toBe(tempDir)
      expect(router.config.extensions).toEqual(['.tsx'])
      expect(router.config.importMode).toBe('file')
      expect(router.config.namingStrategy).toBe('lowercase')
    })

    it('应该正确解析多个页面目录配置', () => {
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

  describe('页面扫描', () => {
    it('应该扫描单个页面文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return <div>Home</div> }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.scan()
      const pages = router.getPages()

      expect(pages).toHaveLength(1)
      expect(pages[0].path).toBe('/')
      expect(pages[0].isIndex).toBe(true)
    })

    it('应该正确处理动态路由参数', () => {
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.scan()
      const pages = router.getPages()

      const dynamicPage = pages.find(p => p.isDynamic)
      expect(dynamicPage).toBeDefined()
      expect(dynamicPage?.params).toContain('id')
      expect(dynamicPage?.path).toBe('/users/{id}')
    })
  })

  describe('路由树构建', () => {
    it('应该构建正确的路由树结构', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.scan()
      const routeTree = router.getRouteTree()

      expect(routeTree.length).toBeGreaterThan(0)
    })
  })

  describe('路由代码生成', () => {
    it('应该生成正确的路由代码', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.scan()
      const result = await router.generateRoutes()

      expect(result.code).toBeDefined()
      expect(result.code).toContain('export default')
      expect(result.pages.length).toBeGreaterThan(0)
    })

    it('应该使用 lazy 导入模式', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        importMode: 'lazy'
      })

      router.scan()
      const result = await router.generateRoutes()

      expect(result.code).toContain("import { lazy } from 'vitarx'")
      expect(result.code).toContain('lazy(() => import(')
    })

    it('应该使用 file 导入模式', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        importMode: 'file'
      })

      router.scan()
      const result = await router.generateRoutes()

      expect(result.code).not.toContain("import { lazy } from 'vitarx'")
    })
  })

  describe('类型定义生成', () => {
    it('应该生成正确的类型定义', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.scan()
      const dts = router.generateDts()

      expect(dts).toContain('declare module')
      expect(dts).toContain('RouteIndexMap')
    })

    it('应该正确写入类型定义文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.scan()
      const result = router.writeDts('typed-router.d.ts')

      expect(result).toBeDefined()
      expect(result?.path).toContain('typed-router.d.ts')
      expect(fs.existsSync(result!.path)).toBe(true)
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

      expect(result).toBeNull()
    })
  })

  describe('isPageFile 方法', () => {
    it('应该正确识别页面文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.scan()

      const indexPath = resolvePath('src/pages/index.tsx')

      expect(router.isPageFile(indexPath)).toBe(true)
    })
  })

  describe('缓存机制', () => {
    it('应该正确清除缓存', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      router.scan()
      await router.generateRoutes()

      router.invalidate()

      const result = await router.generateRoutes()
      expect(result.code).toBeDefined()
    })
  })
})
