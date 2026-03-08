/**
 * @fileoverview Vite 插件测试
 *
 * 测试 Vite 插件的核心功能，包括：
 * - 插件配置
 * - 虚拟模块解析
 * - transform 钩子
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import type { Plugin, ResolvedConfig } from 'vite'

/**
 * 从 Plugin 钩子中提取可调用的函数
 *
 * Vite 的钩子可能是函数或包含 handler 的对象
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHookFunction(hook: any): ((...args: any[]) => any) | undefined {
  if (typeof hook === 'function') {
    return hook
  }
  if (hook && typeof hook === 'object' && 'handler' in hook) {
    return hook.handler
  }
  return undefined
}

describe('Vite 插件', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitarx-router-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('插件配置', () => {
    it('应该使用默认配置创建插件', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter()

      expect(plugin.name).toBe('vite-plugin-vitarx-router')
      expect(plugin.enforce).toBe('pre')
    })

    it('应该接受自定义配置', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({
        pagesDir: 'src/views',
        extensions: ['.vue'],
        dts: 'src/types/router.d.ts'
      })

      expect(plugin.name).toBe('vite-plugin-vitarx-router')
    })

    it('应该允许禁用 dts 生成', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({
        dts: false
      })

      expect(plugin.name).toBe('vite-plugin-vitarx-router')
    })

    it('应该接受字符串数组形式的 pagesDir', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({
        pagesDir: ['src/pages', 'src/admin'],
        dts: false
      })

      expect(plugin.name).toBe('vite-plugin-vitarx-router')
    })

    it('应该接受对象数组形式的 pagesDir', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({
        pagesDir: [
          { dir: 'src/pages', exclude: ['components'] },
          { dir: 'src/admin', include: ['**/*.tsx'] }
        ],
        dts: false
      })

      expect(plugin.name).toBe('vite-plugin-vitarx-router')
    })
  })

  describe('虚拟模块解析', () => {
    it('应该解析路由虚拟模块 ID', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const resolveId = getHookFunction(plugin.resolveId)
      const resolved = resolveId?.('virtual:vitarx-router:routes', '', {})

      expect(resolved).toBe('\0virtual:vitarx-router:routes')
    })

    it('应该解析类型虚拟模块 ID', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const resolveId = getHookFunction(plugin.resolveId)
      const resolved = resolveId?.('virtual:vitarx-router:types', '', {})

      expect(resolved).toBe('\0virtual:vitarx-router:types')
    })

    it('对非虚拟模块应返回 null', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      const resolveId = getHookFunction(plugin.resolveId)
      const resolved = resolveId?.('some-other-module', '', {})

      expect(resolved).toBeNull()
    })
  })

  describe('load 钩子', () => {
    it('应该为路由虚拟模块生成代码', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const load = getHookFunction(plugin.load)
      const code = load?.('\0virtual:vitarx-router:routes', {})

      expect(code).toContain("import { lazy } from 'vitarx'")
      expect(code).toContain('export default [')
    })

    it('应该为类型虚拟模块生成代码', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const load = getHookFunction(plugin.load)
      const code = load?.('\0virtual:vitarx-router:types', {})

      expect(code).toContain('export interface RouteIndexMap')
    })

    it('对非虚拟模块应返回 null', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      const load = getHookFunction(plugin.load)
      const code = load?.('/src/pages/index.tsx', {})

      expect(code).toBeNull()
    })
  })

  describe('transform 钩子', () => {
    it('应该移除 definePage 调用', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 创建测试目录
      const pagesDir = path.join(tempDir, 'src', 'pages')
      fs.mkdirSync(pagesDir, { recursive: true })

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const code = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ name: 'test' })
        export default function Page() {}
      `

      const transform = getHookFunction(plugin.transform)
      const result = transform?.(code, path.join(pagesDir, 'index.tsx'), {})

      expect(result).not.toBeNull()
      expect(result.code).not.toContain("definePage({ name: 'test' })")
    })

    it('应该移除 definePage 导入', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 创建测试目录
      const pagesDir = path.join(tempDir, 'src', 'pages')
      fs.mkdirSync(pagesDir, { recursive: true })

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const code = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ name: 'test' })
        export default function Page() {}
      `

      const transform = getHookFunction(plugin.transform)
      const result = transform?.(code, path.join(pagesDir, 'index.tsx'), {})

      expect(result).not.toBeNull()
      expect(result.code).not.toContain("import { definePage } from 'vitarx-router/auto-routes'")
    })

    it('应该保留其他导入', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 创建测试目录
      const pagesDir = path.join(tempDir, 'src', 'pages')
      fs.mkdirSync(pagesDir, { recursive: true })

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const code = `
        import { definePage, handleHotUpdate } from 'vitarx-router/auto-routes'
        definePage({ name: 'test' })
        export default function Page() {}
      `

      const transform = getHookFunction(plugin.transform)
      const result = transform?.(code, path.join(pagesDir, 'index.tsx'), {})

      expect(result).not.toBeNull()
      expect(result.code).toContain('handleHotUpdate')
    })

    it('应该处理导入别名', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 创建测试目录
      const pagesDir = path.join(tempDir, 'src', 'pages')
      fs.mkdirSync(pagesDir, { recursive: true })

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const code = `
        import { definePage as config } from 'vitarx-router/auto-routes'
        config({ name: 'test' })
        export default function Page() {}
      `

      const transform = getHookFunction(plugin.transform)
      const result = transform?.(code, path.join(pagesDir, 'index.tsx'), {})

      expect(result).not.toBeNull()
      expect(result.code).not.toContain("config({ name: 'test' })")
    })

    it('非页面文件应返回 null', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 创建测试目录
      const pagesDir = path.join(tempDir, 'src', 'pages')
      fs.mkdirSync(pagesDir, { recursive: true })

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const code = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ name: 'test' })
      `

      const transform = getHookFunction(plugin.transform)
      const result = transform?.(code, path.join(tempDir, 'src', 'components', 'Button.tsx'), {})

      expect(result).toBeNull()
    })

    it('没有 definePage 时应返回 null', async () => {
      const { default: VitarxRouter } = await import('../../src/vite/index.js')
      const plugin = VitarxRouter({ dts: false }) as Plugin

      // 创建测试目录
      const pagesDir = path.join(tempDir, 'src', 'pages')
      fs.mkdirSync(pagesDir, { recursive: true })

      // 模拟 configResolved 钩子
      const configResolved = getHookFunction(plugin.configResolved)
      configResolved?.({ root: tempDir } as ResolvedConfig)

      const code = `
        export default function Page() {}
      `

      const transform = getHookFunction(plugin.transform)
      const result = transform?.(code, path.join(pagesDir, 'index.tsx'), {})

      expect(result).toBeNull()
    })
  })
})

describe('导出', () => {
  it('应该导出 definePage', async () => {
    const module = await import('../../src/vite/index.js')

    expect(module.definePage).toBeDefined()
    expect(typeof module.definePage).toBe('function')
  })

  it('应该导出 VitePluginRouterOptions 类型', async () => {
    const module = await import('../../src/vite/index.js')

    // 类型导出在运行时不存在，但可以验证模块加载成功
    expect(module.default).toBeDefined()
  })
})
