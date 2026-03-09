/**
 * @fileoverview generateRoutes 模块测试
 *
 * 测试路由代码生成功能，包括：
 * - 路由配置代码生成
 * - 嵌套路由生成
 * - 动态路由生成
 * - meta 信息生成
 */
import { describe, expect, it } from 'vitest'
import { generateRoutes, generateRoutesJSON } from '../../../src/vite/core/generateRoutes.js'
import type { ParsedPage } from '../../../src/vite/core/types.js'

function createMockParsedPage(overrides: Partial<ParsedPage> = {}): ParsedPage {
  return {
    path: '/',
    filePath: '/src/pages/index.tsx',
    name: 'home',
    params: [],
    isIndex: true,
    isDynamic: false,
    children: [],
    parentPath: '',
    ...overrides
  }
}

describe('generateRoutes', () => {
  describe('代码生成', () => {
    it('应该生成正确的导入语句', () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = generateRoutes(pages)

      expect(code).toContain("import { lazy } from 'vitarx'")
    })

    it('应该生成默认导出', () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = generateRoutes(pages)

      expect(code).toContain('export default [')
      expect(code).toContain(']')
    })

    it('应该生成正确的路由名称', () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = generateRoutes(pages)

      expect(code).toContain("name: 'home'")
    })

    it('应该生成正确的路由路径', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/', name: 'home' }),
        createMockParsedPage({ path: '/about', name: 'about', isIndex: false })
      ]

      const code = generateRoutes(pages)

      expect(code).toContain("path: '/'")
      expect(code).toContain("path: '/about'")
    })
  })

  describe('动态路由生成', () => {
    it('应该正确生成动态路由', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/user/{id}',
          name: 'user-id',
          isIndex: false,
          isDynamic: true,
          params: ['id'],
          filePath: '/src/pages/user/[id].tsx'
        })
      ]

      const code = generateRoutes(pages)

      expect(code).toContain("path: '/user/{id}'")
      expect(code).toContain("name: 'user-id'")
    })

    it('应该正确生成多个动态参数的路由', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/post/{category}/{slug}',
          name: 'post-category-slug',
          isIndex: false,
          isDynamic: true,
          params: ['category', 'slug'],
          filePath: '/src/pages/post/[category]/[slug].tsx'
        })
      ]

      const code = generateRoutes(pages)

      expect(code).toContain("path: '/post/{category}/{slug}'")
    })
  })

  describe('meta 信息生成', () => {
    it('应该正确生成 meta 信息', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/user/{id}',
          name: 'user-id',
          isIndex: false,
          meta: { title: 'User Detail', requiresAuth: true }
        })
      ]

      const code = generateRoutes(pages)

      expect(code).toContain('meta: {"title":"User Detail","requiresAuth":true}')
    })

    it('没有 meta 时不应该生成 meta 属性', () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = generateRoutes(pages)

      expect(code).not.toContain('meta:')
    })
  })

  describe('嵌套路由生成', () => {
    it('应该正确生成嵌套路由', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/user',
          name: 'user',
          children: [
            createMockParsedPage({
              path: '/user/{id}',
              name: 'user-id',
              isIndex: false,
              isDynamic: true,
              params: ['id']
            })
          ]
        })
      ]

      const code = generateRoutes(pages)
      expect(code).toContain("path: '/user'")
      expect(code).toContain("path: '/user/{id}'")
      expect(code).toContain('children:')
    })
  })

  describe('组件路径生成', () => {
    it('应该使用 lazy 包装组件导入', () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/',
          name: 'home',
          filePath: '/src/pages/index.tsx'
        })
      ]

      const code = generateRoutes(pages)

      expect(code).toContain('lazy(() => import(')
      expect(code).toContain('/src/pages/index.tsx')
    })
  })
})

describe('generateRoutesJSON', () => {
  it('应该返回正确的路由数组', () => {
    const pages: ParsedPage[] = [
      createMockParsedPage({ path: '/', name: 'home' }),
      createMockParsedPage({ path: '/about', name: 'about', isIndex: false })
    ]

    const routes = generateRoutesJSON(pages)

    expect(routes.length).toBe(2)
    expect(routes[0].name).toBe('home')
    expect(routes[0].path).toBe('/')
    expect(routes[1].name).toBe('about')
    expect(routes[1].path).toBe('/about')
  })

  it('应该正确处理 meta 信息', () => {
    const pages: ParsedPage[] = [
      createMockParsedPage({
        path: '/',
        name: 'home',
        meta: { title: 'Home' }
      })
    ]

    const routes = generateRoutesJSON(pages)

    expect(routes[0].meta).toEqual({ title: 'Home' })
  })

  it('应该正确处理嵌套路由', () => {
    const pages: ParsedPage[] = [
      createMockParsedPage({
        path: '/user',
        name: 'user',
        children: [
          createMockParsedPage({
            path: '/user/{id}',
            name: 'user-id',
            isIndex: false,
            isDynamic: true,
            params: ['id']
          })
        ]
      })
    ]

    const routes = generateRoutesJSON(pages)

    expect(routes[0].children).toBeDefined()
    expect(routes[0].children!.length).toBe(1)
    expect(routes[0].children![0].name).toBe('user-id')
  })

  it('应该正确处理 pattern 信息', () => {
    const pages: ParsedPage[] = [
      createMockParsedPage({
        path: '/user/{id}',
        name: 'user-id',
        isIndex: false,
        isDynamic: true,
        params: ['id'],
        pattern: {
          id: /^\d+$/
        }
      })
    ]

    const routes = generateRoutesJSON(pages)

    expect(routes[0].pattern).toBeDefined()
    expect(routes[0].pattern!.id).toBeInstanceOf(RegExp)
    expect(routes[0].pattern!.id.source).toBe('^\\d+$')
  })
})

describe('pattern 代码生成', () => {
  it('应该正确生成正则表达式代码', () => {
    const pages: ParsedPage[] = [
      createMockParsedPage({
        path: '/user/{id}',
        name: 'user-id',
        isIndex: false,
        isDynamic: true,
        params: ['id'],
        pattern: {
          id: /^\d+$/
        }
      })
    ]

    const code = generateRoutes(pages)

    expect(code).toContain('pattern:')
    expect(code).toContain('/^\\d+$/')
  })

  it('应该正确生成多个 pattern', () => {
    const pages: ParsedPage[] = [
      createMockParsedPage({
        path: '/post/{category}/{slug}',
        name: 'post-category-slug',
        isIndex: false,
        isDynamic: true,
        params: ['category', 'slug'],
        pattern: {
          category: /^[a-z]+$/,
          slug: /^[a-z0-9-]+$/
        }
      })
    ]

    const code = generateRoutes(pages)

    expect(code).toContain('category: /^[a-z]+$/')
    expect(code).toContain('slug: /^[a-z0-9-]+$/')
  })

  it('应该正确生成带 flags 的正则表达式', () => {
    const pages: ParsedPage[] = [
      createMockParsedPage({
        path: '/user/{id}',
        name: 'user-id',
        isIndex: false,
        isDynamic: true,
        params: ['id'],
        pattern: {
          id: /^\d+$/i
        }
      })
    ]

    const code = generateRoutes(pages)

    expect(code).toContain('/^\\d+$/i')
  })

  it('没有 pattern 时不应该生成 pattern 属性', () => {
    const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

    const code = generateRoutes(pages)

    expect(code).not.toContain('pattern:')
  })
})
