/**
 * @fileoverview 路由路径计算辅助函数测试
 *
 * 测试 computeRouteFullPath 函数，包括：
 * - 已跟踪文件（fileMap 中存在）的 fullPath 计算
 * - 未跟踪文件（fileMap 中不存在）的 fullPath 推算
 * - 嵌套目录结构
 * - 动态路由参数
 * - 路径策略（kebab / lowercase / raw）
 * - 前缀配置
 * - index 文件映射
 */
import { describe, expect, it } from 'vitest'
import type { ScanNode } from '../../../src/file-router/types/index.js'
import { computeRouteFullPath } from '../../../src/file-router/utils/routePath.js'

function createScanNode(
  overrides: Partial<ScanNode> & { path: string; filePath: string }
): ScanNode {
  return {
    isGroup: false,
    ...overrides
  }
}

function createContext(overrides: {
  fileMap?: Map<string, ScanNode>
  pagesDir?: string
  prefix?: string
  pathStrategy?: 'kebab' | 'lowercase' | 'raw'
}) {
  const {
    fileMap = new Map(),
    pagesDir = '/src/pages',
    prefix = '',
    pathStrategy = 'kebab'
  } = overrides
  return {
    fileMap,
    pages: [
      {
        dir: pagesDir,
        include: ['**/*.{jsx,tsx,ts,js,vue}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/.*'],
        prefix,
        group: false
      }
    ],
    pathStrategy
  }
}

