/**
 * @fileoverview definePage 宏模块测试
 *
 * 测试 definePage 宏处理功能，包括：
 * - 解析 definePage 配置
 * - 移除 definePage 调用
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseDefinePage, removeDefinePage } from '../../../src/file-router/macros/definePage.js'
import { createTestHelpers } from '../testUtils.js'

const { createTestDir, cleanupTestDir, createFile } = createTestHelpers('define-page')

describe('macros/definePage', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('parseDefinePage', () => {
    it('应该解析 definePage 配置', () => {
      const filePath = createFile(
        'page.tsx',
        `
        definePage({
          name: 'home',
          meta: { title: 'Home' }
        })
        export default function Home() { return null }
      `
      )

      const options = parseDefinePage(filePath)

      expect(options).toBeDefined()
      expect(options?.name).toBe('home')
      expect(options?.meta).toEqual({ title: 'Home' })
    })

    it('应该解析 redirect 配置', () => {
      const filePath = createFile(
        'page.tsx',
        `
        definePage({
          redirect: '/dashboard'
        })
        export default function Page() { return null }
      `
      )

      const options = parseDefinePage(filePath)

      expect(options).toBeDefined()
      expect(options?.redirect).toBe('/dashboard')
    })

    it('应该解析 pattern 配置', () => {
      const filePath = createFile(
        'page.tsx',
        `
        definePage({
          pattern: { id: /\\d+/ }
        })
        export default function Page() { return null }
      `
      )

      const options = parseDefinePage(filePath)

      expect(options).toBeDefined()
      expect(options?.pattern).toBeDefined()
    })

    it('没有 definePage 时应该返回 null', () => {
      const filePath = createFile('page.tsx', 'export default function Home() { return null }')

      const options = parseDefinePage(filePath)

      expect(options).toBeNull()
    })

    it('文件不存在时应该返回 null', () => {
      const options = parseDefinePage('/non/existent/file.tsx')
      expect(options).toBeNull()
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
