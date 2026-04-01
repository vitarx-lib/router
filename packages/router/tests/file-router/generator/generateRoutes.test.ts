/**
 * @fileoverview 路由代码生成模块测试
 *
 * 测试路由代码生成功能，包括：
 * - 基本路由代码生成
 * - lazy 导入模式
 * - file 导入模式
 * - 自定义导入语句
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ResolvedPageConfig } from '../../../src/file-router/config/index.js'
import { generateRoutes } from '../../../src/file-router/generator/generateRoutes.js'
import { buildRouteTree } from '../../../src/file-router/scanner/routeTreeBuilder.js'
import { scanMultiplePages } from '../../../src/file-router/scanner/scanPages.js'
import { createTestHelpers } from '../testUtils.js'

const { createTestDir, cleanupTestDir, createFile, resolvePath } =
  createTestHelpers('generate-routes')

describe('generator/generateRoutes', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('generateRoutes', () => {
    it('应该生成正确的路由代码', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const pages = scanMultiplePages({
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)
      const code = await generateRoutes(routeTree)

      expect(code).toBeDefined()
      expect(code).toContain('export default')
    })

    it('应该使用 lazy 导入模式', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const pages = scanMultiplePages({
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)
      const code = await generateRoutes(routeTree, { importMode: 'lazy' })

      expect(code).toContain("import { lazy } from 'vitarx'")
      expect(code).toContain('lazy(() => import(')
    })

    it('应该使用 file 导入模式', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const pages = scanMultiplePages({
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)
      const code = await generateRoutes(routeTree, { importMode: 'file' })

      expect(code).not.toContain("import { lazy } from 'vitarx'")
    })

    it('应该注入自定义导入语句', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const pages = scanMultiplePages({
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)
      const code = await generateRoutes(routeTree, {
        imports: ["import { customHelper } from './helpers'"]
      })

      expect(code).toContain("import { customHelper } from './helpers'")
    })

    it('应该调用 extendRoute 钩子', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const pageConfig: ResolvedPageConfig = {
        dir: resolvePath('src/pages'),
        include: [],
        exclude: [],
        prefix: ''
      }

      const pages = scanMultiplePages({
        pages: [pageConfig],
        extensions: ['.tsx', '.ts'],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)
      let calledWithRoute: any = null

      await generateRoutes(routeTree, {
        extendRoute: route => {
          calledWithRoute = route
          route.meta = { ...route.meta, custom: true }
          return route
        }
      })

      expect(calledWithRoute).toBeDefined()
      expect(calledWithRoute.meta?.custom).toBe(true)
    })
  })
})
