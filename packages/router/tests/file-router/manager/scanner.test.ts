/**
 * @fileoverview 路由扫描器测试
 *
 * 测试 scanner 模块的目录扫描逻辑：
 * - 页面扫描（scanPages）
 * - 分组路由
 * - 嵌套目录
 * - 布局/配置文件处理
 * - groupParser 配置
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileRouter } from '../../../src/file-router/index.js'
import { createTestHelpers } from '../testUtils.js'

const { tempDir, createTestDir, cleanupTestDir, createFile, resolvePath } =
  createTestHelpers('file-router-scanner')

describe('file-router/manager/scanner', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('页面扫描', () => {
    it('应该扫描单个页面文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return <div>Home</div> }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.nodeTree).toHaveLength(1)
      expect(router.nodeTree[0].path).toBe('/')
      expect(router.nodeTree[0].filePath).toContain('index.tsx')
    })

    it('pages/test.jsx 应生成路径 /test', () => {
      createFile('src/pages/test.jsx', 'export default function Test() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })
      expect(router.nodeTree).toHaveLength(1)
      expect(router.nodeTree[0].path).toBe('/test')
      expect(router.nodeTree[0].filePath).toContain('test.jsx')
    })

    it('应该正确处理动态路由参数', () => {
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.nodeTree).toHaveLength(1)
      expect(router.fileMap.size).toBe(2)
    })

    it('应该扫描嵌套目录结构', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about/index.tsx', 'export default function About() { return null }')
      createFile('src/pages/users/profile.tsx', 'export default function Profile() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.fileMap.size).toBe(5)
    })
  })

  describe('路由树构建', () => {
    it('应该构建正确的路由树结构', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/about.tsx', 'export default function About() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.nodeTree).toHaveLength(2)
      expect(router.nodeTree.find(n => n.path === '/')).toBeDefined()
      expect(router.nodeTree.find(n => n.path === '/about')).toBeDefined()
    })

    it('应该正确构建父子关系', () => {
      createFile('src/pages/users/index.tsx', 'export default function Users() { return null }')
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const usersRoute = router.nodeTree.find(r => r.path === '/users')
      expect(usersRoute).toBeDefined()
      expect(usersRoute?.children).toBeDefined()
      expect(usersRoute?.children?.size).toBe(2)
    })
  })

  describe('命名视图支持', () => {
    it('应该正确处理命名视图文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/index@sidebar.tsx', 'export default function Sidebar() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const indexNode = router.nodeTree.find(n => n.path === '/')
      expect(indexNode).toBeDefined()
      expect(indexNode?.components).toBeDefined()
      expect(Object.keys(indexNode?.components || {})).toContain('default')
      expect(Object.keys(indexNode?.components || {})).toContain('sidebar')
    })
  })

  describe('布局文件处理', () => {
    it('应该正确处理布局文件', () => {
      createFile(
        'src/pages/_layout.tsx',
        'export default function Layout({ children }) { return children }'
      )
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.nodeTree).toHaveLength(1)
    })
  })

  describe('配置文件处理', () => {
    it('应该正确处理目录配置文件', () => {
      createFile(
        'src/pages/index.tsx',
        `
        definePage({
          meta: { layout: 'admin' }
        })
        export default function Home() { return null }
      `
      )

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.nodeTree).toHaveLength(1)
    })
  })

  describe('分组路由', () => {
    it('应该正确处理分组路由配置', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: [
          { dir: 'src/pages', prefix: '/' },
          { dir: 'src/admin', prefix: '/admin', group: true }
        ]
      })

      expect(router.nodeTree.length).toBeGreaterThanOrEqual(2)

      const adminGroup = router.nodeTree.find(
        r => r.path === '/admin' || r.path.startsWith('/admin')
      )
      expect(adminGroup).toBeDefined()
    })

    it('分组路由的子路由路径不应包含父路由前缀', () => {
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')
      createFile('src/admin/users/profile.tsx', 'export default function Profile() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: [{ dir: 'src/admin', prefix: '/admin', group: true }]
      })

      const adminGroup = router.nodeTree.find(r => r.path === '/admin')
      expect(adminGroup).toBeDefined()
      expect(adminGroup?.children).toBeDefined()
      expect(adminGroup?.children?.size).toBeGreaterThan(0)

      if (adminGroup?.children) {
        for (const child of adminGroup.children) {
          expect(child.path).not.toMatch(/^\/admin\//)
        }
      }

      const dashboardRoute = Array.from(adminGroup?.children || []).find(r =>
        r.filePath.includes('dashboard')
      )
      expect(dashboardRoute).toBeDefined()
      expect(dashboardRoute?.path).toBe('dashboard')
    })

    it('分组路由中的嵌套目录路径应正确', () => {
      createFile('src/admin/users/index.tsx', 'export default function Users() { return null }')
      createFile('src/admin/users/[id].tsx', 'export default function UserDetail() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: [{ dir: 'src/admin', prefix: '/admin', group: true }]
      })

      const adminGroup = router.nodeTree.find(r => r.path === '/admin')
      expect(adminGroup).toBeDefined()

      const usersRoute = Array.from(adminGroup?.children || []).find(r => r.path === 'users')
      expect(usersRoute).toBeDefined()
      expect(usersRoute?.path).toBe('users')
      expect(usersRoute?.children?.size).toBe(2)

      if (usersRoute?.children) {
        for (const child of usersRoute.children) {
          expect(child.path).not.toMatch(/^\/admin\//)
        }
      }
    })

    it('分组路由生成的代码中子路由路径应正确', () => {
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: [{ dir: 'src/admin', prefix: '/admin', group: true }]
      })

      const result = router.generate()

      expect(result.code).toContain('path: "/admin"')
      expect(result.code).toContain('path: "dashboard"')
      expect(result.code).not.toContain('path: "admin/dashboard"')
      expect(result.code).not.toContain('path: "/admin/dashboard"')
    })

    it('prefix 以斜杠结尾时应自动移除尾部斜杠', () => {
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      expect(
        () =>
          new FileRouter({
            root: tempDir,
            pages: [{ dir: 'src/admin', prefix: '/admin/', group: true }]
          })
      ).toThrow("options.pages[0].prefix 当 group 为 true 时不能以 '/' 结尾，请使用 '/admin'")
    })

    it('group 为 false 时 prefix 可以以斜杠结尾', () => {
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: [{ dir: 'src/admin', prefix: '/admin/', group: false }]
      })

      expect(router.nodeTree.length).toBeGreaterThan(0)
    })

    it('prefix 不以斜杠开头时应自动添加前导斜杠', () => {
      createFile('src/admin/dashboard.tsx', 'export default function Dashboard() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: [{ dir: 'src/admin', prefix: 'admin', group: true }]
      })

      const adminGroup = router.nodeTree.find(r => r.path === '/admin')
      expect(adminGroup).toBeDefined()
      expect(adminGroup?.path).toBe('/admin')
    })
  })

  describe('groupParser 配置', () => {
    it('应该通过 groupParser 自定义目录路径（返回字符串）', () => {
      createFile('src/pages/1.home/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        groupParser(dirName) {
          return dirName.replace(/^\d+\./, '')
        }
      })

      const homeRoute = router.nodeTree.find(r => r.path === '/home')
      expect(homeRoute).toBeDefined()
      expect(homeRoute?.isGroup).toBe(true)
    })

    it('应该通过 groupParser 自定义目录路径和选项（返回对象）', () => {
      createFile('src/pages/1.home/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        groupParser(dirName) {
          const match = dirName.match(/^(\d+)\.(.+)$/)
          if (match) {
            return {
              path: match[2],
              options: {
                meta: { order: Number(match[1]) }
              }
            }
          }
          return dirName
        }
      })

      const homeRoute = router.nodeTree.find(r => r.path === '/home')
      expect(homeRoute).toBeDefined()
      expect(homeRoute?.options).toBeDefined()
      expect(homeRoute?.options?.meta).toEqual({ order: 1 })
    })

    it('groupParser 返回字符串时应正确应用 pathStrategy', () => {
      createFile('src/pages/MyGroup/index.tsx', 'export default function Page() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        pathStrategy: 'kebab',
        groupParser(dirName) {
          return dirName
        }
      })

      const route = router.nodeTree.find(r => r.path === '/my-group')
      expect(route).toBeDefined()
    })

    it('groupParser 返回对象时 options 为 undefined 不应设置 route.options', () => {
      createFile('src/pages/mygroup/index.tsx', 'export default function Page() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        groupParser(dirName) {
          return { path: dirName }
        }
      })

      const route = router.nodeTree.find(r => r.path === '/mygroup')
      expect(route).toBeDefined()
      expect(route?.options).toBeUndefined()
    })

    it('未配置 groupParser 时应使用原始目录名作为路径', () => {
      createFile('src/pages/mygroup/index.tsx', 'export default function Page() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const route = router.nodeTree.find(r => r.path === '/mygroup')
      expect(route).toBeDefined()
    })

    it('groupParser 应正确处理嵌套目录', () => {
      createFile('src/pages/1.home/index.tsx', 'export default function Home() { return null }')
      createFile(
        'src/pages/1.home/2.about/index.tsx',
        'export default function About() { return null }'
      )

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        groupParser(dirName) {
          const match = dirName.match(/^(\d+)\.(.+)$/)
          if (match) {
            return {
              path: match[2],
              options: { meta: { order: Number(match[1]) } }
            }
          }
          return dirName
        }
      })

      const homeRoute = router.nodeTree.find(r => r.path === '/home')
      expect(homeRoute).toBeDefined()
      expect(homeRoute?.options?.meta).toEqual({ order: 1 })

      const aboutRoute = Array.from(homeRoute?.children || []).find(r => r.path === 'about')
      expect(aboutRoute).toBeDefined()
      expect(aboutRoute?.options?.meta).toEqual({ order: 2 })
    })

    it('groupParser 与分组路由配置组合使用时应正确处理 prefix', () => {
      createFile(
        'src/admin/1.dashboard/index.tsx',
        'export default function Dashboard() { return null }'
      )

      const router = new FileRouter({
        root: tempDir,
        pages: [{ dir: 'src/admin', prefix: '/admin', group: true }],
        groupParser(dirName) {
          return dirName.replace(/^\d+\./, '')
        }
      })

      const adminGroup = router.nodeTree.find(r => r.path === '/admin')
      expect(adminGroup).toBeDefined()

      const dashboardRoute = Array.from(adminGroup?.children || []).find(
        r => r.path === 'dashboard'
      )
      expect(dashboardRoute).toBeDefined()
    })

    it('groupParser 生成的路由代码应包含正确的路径和选项', () => {
      createFile('src/pages/1.home/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        groupParser(dirName) {
          const match = dirName.match(/^(\d+)\.(.+)$/)
          if (match) {
            return {
              path: match[2],
              options: { meta: { order: Number(match[1]) } }
            }
          }
          return dirName
        }
      })

      const result = router.generate()

      expect(result.code).toContain('path: "/home"')
      expect(result.code).toContain('"order":1')
    })

    it('空目录经 groupParser 解析后无子路由应返回 null', () => {
      createFile('src/pages/1.empty/.gitkeep', '')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages',
        groupParser(dirName) {
          return dirName.replace(/^\d+\./, '')
        }
      })

      const emptyRoute = router.nodeTree.find(r => r.path === '/empty')
      expect(emptyRoute).toBeUndefined()
    })
  })
})
