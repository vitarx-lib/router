/**
 * @fileoverview generateRoutes 模块测试
 *
 * 测试路由代码生成功能，包括：
 * - 基础代码生成
 * - 动态路由生成
 * - 嵌套路由生成
 * - 元数据生成
 */
import { describe, expect, it } from 'vitest'
import { generateRoutes } from '../../../src/vite/core/generateRoutes.js'
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
    it('应该生成正确的导入语句', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages)

      expect(code).toContain("import { lazy } from 'vitarx'")
    })

    it('应该生成默认导出', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages)

      expect(code).toContain('export default [')
      expect(code).toContain(']')
    })

    it('应该生成正确的路由名称', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages)

      expect(code).toContain('name: "home"')
    })

    it('应该生成正确的路由路径', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/', name: 'home' }),
        createMockParsedPage({ path: '/about', name: 'about', isIndex: false })
      ]

      const code = await generateRoutes(pages)

      expect(code).toContain('path: "/"')
      expect(code).toContain('path: "/about"')
    })
  })

  describe('动态路由生成', () => {
    it('应该正确生成动态路由', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/user/{id}',
          name: 'user-id',
          isIndex: false,
          isDynamic: true,
          params: ['id']
        })
      ]

      const code = await generateRoutes(pages)

      expect(code).toContain('name: "user-id"')
      expect(code).toContain('path: "/user/{id}"')
    })
  })

  describe('嵌套路由生成', () => {
    it('应该正确生成嵌套路由（分组路由无 name）', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/user',
          name: 'user',
          children: [
            createMockParsedPage({
              path: '/user/profile',
              name: 'user-profile',
              isIndex: false
            })
          ]
        })
      ]

      const code = await generateRoutes(pages)

      expect(code).not.toContain('name: "user"')
      expect(code).toContain('path: "/user"')
      expect(code).toContain('name: "user-profile"')
      expect(code).toContain('children: [')
    })

    it('应该正确处理多层嵌套（分组路由无 name）', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/admin',
          name: 'admin',
          children: [
            createMockParsedPage({
              path: '/admin/users',
              name: 'admin-users',
              isIndex: false,
              children: [
                createMockParsedPage({
                  path: '/admin/users/{id}',
                  name: 'admin-users-id',
                  isIndex: false,
                  isDynamic: true,
                  params: ['id']
                })
              ]
            })
          ]
        })
      ]

      const code = await generateRoutes(pages)

      expect(code).not.toContain('name: "admin"')
      expect(code).not.toContain('name: "admin-users"')
      expect(code).toContain('name: "admin-users-id"')
    })

    it('有 redirect 的分组路由应该有 name', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/admin',
          name: 'admin',
          redirect: '/admin/dashboard',
          children: [
            createMockParsedPage({
              path: '/admin/dashboard',
              name: 'admin-dashboard',
              isIndex: false
            })
          ]
        })
      ]

      const code = await generateRoutes(pages)

      expect(code).toContain('name: "admin"')
      expect(code).toContain('redirect: "/admin/dashboard"')
      expect(code).toContain('name: "admin-dashboard"')
    })
  })

  describe('元数据生成', () => {
    it('应该正确生成 meta 数据', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/',
          name: 'home',
          meta: { title: 'Home', requiresAuth: true }
        })
      ]

      const code = await generateRoutes(pages)

      expect(code).toContain('meta: {')
      expect(code).toContain('"title":"Home"')
      expect(code).toContain('"requiresAuth":true')
    })
  })

  describe('pattern 代码生成', () => {
    it('应该正确生成 pattern 对象', async () => {
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

      const code = await generateRoutes(pages)

      expect(code).toContain('pattern: {')
      expect(code).toContain('id: /^\\d+$/')
    })

    it('应该正确生成多个 pattern', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/post/{category}/{slug}',
          name: 'post-slug',
          isIndex: false,
          isDynamic: true,
          params: ['category', 'slug'],
          pattern: {
            category: /^[a-z]+$/,
            slug: /^[a-z0-9-]+$/
          }
        })
      ]

      const code = await generateRoutes(pages)

      expect(code).toContain('category: /^[a-z]+$/')
      expect(code).toContain('slug: /^[a-z0-9-]+$/')
    })

    it('应该正确生成带 flags 的正则表达式', async () => {
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

      const code = await generateRoutes(pages)

      expect(code).toContain('/^\\d+$/i')
    })
  })

  describe('importMode 配置', () => {
    it('lazy 模式应该生成 lazy 导入', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages, { importMode: 'lazy' })

      expect(code).toContain("import { lazy } from 'vitarx'")
      expect(code).toContain('lazy(() => import(')
    })

    it('file 模式应该生成文件路径', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages, { importMode: 'file' })

      expect(code).not.toContain("import { lazy } from 'vitarx'")
      expect(code).toContain('component: "/src/pages/index.tsx"')
    })
  })

  describe('imports 配置', () => {
    it('应该注入自定义导入语句', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages, {
        imports: ["import { something } from 'somewhere'"]
      })

      expect(code).toContain("import { something } from 'somewhere'")
    })

    it('应该注入多个导入语句', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages, {
        imports: ["import { a } from 'a'", "import { b } from 'b'"]
      })

      expect(code).toContain("import { a } from 'a'")
      expect(code).toContain("import { b } from 'b'")
    })
  })

  describe('extendRoute 钩子', () => {
    it('应该调用 extendRoute 钩子', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages, {
        extendRoute: route => {
          route.meta = { custom: true }
          return route
        }
      })

      expect(code).toContain('"custom":true')
    })

    it('extendRoute 返回 void 时应该使用原路由', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages, {
        extendRoute: () => undefined
      })

      expect(code).toContain('name: "home"')
    })

    it('extendRoute 支持异步', async () => {
      const pages: ParsedPage[] = [createMockParsedPage({ path: '/', name: 'home' })]

      const code = await generateRoutes(pages, {
        extendRoute: async route => {
          await new Promise(resolve => setTimeout(resolve, 10))
          route.meta = { async: true }
          return route
        }
      })

      expect(code).toContain('"async":true')
    })
  })

  describe('命名视图代码生成', () => {
    it('应该生成命名视图组件对象', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/',
          name: 'home',
          namedViews: {
            aux: '/src/pages/index@aux.tsx'
          }
        })
      ]

      const code = await generateRoutes(pages)

      expect(code).toContain('component: {')
      expect(code).toContain('default: lazy(() => import')
      expect(code).toContain('aux: lazy(() => import')
    })

    it('应该生成多个命名视图', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/',
          name: 'home',
          namedViews: {
            aux: '/src/pages/index@aux.tsx',
            sidebar: '/src/pages/index@sidebar.tsx'
          }
        })
      ]

      const code = await generateRoutes(pages)

      expect(code).toContain('aux: lazy(() => import')
      expect(code).toContain('sidebar: lazy(() => import')
    })

    it('file 模式应该生成命名视图文件路径对象', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/',
          name: 'home',
          namedViews: {
            aux: '/src/pages/index@aux.tsx'
          }
        })
      ]

      const code = await generateRoutes(pages, { importMode: 'file' })

      expect(code).toContain('component: {')
      expect(code).toContain('default: "/src/pages/index.tsx"')
      expect(code).toContain('aux: "/src/pages/index@aux.tsx"')
    })
  })

  describe('命名策略', () => {
    it('kebab 策略应该在 parsePageFile 阶段已转换', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/main-home', name: 'main-home', isIndex: false })
      ]

      const code = await generateRoutes(pages, { namingStrategy: 'kebab' })

      expect(code).toContain('name: "main-home"')
      expect(code).toContain('path: "/main-home"')
    })

    it('kebab 策略不应该转换动态参数变量名', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({
          path: '/user/{userName}',
          name: 'user-user-name',
          isIndex: false,
          isDynamic: true,
          params: ['userName']
        })
      ]

      const code = await generateRoutes(pages, { namingStrategy: 'kebab' })

      expect(code).toContain('name: "user-user-name"')
      expect(code).toContain('path: "/user/{userName}"')
    })

    it('lowercase 策略应该在 parsePageFile 阶段已转换', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/mainhome', name: 'mainhome', isIndex: false })
      ]

      const code = await generateRoutes(pages, { namingStrategy: 'lowercase' })

      expect(code).toContain('name: "mainhome"')
      expect(code).toContain('path: "/mainhome"')
    })

    it('none 策略应该保持原始命名', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/MainHome', name: 'MainHome', isIndex: false })
      ]

      const code = await generateRoutes(pages, { namingStrategy: 'none' })

      expect(code).toContain('name: "MainHome"')
      expect(code).toContain('path: "/MainHome"')
    })

    it('默认策略应该是 kebab', async () => {
      const pages: ParsedPage[] = [
        createMockParsedPage({ path: '/user-profile', name: 'user-profile', isIndex: false })
      ]

      const code = await generateRoutes(pages)

      expect(code).toContain('name: "user-profile"')
      expect(code).toContain('path: "/user-profile"')
    })
  })
})
