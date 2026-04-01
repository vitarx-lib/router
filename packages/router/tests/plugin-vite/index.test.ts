/**
 * @fileoverview Vite 插件测试
 *
 * 测试 Vite 插件的核心功能，包括：
 * - 插件配置
 * - 虚拟模块解析
 * - 路由生成
 * - definePage 移除
 * - 类型定义生成
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VitarxRouter, {
  DEFAULT_DTS_FILE,
  type RouterPluginOptions
} from '../../src/plugin-vite/index.js'

const tempDir = path.resolve(process.cwd(), 'test-temp-plugin-vite')

function createTestDir() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
  fs.mkdirSync(tempDir, { recursive: true })
}

function cleanupTestDir() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function createFile(filePath: string, content: string = '') {
  const fullPath = path.join(tempDir, filePath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(fullPath, content, 'utf-8')
}

vi.mock('../../src/file-router/utils/logger.js', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}))

describe('plugin-vite/index', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('插件配置', () => {
    it('应该使用默认配置创建插件', () => {
      const plugin = VitarxRouter()

      expect(plugin.name).toBe('vite-plugin-vitarx-router')
      expect(plugin.enforce).toBe('pre')
    })

    it('应该正确解析自定义配置', () => {
      const options: RouterPluginOptions = {
        root: tempDir,
        pages: 'src/views',
        extensions: ['.tsx'],
        importMode: 'file',
        namingStrategy: 'lowercase',
        dts: 'custom-types.d.ts'
      }

      const plugin = VitarxRouter(options)

      expect(plugin.name).toBe('vite-plugin-vitarx-router')
    })

    it('应该支持禁用类型定义生成', () => {
      const plugin = VitarxRouter({
        root: tempDir,
        dts: false
      })

      expect(plugin).toBeDefined()
    })
  })

  describe('虚拟模块解析', () => {
    it('应该正确解析虚拟模块 ID', () => {
      const plugin = VitarxRouter({ root: tempDir })
      const resolveId = plugin.resolveId as (id: string) => string | null

      expect(resolveId('virtual:vitarx-router:routes')).toBe('\0virtual:vitarx-router:routes')
      expect(resolveId('other-module')).toBeNull()
    })
  })

  describe('路由生成', () => {
    it('应该生成正确的路由代码', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      const code = await load('\0virtual:vitarx-router:routes')

      expect(code).toBeDefined()
      expect(code).toContain('export default')
    })

    it('应该使用 lazy 导入模式生成代码', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        importMode: 'lazy'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      const code = await load('\0virtual:vitarx-router:routes')

      expect(code).toContain("import { lazy } from 'vitarx'")
    })

    it('应该使用 file 导入模式生成代码', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        importMode: 'file'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      const code = await load('\0virtual:vitarx-router:routes')

      expect(code).not.toContain("import { lazy } from 'vitarx'")
    })
  })

  describe('definePage 移除', () => {
    it('应该在构建模式下移除 definePage', () => {
      createFile(
        'src/pages/index.tsx',
        `
        definePage({
          name: 'home',
          meta: { title: 'Home' }
        })
        export default function Home() { return null }
      `
      )

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'build' })

      const transform = plugin.transform as (
        code: string,
        id: string
      ) => { code: string; map: null } | null

      const filePath = path.join(tempDir, 'src/pages/index.tsx')
      const originalCode = fs.readFileSync(filePath, 'utf-8')
      const result = transform(originalCode, filePath)

      expect(result).toBeDefined()
      expect(result?.code).not.toContain('definePage')
      expect(result?.code).toContain('export default function Home')
    })

    it('应该在开发模式下移除 definePage', () => {
      createFile(
        'src/pages/index.tsx',
        `
        definePage({
          name: 'home'
        })
        export default function Home() { return null }
      `
      )

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const transform = plugin.transform as (
        code: string,
        id: string
      ) => { code: string; map: null } | null

      const filePath = path.join(tempDir, 'src/pages/index.tsx')
      const originalCode = fs.readFileSync(filePath, 'utf-8')
      const result = transform(originalCode, filePath)

      expect(result).toBeDefined()
      expect(result?.code).not.toContain('definePage')
    })

    it('非页面文件应该返回 null', () => {
      createFile('src/utils/helper.ts', 'export function helper() { return true }')

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'build' })

      const transform = plugin.transform as (
        code: string,
        id: string
      ) => { code: string; map: null } | null

      const filePath = path.join(tempDir, 'src/utils/helper.ts')
      const originalCode = fs.readFileSync(filePath, 'utf-8')
      const result = transform(originalCode, filePath)

      expect(result).toBeNull()
    })
  })

  describe('类型定义生成', () => {
    it('应该生成类型定义文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        dts: 'typed-router.d.ts'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const dtsPath = path.join(tempDir, 'typed-router.d.ts')
      expect(fs.existsSync(dtsPath)).toBe(true)

      const content = fs.readFileSync(dtsPath, 'utf-8')
      expect(content).toContain('declare module')
      expect(content).toContain('RouteIndexMap')
    })

    it('禁用类型定义时不应该生成文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        dts: false
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const dtsPath = path.join(tempDir, 'typed-router.d.ts')
      expect(fs.existsSync(dtsPath)).toBe(false)
    })
  })

  describe('命名策略', () => {
    it('应该使用 kebab 命名策略', async () => {
      createFile(
        'src/pages/UserProfile.tsx',
        'export default function UserProfile() { return null }'
      )

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        namingStrategy: 'kebab'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      const code = await load('\0virtual:vitarx-router:routes')

      expect(code).toContain('user-profile')
    })

    it('应该使用 lowercase 命名策略', async () => {
      createFile(
        'src/pages/UserProfile.tsx',
        'export default function UserProfile() { return null }'
      )

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        namingStrategy: 'lowercase'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      const code = await load('\0virtual:vitarx-router:routes')

      expect(code).toContain('userprofile')
    })

    it('应该使用 none 命名策略', async () => {
      createFile(
        'src/pages/UserProfile.tsx',
        'export default function UserProfile() { return null }'
      )

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        namingStrategy: 'none'
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      const code = await load('\0virtual:vitarx-router:routes')

      expect(code).toContain('UserProfile')
    })
  })

  describe('多页面目录', () => {
    it('应该支持多个页面目录', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const plugin = VitarxRouter({
        root: tempDir,
        pages: [
          { dir: 'src/pages', prefix: '/' },
          { dir: 'src/admin', prefix: '/admin/' }
        ]
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      const code = await load('\0virtual:vitarx-router:routes')

      expect(code).toContain('/')
      expect(code).toContain('/admin/dashboard')
    })
  })

  describe('extendRoute 钩子', () => {
    it('应该调用 extendRoute 钩子', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      let calledWithRoute: any = null

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        extendRoute: route => {
          calledWithRoute = route
          route.meta = { ...route.meta, custom: true }
          return route
        }
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      await load('\0virtual:vitarx-router:routes')

      expect(calledWithRoute).toBeDefined()
      expect(calledWithRoute.meta?.custom).toBe(true)
    })
  })

  describe('injectImports 配置', () => {
    it('应该注入自定义导入语句', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const plugin = VitarxRouter({
        root: tempDir,
        pages: 'src/pages',
        injectImports: ["import { customHelper } from './helpers'"]
      })

      const configResolved = plugin.configResolved as (config: { command: string }) => void
      configResolved({ command: 'serve' })

      const load = plugin.load as (id: string) => Promise<string | null>
      const code = await load('\0virtual:vitarx-router:routes')

      expect(code).toContain("import { customHelper } from './helpers'")
    })
  })
})

describe('DEFAULT_DTS_FILE', () => {
  it('应该导出默认类型定义文件名', () => {
    expect(DEFAULT_DTS_FILE).toBe('typed-router.d.ts')
  })
})
