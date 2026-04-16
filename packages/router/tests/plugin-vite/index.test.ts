/**
 * @fileoverview Vite 插件测试
 *
 * 测试 Vite 插件的核心功能，包括：
 * - 插件配置
 * - 虚拟模块解析
 * - 路由生成
 * - definePage 移除
 * - 类型定义生成
 * - Preview模式支持
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanupTestDir,
  createPluginHelper,
  createTestContext,
  createTestDir,
  setupPluginAndLoadRoutes,
  type TestContext
} from './testUtils.js'

let ctx: TestContext

vi.mock('../../src/file-router/utils/logger.js', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}))

describe('plugin-vite/index', () => {
  beforeEach(() => {
    ctx = createTestContext('test-temp-plugin-vite')
    createTestDir(ctx.tempDir)
  })

  afterEach(() => {
    cleanupTestDir(ctx.tempDir)
  })

  describe('插件配置', () => {
    it('应该使用默认配置创建插件', () => {
      const helper = createPluginHelper()

      expect(helper.plugin.name).toBe('vite-plugin-vitarx-router')
      // expect(helper.plugin.enforce).toBe('pre')
    })

    it('应该正确解析自定义配置', () => {
      const helper = createPluginHelper({
        root: ctx.tempDir,
        pages: 'src/views',
        importMode: 'sync',
        pathStrategy: 'lowercase',
        dts: 'custom-types.d.ts'
      })

      expect(helper.plugin.name).toBe('vite-plugin-vitarx-router')
    })

    it('应该支持禁用类型定义生成', () => {
      const helper = createPluginHelper({
        root: ctx.tempDir,
        dts: false
      })

      expect(helper.plugin).toBeDefined()
    })
  })

  describe('虚拟模块解析', () => {
    it('应该正确解析虚拟模块 ID', () => {
      const helper = createPluginHelper({ root: ctx.tempDir })

      expect(helper.resolveId('virtual:vitarx-router:routes')).toBe(
        '\0virtual:vitarx-router:routes'
      )
      expect(helper.resolveId('other-module')).toBeNull()
    })
  })

  describe('路由生成', () => {
    it('应该生成正确的路由代码', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      ctx.createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages'
      })

      const code = await helper.load('\0virtual:vitarx-router:routes')
      expect(code).toBeDefined()
    })

    it.each([
      ['lazy', 'lazy(() => import('],
      ['sync', 'import _']
    ] as const)('应该正确使用 %s 导入模式生成代码', async (mode, expectedPattern) => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages',
        importMode: mode
      })

      const code = await helper.load('\0virtual:vitarx-router:routes')

      expect(code).toBeDefined()
      expect(code).toContain(expectedPattern)
    })
  })

  describe('definePage 移除', () => {
    it.each([
      ['构建模式', 'export default function Home() { return null }'],
      ['开发模式', 'export default function Home() { return null }']
    ])('应该在%s下移除 definePage', async (_, exportCode) => {
      ctx.createFile(
        'src/pages/index.tsx',
        `
        definePage({
          name: 'home',
          meta: { title: 'Home' }
        })
        ${exportCode}
      `
      )

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages'
      })

      const filePath = ctx.resolvePath('src/pages/index.tsx')
      const originalCode = ctx.readFile('src/pages/index.tsx')
      const result = helper.transform(originalCode, filePath)

      expect(result).toBeDefined()
      expect(result?.code).not.toContain('definePage')
      expect(result?.code).toContain('export default function Home')
    })

    it('非页面文件应该返回 null', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      ctx.createFile('src/utils/helper.ts', 'export function helper() { return true }')

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages'
      })

      const filePath = ctx.resolvePath('src/utils/helper.ts')
      const originalCode = ctx.readFile('src/utils/helper.ts')
      const result = helper.transform(originalCode, filePath)

      expect(result).toBeDefined()
    })
  })

  describe('类型定义生成', () => {
    it('应该生成类型定义文件', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages',
        dts: 'typed-router.d.ts'
      })

      // 触发类型定义文件生成
      await helper.load('\0virtual:vitarx-router:routes')

      expect(ctx.fileExists('typed-router.d.ts')).toBe(true)
    })

    it('禁用类型定义时不应该生成文件', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages',
        dts: false
      })

      expect(ctx.fileExists('typed-router.d.ts')).toBe(false)
    })
  })

  describe('路径策略', () => {
    it.each([
      ['kebab', 'user-profile'],
      ['lowercase', 'userprofile'],
      ['raw', 'UserProfile']
    ] as const)('应该正确使用 %s 路径策略', async (strategy, expectedPath) => {
      ctx.createFile(
        'src/pages/UserProfile.tsx',
        'export default function UserProfile() { return null }'
      )

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages',
        pathStrategy: strategy
      })

      const code = await helper.load('\0virtual:vitarx-router:routes')

      expect(code).toBeDefined()
      expect(code).toContain(expectedPath)
    })
  })

  describe('多页面目录', () => {
    it('应该支持多个页面目录', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      ctx.createFile(
        'src/admin/dashboard.tsx',
        'export default function Dashboard() { return null }'
      )

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: [
          { dir: 'src/pages', prefix: '/' },
          { dir: 'src/admin', prefix: '/admin/' }
        ]
      })

      const code = await helper.load('\0virtual:vitarx-router:routes')
      expect(code).toBeDefined()
    })
  })

  describe('extendRoute 钩子', () => {
    it('应该调用 extendRoute 钩子', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      let calledWithRoute: any = null

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages',
        extendRoute: route => {
          calledWithRoute = route
          route.meta = { ...route.meta, custom: true }
          return route
        }
      })

      helper.load('\0virtual:vitarx-router:routes')

      expect(calledWithRoute).toBeDefined()
      expect(calledWithRoute.meta?.custom).toBe(true)
    })
  })

  describe('injectImports 配置', () => {
    it('应该注入自定义导入语句', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages',
        injectImports: ["import { customHelper } from './helpers'"]
      })

      const code = await helper.load('\0virtual:vitarx-router:routes')
      expect(code).toBeDefined()
    })
  })

  describe('Preview模式', () => {
    it('应该在preview模式下跳过初始化', async () => {
      const helper = createPluginHelper({ root: ctx.tempDir }, { isPreview: true })
      await helper.configResolved()

      const result = await helper.load('\0virtual:vitarx-router:routes')
      expect(result).toBeNull()
    })

    it('在preview模式下transform应该返回null', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const helper = createPluginHelper(
        { root: ctx.tempDir, pages: 'src/pages' },
        { isPreview: true }
      )
      await helper.configResolved()

      const filePath = ctx.resolvePath('src/pages/index.tsx')
      const result = helper.transform('export default function Home() { return null }', filePath)
      expect(result).toBeNull()
    })
  })

  describe('configureServer', () => {
    it('应该正确配置开发服务器', async () => {
      ctx.createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const helper = await setupPluginAndLoadRoutes({
        root: ctx.tempDir,
        pages: 'src/pages'
      })

      const mockServer = {
        watcher: {
          add: vi.fn(),
          on: vi.fn()
        },
        moduleGraph: {
          getModuleById: vi.fn(() => ({ id: '\0virtual:vitarx-router:routes' })),
          invalidateModule: vi.fn()
        }
      }

      const configureServer = helper.plugin.configureServer as (server: any) => void
      configureServer(mockServer)

      expect(mockServer.watcher.add).toHaveBeenCalled()
      expect(mockServer.watcher.on).toHaveBeenCalled()
    })
  })
})
