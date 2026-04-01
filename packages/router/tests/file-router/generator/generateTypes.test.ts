/**
 * @fileoverview 类型生成模块测试
 *
 * 测试类型定义生成功能，包括：
 * - 基本类型定义生成
 * - 动态参数类型
 * - 别名路径处理
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ResolvedPageConfig } from '../../../src/file-router/config/index.js'
import { generateFullDtsFile } from '../../../src/file-router/generator/generateTypes.js'
import { buildRouteTree } from '../../../src/file-router/scanner/routeTreeBuilder.js'
import { scanMultiplePages } from '../../../src/file-router/scanner/scanPages.js'
import { createTestHelpers } from '../testUtils.js'

const { createTestDir, cleanupTestDir, createFile, resolvePath } = createTestHelpers('generate-types')

describe('generator/generateTypes', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('generateFullDtsFile', () => {
    it('应该生成正确的类型定义', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

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
      const dts = generateFullDtsFile(routeTree)

      expect(dts).toContain('declare module')
      expect(dts).toContain('RouteIndexMap')
    })

    it('应该正确处理动态参数类型', () => {
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

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
      const dts = generateFullDtsFile(routeTree)

      expect(dts).toContain('params')
      expect(dts).toContain('id')
    })

    it('应该包含正确的模块引用', () => {
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
      const dts = generateFullDtsFile(routeTree)

      expect(dts).toContain("/// <reference types=\"vitarx-router/global\" />")
    })
  })
})