describe('utils/routePath', () => {
  describe('computeRouteFullPath', () => {
    describe('已跟踪文件（fileMap 中存在）', () => {
      it('应该计算顶层页面文件的 fullPath', () => {
        const node = createScanNode({ path: '/about', filePath: '/src/pages/about.tsx' })
        const fileMap = new Map([['/src/pages/about.tsx', node]])

        const result = computeRouteFullPath(
          '/src/pages/about.tsx',
          { basename: 'about', rawName: 'about', viewName: undefined },
          createContext({ fileMap })
        )

        expect(result).toBe('/about')
      })

      it('应该计算 index 页面的 fullPath 为根路径', () => {
        const node = createScanNode({ path: '/', filePath: '/src/pages/index.tsx' })
        const fileMap = new Map([['/src/pages/index.tsx', node]])

        const result = computeRouteFullPath(
          '/src/pages/index.tsx',
          { basename: 'index', rawName: 'index', viewName: undefined },
          createContext({ fileMap })
        )

        expect(result).toBe('/')
      })

      it('应该沿 parent 链计算嵌套路由的 fullPath', () => {
        const parentNode = createScanNode({
          path: '/users',
          filePath: '/src/pages/users',
          isGroup: true
        })
        const childNode = createScanNode({
          path: 'profile',
          filePath: '/src/pages/users/profile.tsx',
          parent: parentNode
        })
        parentNode.children = new Set([childNode])

        const fileMap = new Map([
          ['/src/pages/users', parentNode],
          ['/src/pages/users/profile.tsx', childNode]
        ])

        const result = computeRouteFullPath(
          '/src/pages/users/profile.tsx',
          { basename: 'profile', rawName: 'profile', viewName: undefined },
          createContext({ fileMap })
        )

        expect(result).toBe('/users/profile')
      })

      it('应该计算多层嵌套路由的 fullPath', () => {
        const usersNode = createScanNode({
          path: '/users',
          filePath: '/src/pages/users',
          isGroup: true
        })
        const idNode = createScanNode({
          path: '{id}',
          filePath: '/src/pages/users/[id]',
          parent: usersNode,
          isGroup: true
        })
        usersNode.children = new Set([idNode])
        const settingsNode = createScanNode({
          path: 'settings',
          filePath: '/src/pages/users/[id]/settings.tsx',
          parent: idNode
        })
        idNode.children = new Set([settingsNode])

        const fileMap = new Map([
          ['/src/pages/users', usersNode],
          ['/src/pages/users/[id]', idNode],
          ['/src/pages/users/[id]/settings.tsx', settingsNode]
        ])

        const result = computeRouteFullPath(
          '/src/pages/users/[id]/settings.tsx',
          { basename: 'settings', rawName: 'settings', viewName: undefined },
          createContext({ fileMap })
        )

        expect(result).toBe('/users/{id}/settings')
      })
    })

    describe('未跟踪文件（fileMap 中不存在）', () => {
      it('应该推算顶层页面文件的 fullPath', () => {
        const result = computeRouteFullPath(
          '/src/pages/about.tsx',
          { basename: 'about', rawName: 'about', viewName: undefined },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/about')
      })

      it('应该推算 index 页面的 fullPath 为根路径', () => {
        const result = computeRouteFullPath(
          '/src/pages/index.tsx',
          { basename: 'index', rawName: 'index', viewName: undefined },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/')
      })

      it('应该推算嵌套目录中页面文件的 fullPath', () => {
        const result = computeRouteFullPath(
          '/src/pages/users/profile.tsx',
          { basename: 'profile', rawName: 'profile', viewName: undefined },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/users/profile')
      })

      it('应该推算嵌套目录中 index 页面的 fullPath', () => {
        const result = computeRouteFullPath(
          '/src/pages/users/index.tsx',
          { basename: 'index', rawName: 'index', viewName: undefined },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/users')
      })

      it('应该沿已知父节点推算深层文件的 fullPath', () => {
        const usersNode = createScanNode({
          path: '/users',
          filePath: '/src/pages/users',
          isGroup: true
        })
        const fileMap = new Map([['/src/pages/users', usersNode]])

        const result = computeRouteFullPath(
          '/src/pages/users/profile.tsx',
          { basename: 'profile', rawName: 'profile', viewName: undefined },
          createContext({ fileMap, pagesDir: '/src/pages' })
        )

        expect(result).toBe('/users/profile')
      })

      it('应该沿已知中间节点推算深层文件的 fullPath', () => {
        const usersNode = createScanNode({
          path: '/users',
          filePath: '/src/pages/users',
          isGroup: true
        })
        const idNode = createScanNode({
          path: '{id}',
          filePath: '/src/pages/users/[id]',
          parent: usersNode,
          isGroup: true
        })
        usersNode.children = new Set([idNode])
        const fileMap = new Map([
          ['/src/pages/users', usersNode],
          ['/src/pages/users/[id]', idNode]
        ])

        const result = computeRouteFullPath(
          '/src/pages/users/[id]/settings.tsx',
          { basename: 'settings', rawName: 'settings', viewName: undefined },
          createContext({ fileMap, pagesDir: '/src/pages' })
        )

        expect(result).toBe('/users/{id}/settings')
      })

      it('文件不在任何页面目录中时应返回 null', () => {
        const result = computeRouteFullPath(
          '/src/utils/helper.ts',
          { basename: 'helper', rawName: 'helper', viewName: undefined },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBeNull()
      })
    })

    describe('前缀配置', () => {
      it('应该正确应用页面目录前缀', () => {
        const result = computeRouteFullPath(
          '/src/admin/dashboard.tsx',
          { basename: 'dashboard', rawName: 'dashboard', viewName: undefined },
          createContext({ pagesDir: '/src/admin', prefix: '/admin' })
        )

        expect(result).toBe('/admin/dashboard')
      })

      it('前缀下 index 页面应映射为前缀路径', () => {
        const result = computeRouteFullPath(
          '/src/admin/index.tsx',
          { basename: 'index', rawName: 'index', viewName: undefined },
          createContext({ pagesDir: '/src/admin', prefix: '/admin' })
        )

        expect(result).toBe('/admin')
      })

      it('无前缀时顶层文件路径不应包含多余前缀', () => {
        const result = computeRouteFullPath(
          '/src/pages/home.tsx',
          { basename: 'home', rawName: 'home', viewName: undefined },
          createContext({ pagesDir: '/src/pages', prefix: '' })
        )

        expect(result).toBe('/home')
      })
    })

    describe('动态路由参数', () => {
      it('应该将 [param] 转换为 {param}', () => {
        const result = computeRouteFullPath(
          '/src/pages/users/[id].tsx',
          { basename: '[id]', rawName: '[id]', viewName: undefined },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/users/{id}')
      })

      it('应该将 [param?] 转换为 {param?}', () => {
        const result = computeRouteFullPath(
          '/src/pages/posts/[slug?].tsx',
          { basename: '[slug?]', rawName: '[slug?]', viewName: undefined },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/posts/{slug?}')
      })

      it('应该处理多层动态参数', () => {
        const result = computeRouteFullPath(
          '/src/pages/users/[userId]/posts/[postId].tsx',
          { basename: '[postId]', rawName: '[postId]', viewName: undefined },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/users/{user-id}/posts/{post-id}')
      })
    })

    describe('路径策略', () => {
      it('kebab 策略应将驼峰转换为 kebab-case', () => {
        const result = computeRouteFullPath(
          '/src/pages/UserProfile.tsx',
          { basename: 'UserProfile', rawName: 'UserProfile', viewName: undefined },
          createContext({ pagesDir: '/src/pages', pathStrategy: 'kebab' })
        )

        expect(result).toBe('/user-profile')
      })

      it('lowercase 策略应将路径转为小写', () => {
        const result = computeRouteFullPath(
          '/src/pages/UserProfile.tsx',
          { basename: 'UserProfile', rawName: 'UserProfile', viewName: undefined },
          createContext({ pagesDir: '/src/pages', pathStrategy: 'lowercase' })
        )

        expect(result).toBe('/userprofile')
      })

      it('raw 策略应保持原始命名', () => {
        const result = computeRouteFullPath(
          '/src/pages/UserProfile.tsx',
          { basename: 'UserProfile', rawName: 'UserProfile', viewName: undefined },
          createContext({ pagesDir: '/src/pages', pathStrategy: 'raw' })
        )

        expect(result).toBe('/UserProfile')
      })

      it('kebab 策略应正确处理嵌套目录名', () => {
        const result = computeRouteFullPath(
          '/src/pages/UserManagement/RoleSettings.tsx',
          { basename: 'RoleSettings', rawName: 'RoleSettings', viewName: undefined },
          createContext({ pagesDir: '/src/pages', pathStrategy: 'kebab' })
        )

        expect(result).toBe('/user-management/role-settings')
      })
    })

    describe('命名视图', () => {
      it('应该正确处理命名视图文件的 fullPath', () => {
        const result = computeRouteFullPath(
          '/src/pages/index@sidebar.tsx',
          { basename: 'index@sidebar', rawName: 'index', viewName: 'sidebar' },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/')
      })

      it('应该正确处理非 index 命名视图文件的 fullPath', () => {
        const result = computeRouteFullPath(
          '/src/pages/about@sidebar.tsx',
          { basename: 'about@sidebar', rawName: 'about', viewName: 'sidebar' },
          createContext({ pagesDir: '/src/pages' })
        )

        expect(result).toBe('/about')
      })
    })
  })
})
