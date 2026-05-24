/**
 * @fileoverview 路由增量更新器测试
 *
 * 测试 route-updater 模块的增量操作：
 * - 添加页面（addPage）
 * - 移除页面（removePage）
 * - 更新页面（updatePage）
 * - 辅助文件移除（removeAuxiliaryFile）
 * - 文件变化处理（handleChange）
 * - Bug 修复验证
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileRouter } from '../../../src/file-router/index.js'
import { createTestHelpers } from '../testUtils.js'

const { tempDir, createTestDir, cleanupTestDir, createFile, resolvePath } =
  createTestHelpers('file-router-updater')

describe('file-router/manager/route-updater', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('动态页面管理', () => {
    it('应该正确添加页面文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      createFile('src/pages/new.tsx', 'export default function New() { return null }')
      const result = router.addPage(resolvePath('src/pages/new.tsx'))

      expect(result).toBe(true)
      expect(router.fileMap.has(resolvePath('src/pages/new.tsx'))).toBe(true)
      const paths = router.nodeTree.map(n => n.path)
      expect(paths).toContain('/new')
    })

    it('添加非页面文件应该返回 false', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      createFile('src/utils/helper.ts', 'export function helper() { return true }')
      const result = router.addPage(resolvePath('src/utils/helper.ts'))

      expect(result).toBe(false)
    })

    it('应该正确移除页面文件', () => {
      createFile('src/pages/test.tsx', 'export default function Test() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/test.tsx')
      expect(router.fileMap.has(filePath)).toBe(true)
      expect(router.nodeTree.length).toBe(1)

      const result = router.removePage(filePath)

      expect(result).toBe(true)
      expect(router.fileMap.has(filePath)).toBe(false)
      expect(router.nodeTree.length).toBe(0)
    })

    it('移除不存在的文件应该返回 false', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const result = router.removePage('/non/exist/file.tsx')

      expect(result).toBe(false)
    })

    it('应该正确更新页面文件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/index.tsx')

      createFile(
        'src/pages/index.tsx',
        `
        definePage({ name: 'home' })
        export default function Home() { return null }
      `
      )

      const result = router.updatePage(filePath)

      expect(result).toBe(true)
    })

    it('更新不存在的文件应该自动添加', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      createFile('src/pages/new.tsx', 'export default function New() { return null }')
      const filePath = resolvePath('src/pages/new.tsx')
      const result = router.updatePage(filePath)

      expect(result).toBe(true)
      expect(router.fileMap.has(filePath)).toBe(true)
      const paths = router.nodeTree.map(n => n.path)
      expect(paths).toContain('/new')
    })

    it('添加页面到子目录应添加到父级 children', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/user/list.tsx', 'export default function UserList() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const userDir = router.nodeTree.find(n => n.path === '/user')
      expect(userDir).toBeDefined()

      createFile('src/pages/user/profile.tsx', 'export default function Profile() { return null }')
      const result = router.addPage(resolvePath('src/pages/user/profile.tsx'))

      expect(result).toBe(true)
      expect(router.fileMap.has(resolvePath('src/pages/user/profile.tsx'))).toBe(true)
      expect(userDir!.children?.size).toBeGreaterThan(1)
    })

    it('移除子目录页面应从父级 children 中移除', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/user/profile.tsx', 'export default function Profile() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const profilePath = resolvePath('src/pages/user/profile.tsx')
      const userDir = router.nodeTree.find(n => n.path === '/user')
      expect(userDir).toBeDefined()
      expect(userDir!.children?.size).toBe(1)

      const result = router.removePage(profilePath)

      expect(result).toBe(true)
      expect(router.fileMap.has(profilePath)).toBe(false)
      expect(userDir!.children?.size).toBe(0)
    })
  })

  describe('文件变化处理', () => {
    it('应该正确处理文件添加事件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      createFile('src/pages/new.tsx', 'export default function New() { return null }')
      const filePath = resolvePath('src/pages/new.tsx')
      const result = router.handleChange('add', filePath)

      expect(result).toBe(false)
    })

    it('应该正确处理文件变更事件', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/index.tsx')

      createFile(
        'src/pages/index.tsx',
        `
        definePage({ name: 'home-updated' })
        export default function Home() { return null }
      `
      )

      const result = router.handleChange('change', filePath)

      expect(result).toBe(true)
    })

    it('应该正确处理文件删除事件', () => {
      createFile('src/pages/test.tsx', 'export default function Test() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/test.tsx')
      const result = router.handleChange('unlink', filePath)

      expect(result).toBe(true)
      expect(router.fileMap.has(filePath)).toBe(false)
    })

    it('应该正确处理目录删除事件', () => {
      createFile('src/pages/users/index.tsx', 'export default function Users() { return null }')
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')

      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      expect(router.fileMap.size).toBe(3)

      const dirPath = resolvePath('src/pages/users')
      const result = router.handleChange('unlinkDir', dirPath)

      expect(result).toBe(true)
    })
  })

  describe('Bug 修复验证: updatePage 移除后未 return', () => {
    it('文件失去默认导出后，updatePage 应正确移除路由并返回 true', () => {
      createFile('src/pages/test.tsx', 'export default function Test() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/test.tsx')
      expect(router.fileMap.has(filePath)).toBe(true)
      expect(router.nodeTree).toHaveLength(1)

      createFile('src/pages/test.tsx', 'export function Test() { return null }')
      const result = router.updatePage(filePath)

      expect(result).toBe(true)
      expect(router.fileMap.has(filePath)).toBe(false)
      expect(router.nodeTree).toHaveLength(0)
    })

    it('definePage 选项未变但失去默认导出时，updatePage 应返回 true（路由被移除）', () => {
      createFile(
        'src/pages/test.tsx',
        `definePage({ name: 'test', meta: { title: 'Test' } })
export default function Test() { return null }`
      )
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/test.tsx')
      expect(router.fileMap.has(filePath)).toBe(true)

      createFile(
        'src/pages/test.tsx',
        `definePage({ name: 'test', meta: { title: 'Test' } })
export function Test() { return null }`
      )
      const result = router.updatePage(filePath)

      expect(result).toBe(true)
      expect(router.fileMap.has(filePath)).toBe(false)
      expect(router.nodeTree).toHaveLength(0)
    })

    it('文件有重定向配置但无默认导出时，updatePage 不应移除路由', () => {
      createFile(
        'src/pages/test.tsx',
        `definePage({ redirect: '/home' })
export default function Test() { return null }`
      )
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/test.tsx')
      expect(router.fileMap.has(filePath)).toBe(true)

      createFile(
        'src/pages/test.tsx',
        `definePage({ redirect: '/home' })
export function Test() { return null }`
      )
      const result = router.updatePage(filePath)

      expect(router.fileMap.has(filePath)).toBe(true)
      expect(router.nodeTree).toHaveLength(1)
    })

    it('失去默认导出后 handleChange 应正确清除生成缓存', () => {
      createFile(
        'src/pages/test.tsx',
        `definePage({ name: 'test' })
export default function Test() { return null }`
      )
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/test.tsx')
      router.generate()

      createFile(
        'src/pages/test.tsx',
        `definePage({ name: 'test' })
export function Test() { return null }`
      )
      const result = router.handleChange('change', filePath)

      expect(result).toBe(true)
    })
  })

  describe('Bug 修复验证: removePage 对布局/配置文件的处理', () => {
    it('删除子目录布局文件不应移除整个父路由及其子页面', () => {
      createFile(
        'src/pages/user/_layout.tsx',
        'export default function Layout({ children }) { return children }'
      )
      createFile('src/pages/user/index.tsx', 'export default function UserHome() { return null }')
      createFile('src/pages/user/profile.tsx', 'export default function Profile() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const layoutPath = resolvePath('src/pages/user/_layout.tsx')
      const userDirPath = resolvePath('src/pages/user')
      const indexPath = resolvePath('src/pages/user/index.tsx')
      const profilePath = resolvePath('src/pages/user/profile.tsx')

      expect(router.fileMap.has(layoutPath)).toBe(true)
      expect(router.fileMap.has(userDirPath)).toBe(true)
      expect(router.fileMap.has(indexPath)).toBe(true)
      expect(router.fileMap.has(profilePath)).toBe(true)

      const result = router.removePage(layoutPath)

      expect(result).toBe(true)
      expect(router.fileMap.has(layoutPath)).toBe(false)
      expect(router.fileMap.has(userDirPath)).toBe(true)
      expect(router.fileMap.has(indexPath)).toBe(true)
      expect(router.fileMap.has(profilePath)).toBe(true)
    })

    it('删除子目录配置文件不应移除整个父路由及其子页面', () => {
      createFile(
        'src/pages/user/_config.ts',
        `definePage({ meta: { requiresAuth: true } })`
      )
      createFile('src/pages/user/index.tsx', 'export default function UserHome() { return null }')
      createFile('src/pages/user/profile.tsx', 'export default function Profile() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const configPath = resolvePath('src/pages/user/_config.ts')
      const userDirPath = resolvePath('src/pages/user')
      const indexPath = resolvePath('src/pages/user/index.tsx')
      const profilePath = resolvePath('src/pages/user/profile.tsx')

      expect(router.fileMap.has(configPath)).toBe(true)
      expect(router.fileMap.has(userDirPath)).toBe(true)
      expect(router.fileMap.has(indexPath)).toBe(true)
      expect(router.fileMap.has(profilePath)).toBe(true)

      const result = router.removePage(configPath)

      expect(result).toBe(true)
      expect(router.fileMap.has(configPath)).toBe(false)
      expect(router.fileMap.has(userDirPath)).toBe(true)
      expect(router.fileMap.has(indexPath)).toBe(true)
      expect(router.fileMap.has(profilePath)).toBe(true)
    })

    it('删除布局文件后父路由的 components 应移除该布局', () => {
      createFile(
        'src/pages/user/_layout.tsx',
        'export default function Layout({ children }) { return children }'
      )
      createFile('src/pages/user/index.tsx', 'export default function UserHome() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const layoutPath = resolvePath('src/pages/user/_layout.tsx')
      const userDirPath = resolvePath('src/pages/user')

      const userRoute = router.fileMap.get(userDirPath)
      expect(userRoute?.components).toBeDefined()
      expect(userRoute?.components?.default).toBe(layoutPath)

      router.removePage(layoutPath)

      const updatedRoute = router.fileMap.get(userDirPath)
      expect(updatedRoute?.components?.default).toBeUndefined()
    })

    it('通过 handleChange 删除布局文件应正确处理', () => {
      createFile(
        'src/pages/user/_layout.tsx',
        'export default function Layout({ children }) { return children }'
      )
      createFile('src/pages/user/index.tsx', 'export default function UserHome() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const layoutPath = resolvePath('src/pages/user/_layout.tsx')
      const indexPath = resolvePath('src/pages/user/index.tsx')

      const result = router.handleChange('unlink', layoutPath)

      expect(result).toBe(true)
      expect(router.fileMap.has(layoutPath)).toBe(false)
      expect(router.fileMap.has(indexPath)).toBe(true)
    })
  })

  describe('Bug 修复验证: removePage 叶子节点 fileMap 残留', () => {
    it('移除叶子页面节点后，fileMap 中不应残留该文件映射', () => {
      createFile('src/pages/test.tsx', 'export default function Test() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const filePath = resolvePath('src/pages/test.tsx')
      expect(router.fileMap.has(filePath)).toBe(true)

      const result = router.removePage(filePath)

      expect(result).toBe(true)
      expect(router.fileMap.has(filePath)).toBe(false)
    })

    it('移除嵌套的叶子页面节点后，fileMap 中不应残留', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/user/profile.tsx', 'export default function Profile() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const profilePath = resolvePath('src/pages/user/profile.tsx')
      expect(router.fileMap.has(profilePath)).toBe(true)

      const result = router.removePage(profilePath)

      expect(result).toBe(true)
      expect(router.fileMap.has(profilePath)).toBe(false)
    })

    it('移除带命名视图的页面后，所有视图文件映射应从 fileMap 中清除', () => {
      createFile('src/pages/index.tsx', 'export default function Home() { return null }')
      createFile('src/pages/index@sidebar.tsx', 'export default function Sidebar() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const indexPath = resolvePath('src/pages/index.tsx')
      const sidebarPath = resolvePath('src/pages/index@sidebar.tsx')

      expect(router.fileMap.has(indexPath)).toBe(true)
      expect(router.fileMap.has(sidebarPath)).toBe(true)

      router.removePage(indexPath)

      expect(router.fileMap.has(indexPath)).toBe(false)
      expect(router.fileMap.has(sidebarPath)).toBe(false)
    })

    it('移除分组目录后，所有子节点的 fileMap 映射应全部清除', () => {
      createFile('src/pages/users/index.tsx', 'export default function Users() { return null }')
      createFile('src/pages/users/[id].tsx', 'export default function UserDetail() { return null }')
      const router = new FileRouter({
        root: tempDir,
        pages: 'src/pages'
      })

      const usersDirPath = resolvePath('src/pages/users')
      const usersIndexPath = resolvePath('src/pages/users/index.tsx')
      const usersIdPath = resolvePath('src/pages/users/[id].tsx')

      expect(router.fileMap.has(usersDirPath)).toBe(true)
      expect(router.fileMap.has(usersIndexPath)).toBe(true)
      expect(router.fileMap.has(usersIdPath)).toBe(true)

      router.removePage(usersDirPath)

      expect(router.fileMap.has(usersDirPath)).toBe(false)
      expect(router.fileMap.has(usersIndexPath)).toBe(false)
      expect(router.fileMap.has(usersIdPath)).toBe(false)
    })
  })
})
