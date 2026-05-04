/**
 * @fileoverview findRoute 函数测试
 *
 * 测试路由查找功能，包括：
 * - 精确匹配非分组路由
 * - 分组路由中查找子路由
 * - 多层嵌套分组路由
 * - 未找到路由返回 null
 * - 空路由列表
 */
import { describe, expect, it } from 'vitest'
import { findRoute } from '../../../src/file-router/utils/findRoute.js'
import type { RouteNode } from '../../../src/file-router/types/index.js'

function createRoute(overrides: Partial<RouteNode> & { fullPath: string }): RouteNode {
  return {
    isGroup: false,
    filePath: '',
    path: '',
    ...overrides
  }
}

describe('utils/findRoute', () => {
  describe('非分组路由', () => {
    it('应该精确匹配非分组路由', () => {
      const routes: RouteNode[] = [
        createRoute({ fullPath: '/', path: '/' }),
        createRoute({ fullPath: '/about', path: '/about' }),
        createRoute({ fullPath: '/contact', path: '/contact' })
      ]

      const result = findRoute(routes, '/about')
      expect(result).not.toBeNull()
      expect(result!.fullPath).toBe('/about')
    })

    it('应该匹配根路径', () => {
      const routes: RouteNode[] = [
        createRoute({ fullPath: '/', path: '/' })
      ]

      const result = findRoute(routes, '/')
      expect(result).not.toBeNull()
      expect(result!.fullPath).toBe('/')
    })

    it('未匹配时应返回 null', () => {
      const routes: RouteNode[] = [
        createRoute({ fullPath: '/', path: '/' }),
        createRoute({ fullPath: '/about', path: '/about' })
      ]

      expect(findRoute(routes, '/not-exist')).toBeNull()
    })
  })

  describe('分组路由', () => {
    it('应该在分组路由中匹配子路由', () => {
      const routes: RouteNode[] = [
        createRoute({
          fullPath: '/admin',
          path: '/admin',
          isGroup: true,
          children: [
            createRoute({ fullPath: '/admin/dashboard', path: 'dashboard' }),
            createRoute({ fullPath: '/admin/settings', path: 'settings' })
          ]
        })
      ]

      const result = findRoute(routes, '/admin/dashboard')
      expect(result).not.toBeNull()
      expect(result!.fullPath).toBe('/admin')
    })

    it('应该在分组路由中匹配第二个子路由', () => {
      const routes: RouteNode[] = [
        createRoute({
          fullPath: '/admin',
          path: '/admin',
          isGroup: true,
          children: [
            createRoute({ fullPath: '/admin/dashboard', path: 'dashboard' }),
            createRoute({ fullPath: '/admin/settings', path: 'settings' })
          ]
        })
      ]

      const result = findRoute(routes, '/admin/settings')
      expect(result).not.toBeNull()
      expect(result!.fullPath).toBe('/admin')
    })

    it('分组路由无 children 时不应匹配', () => {
      const routes: RouteNode[] = [
        createRoute({
          fullPath: '/admin',
          path: '/admin',
          isGroup: true
        })
      ]

      expect(findRoute(routes, '/admin/any')).toBeNull()
    })
  })

  describe('多层嵌套分组路由', () => {
    it('应该在多层嵌套分组中查找路由', () => {
      const routes: RouteNode[] = [
        createRoute({
          fullPath: '/admin',
          path: '/admin',
          isGroup: true,
          children: [
            createRoute({
              fullPath: '/admin/users',
              path: 'users',
              isGroup: true,
              children: [
                createRoute({ fullPath: '/admin/users/list', path: 'list' }),
                createRoute({ fullPath: '/admin/users/detail', path: 'detail' })
              ]
            })
          ]
        })
      ]

      const result = findRoute(routes, '/admin/users/detail')
      expect(result).not.toBeNull()
      expect(result!.fullPath).toBe('/admin/users/detail')
    })

    it('应该在多层嵌套分组中查找非叶子路由', () => {
      const routes: RouteNode[] = [
        createRoute({
          fullPath: '/admin',
          path: '/admin',
          isGroup: true,
          children: [
            createRoute({
              fullPath: '/admin/users',
              path: 'users',
              isGroup: true,
              children: [
                createRoute({ fullPath: '/admin/users/list', path: 'list' })
              ]
            })
          ]
        })
      ]

      const result = findRoute(routes, '/admin/users/list')
      expect(result).not.toBeNull()
      expect(result!.fullPath).toBe('/admin/users/list')
    })
  })

  describe('混合路由结构', () => {
    it('应该在混合结构中查找路由', () => {
      const routes: RouteNode[] = [
        createRoute({ fullPath: '/', path: '/' }),
        createRoute({ fullPath: '/about', path: '/about' }),
        createRoute({
          fullPath: '/admin',
          path: '/admin',
          isGroup: true,
          children: [
            createRoute({ fullPath: '/admin/dashboard', path: 'dashboard' })
          ]
        })
      ]

      expect(findRoute(routes, '/about')!.fullPath).toBe('/about')
      expect(findRoute(routes, '/admin/dashboard')!.fullPath).toBe('/admin')
      expect(findRoute(routes, '/not-exist')).toBeNull()
    })
  })

  describe('边界情况', () => {
    it('空路由列表应返回 null', () => {
      expect(findRoute([], '/any')).toBeNull()
    })

    it('路径不匹配时应返回 null', () => {
      const routes: RouteNode[] = [
        createRoute({ fullPath: '/about', path: '/about' })
      ]

      expect(findRoute(routes, '/about-us')).toBeNull()
    })
  })
})
