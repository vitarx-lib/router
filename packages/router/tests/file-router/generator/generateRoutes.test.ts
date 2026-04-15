/**
 * @fileoverview 路由代码生成模块测试
 *
 * 测试路由代码生成功能，包括：
 * - 基本路由代码生成
 * - lazy 导入模式
 * - sync 导入模式
 * - 自定义函数导入模式
 * - 自定义导入语句
 * - extendRoute 钩子
 * - 嵌套路由
 * - 命名视图
 * - 动态路由参数
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateRoutes } from '../../../src/file-router/generator/generateRoutes.js'
import type { ParsedNode } from '../../../src/file-router/types/index.js'
import { createTestHelpers } from '../testUtils.js'

const { createTestDir, cleanupTestDir, resolvePath } = createTestHelpers('generate-routes')

function createMockPageNode(overrides?: Partial<ParsedNode>): ParsedNode {
  return {
    filePath: resolvePath('src/pages/index.tsx'),
    path: '/',
    ...overrides
  }
}

describe('generator/generateRoutes', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('generateRoutes', () => {
    it('应该生成正确的路由代码', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: 'lazy'
      })

      expect(result.code).toBeDefined()
      expect(result.code).toContain('export default')
      expect(result.routes).toBeDefined()
    })

    it('应该使用 lazy 导入模式', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: 'lazy'
      })

      expect(result.code).toContain("import { lazy } from 'vitarx'")
      expect(result.code).toContain('lazy(() => import(')
    })

    it('应该使用 sync 导入模式', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: 'sync'
      })

      expect(result.code).not.toContain("import { lazy } from 'vitarx'")
    })

    it('应该注入自定义导入语句', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: 'lazy',
        imports: ["import { customHelper } from './helpers'"]
      })

      expect(result.code).toContain("import { customHelper } from './helpers'")
    })

    it('应该调用 extendRoute 钩子', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      let calledWithRoute: any = null
      generateRoutes(pages, {
        dts: false,
        importMode: 'lazy',
        extendRoute: route => {
          calledWithRoute = route
          route.meta = { ...route.meta, custom: true }
          return route
        }
      })
      expect(calledWithRoute).toBeDefined()
      expect(calledWithRoute.meta?.custom).toBe(true)
    })

    it('应该生成类型定义代码', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      const result = generateRoutes(pages, {
        dts: true,
        importMode: 'lazy'
      })

      expect(result.dts).toBeDefined()
      expect(result.dts).toContain('declare module')
    })

    it('应该正确处理嵌套路由', () => {
      const childPage: ParsedNode = createMockPageNode({
        filePath: resolvePath('src/pages/users/[id].tsx'),
        path: '{id}',
        components: { default: resolvePath('src/pages/users/[id].tsx') }
      })

      const parentPage: ParsedNode = createMockPageNode({
        filePath: resolvePath('src/pages/users/index.tsx'),
        path: '/users',
        components: { default: resolvePath('src/pages/users/index.tsx') },
        children: new Set([childPage])
      })

      childPage.parent = parentPage

      const result = generateRoutes([parentPage], {
        dts: false,
        importMode: 'lazy'
      })

      expect(result.code).toContain('/users')
      expect(result.code).toContain('{id}')
    })

    it('应该正确处理命名视图', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: {
            default: resolvePath('src/pages/index.tsx'),
            sidebar: resolvePath('src/pages/index@sidebar.tsx')
          }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: 'lazy'
      })

      expect(result.code).toBeDefined()
    })

    it('应该正确处理动态路由参数', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/users/[id].tsx'),
          path: '/users/{id}',
          components: { default: resolvePath('src/pages/users/[id].tsx') }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: 'lazy'
      })

      expect(result.code).toContain('/users/{id}')
    })

    it('应该支持自定义函数导入模式', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: context => {
          context.addImport(`import { lazy } from 'vitarx'`)
          return `lazy(() => import(${context.importPath}))`
        }
      })

      expect(result.code).toContain("import { lazy } from 'vitarx'")
      expect(result.code).toContain('lazy(() => import(')
    })

    it('自定义函数模式应该接收正确的上下文参数', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      let receivedContext: any = null
      generateRoutes(pages, {
        dts: false,
        importMode: context => {
          receivedContext = context
          return 'CustomComponent'
        }
      })

      expect(receivedContext).toBeDefined()
      expect(receivedContext.filePath).toBe(resolvePath('src/pages/index.tsx'))
      expect(receivedContext.importPath).toBe(JSON.stringify(resolvePath('src/pages/index.tsx')))
      expect(typeof receivedContext.addImport).toBe('function')
    })

    it('自定义函数模式应该能够添加多个导入语句', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: { default: resolvePath('src/pages/index.tsx') }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: context => {
          context.addImport(`import { lazy } from 'vitarx'`)
          context.addImport(`import { Suspense } from 'vitarx'`)
          return `lazy(() => import(${context.importPath}))`
        }
      })

      expect(result.code).toContain("import { lazy } from 'vitarx'")
      expect(result.code).toContain("import { Suspense } from 'vitarx'")
    })

    it('自定义函数模式应该正确处理命名视图', () => {
      const pages: ParsedNode[] = [
        createMockPageNode({
          filePath: resolvePath('src/pages/index.tsx'),
          path: '/',
          components: {
            default: resolvePath('src/pages/index.tsx'),
            sidebar: resolvePath('src/pages/index@sidebar.tsx')
          }
        })
      ]

      const result = generateRoutes(pages, {
        dts: false,
        importMode: context => {
          context.addImport(`import { lazy } from 'vitarx'`)
          return `lazy(() => import(${context.importPath}))`
        }
      })

      expect(result.code).toContain('"default":')
      expect(result.code).toContain('"sidebar":')
      const lazyCount = (result.code.match(/lazy\(\(\) => import\(/g) || []).length
      expect(lazyCount).toBe(2)
    })
  })
})
