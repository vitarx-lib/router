/**
 * @fileoverview definePage 宏模块测试
 *
 * 测试 definePage 宏处理功能，包括：
 * - 解析 definePage 配置
 * - 移除 definePage 调用
 */
import { describe, expect, it } from 'vitest'
import { parseDefinePage, removeDefinePage } from '../../../src/file-router/macros/definePage.js'

describe('macros/definePage', () => {
  describe('parseDefinePage', () => {
    it('应该解析 definePage 配置', () => {
      const content = `
        definePage({
          name: 'home',
          meta: { title: 'Home' }
        })
        export default function Home() { return null }
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options).toBeDefined()
      expect(options?.name).toBe('home')
      expect(options?.meta).toEqual({ title: 'Home' })
    })

    it('应该解析 redirect 配置', () => {
      const content = `
        definePage({
          redirect: '/dashboard'
        })
        export default function Page() { return null }
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options).toBeDefined()
      expect(options?.redirect).toBe('/dashboard')
    })

    it('应该解析 pattern 配置', () => {
      const content = `
        definePage({
          pattern: { id: /\\d+/ }
        })
        export default function Page() { return null }
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options).toBeDefined()
      expect(options?.pattern).toBeDefined()
    })

    it('没有 definePage 时应该返回 null', () => {
      const content = 'export default function Home() { return null }'

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options).toBeNull()
    })

    it('应该解析 alias 配置', () => {
      const content = `
        definePage({
          alias: ['/home', '/index']
        })
        export default function Page() { return null }
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options).toBeDefined()
      expect(options?.alias).toEqual(['/home', '/index'])
    })

    it('应该解析完整的 definePage 配置', () => {
      const content = `
        definePage({
          name: 'user-detail',
          meta: { requiresAuth: true },
          redirect: '/login',
          alias: '/user'
        })
        export default function Page() { return null }
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options).toBeDefined()
      expect(options?.name).toBe('user-detail')
      expect(options?.meta).toEqual({ requiresAuth: true })
      expect(options?.redirect).toBe('/login')
      expect(options?.alias).toBe('/user')
    })

    it('应该解析 meta 配置', () => {
      const content = `
definePage({
  meta:{ "title": "test" }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options).toBeDefined()
      expect(options?.meta).toEqual({ title: 'test' })
    })
  })

  describe('removeDefinePage', () => {
    it('应该移除 definePage 调用', () => {
      const code = `
        definePage({
          name: 'home',
          meta: { title: 'Home' }
        })
        export default function Home() { return null }
      `

      const result = removeDefinePage(code, 'test.tsx')

      expect(result).toBeDefined()
      expect(result?.code).not.toContain('definePage')
      expect(result?.code).toContain('export default function Home')
    })

    it('没有 definePage 时应该返回 null', () => {
      const code = 'export default function Home() { return null }'

      const result = removeDefinePage(code, 'test.tsx')

      expect(result).toBeNull()
    })

    it('应该正确处理多个 definePage 调用', () => {
      const code = `
        definePage({ name: 'home' })
        definePage({ meta: { title: 'Home' } })
        export default function Home() { return null }
      `

      const result = removeDefinePage(code, 'test.tsx')

      expect(result).toBeDefined()
      expect(result?.code).not.toContain('definePage')
    })
  })
})
