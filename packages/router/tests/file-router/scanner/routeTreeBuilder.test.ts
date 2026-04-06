/**
 * @fileoverview 路由树构建模块测试
 *
 * 测试路由树构建功能，包括：
 * - 基本路由树构建
 * - 布局路由处理
 * - 嵌套路由处理
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ResolvedPageConfig } from '../../../src/file-router/config/index.js'
import { buildRouteTree } from '../../../src/file-router/scanner/routeTreeBuilder.js'
import { scanMultiplePages } from '../../../src/file-router/scanner/scanPages.js'
import { createTestHelpers } from '../testUtils.js'

const { createTestDir, cleanupTestDir, createFile, resolvePath } = createTestHelpers('route-tree')

const DEFAULT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

function createPageConfig(dir: string, prefix: string = ''): ResolvedPageConfig {
  return {
    dir: resolvePath(dir),
    include: [],
    exclude: [],
    prefix,
    extensions: DEFAULT_EXTENSIONS
  }
}

describe('scanner/routeTreeBuilder', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('buildRouteTree', () => {
    it('应该构建正确的路由树结构', async () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const pages = await scanMultiplePages({
        pages: [createPageConfig('src/pages')],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)

      expect(routeTree.length).toBeGreaterThan(0)
    })

    it('应该正确处理布局路由', async () => {
      createFile(
        'src/pages/users/_layout.tsx',
        'export default function UsersLayout() { return null }'
      )
      createFile('src/pages/users/index.tsx', 'export default function Users() { return null }')
      createFile('src/pages/users/profile.tsx', 'export default function Profile() { return null }')

      const pages = await scanMultiplePages({
        pages: [createPageConfig('src/pages')],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)

      const usersRoute = routeTree.find(r => r.path === '/users')
      expect(usersRoute).toBeDefined()
      expect(usersRoute?.children?.length).toBe(2)
    })

    it('应该正确处理嵌套路由', async () => {
      createFile(
        'src/pages/settings/index.tsx',
        'export default function Settings() { return null }'
      )
      createFile(
        'src/pages/settings/profile.tsx',
        'export default function Profile() { return null }'
      )
      createFile(
        'src/pages/settings/account.tsx',
        'export default function Account() { return null }'
      )

      const pages = await scanMultiplePages({
        pages: [createPageConfig('src/pages')],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)

      expect(routeTree.length).toBeGreaterThan(0)
    })

    it('应该正确排序路由', async () => {
      createFile('src/pages/users.tsx', 'export default function UsersLayout() { return null }')
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const pages = await scanMultiplePages({
        pages: [createPageConfig('src/pages')],
        namingStrategy: 'kebab'
      })

      const routeTree = buildRouteTree(pages)

      expect(routeTree[0].isIndex).toBe(true)
    })
  })
})
