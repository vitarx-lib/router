/**
 * @fileoverview definePage 宏模块测试
 *
 * 测试 definePage 宏处理功能，包括：
 * - 解析 definePage 配置
 * - 移除 definePage 调用
 */
import { describe, expect, it, vi } from 'vitest'
import {
  mergePageOptions,
  parseDefinePage,
  removeDefinePage
} from '../../../src/file-router/macros/definePage.js'

describe('macros/definePage', () => {
  describe('mergePageOptions', () => {
    it('应该合并多个页面配置', () => {
      const result = mergePageOptions(
        { name: 'home', meta: { title: 'Home' } },
        { meta: { auth: true } }
      )
      expect(result.name).toBe('home')
      expect(result.meta).toEqual({ title: 'Home', auth: true })
    })

    it('应该跳过 falsy 值', () => {
      const result = mergePageOptions(
        null as any,
        undefined as any,
        false as any,
        0 as any,
        '' as any,
        { name: 'home' }
      )
      expect(result.name).toBe('home')
    })

    it('应该正确合并 alias 配置', () => {
      const result = mergePageOptions({ alias: '/home' }, { alias: '/index' })
      expect(result.alias).toEqual(['/home', '/index'])
    })

    it('应该正确合并 alias 数组', () => {
      const result = mergePageOptions({ alias: ['/home', '/main'] }, { alias: ['/index'] })
      expect(result.alias).toEqual(['/home', '/main', '/index'])
    })

    it('应该正确合并 meta 配置', () => {
      const result = mergePageOptions({ meta: { title: 'Home' } }, { meta: { auth: true } })
      expect(result.meta).toEqual({ title: 'Home', auth: true })
    })

    it('应该正确合并 pattern 配置', () => {
      const result = mergePageOptions({ pattern: { id: /\d+/ } }, { pattern: { slug: /[a-z]+/ } })
      expect(result.pattern).toEqual({ id: /\d+/, slug: /[a-z]+/ })
    })

    it('无参数时应返回空对象', () => {
      const result = mergePageOptions()
      expect(result).toEqual({})
    })

    it('全部为 falsy 值时应返回空对象', () => {
      const result = mergePageOptions(null as any, undefined as any, false as any)
      expect(result).toEqual({})
    })

    it('单个配置应正常返回', () => {
      const result = mergePageOptions({ name: 'home' })
      expect(result.name).toBe('home')
    })
  })

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
    it('应该解析复杂的 meta 配置', () => {
      const content = `
definePage({
  meta:{"tocList":[{"level":2,"name":"测试","hash":"测试","children":[]},{"level":2,"name":"22","hash":"_22","children":[]}], order: -1}
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options).toBeDefined()
      expect(options?.meta).toEqual({
        tocList: [
          { level: 2, name: '测试', hash: '测试', children: [] },
          { level: 2, name: '22', hash: '_22', children: [] }
        ],
        order: -1
      })
    })

    it('应该解析 meta 中的负数', () => {
      const content = `
definePage({
  meta: { order: -1, priority: -99 }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ order: -1, priority: -99 })
    })

    it('应该解析 meta 中的正号一元表达式', () => {
      const content = `
definePage({
  meta: { code: +42 }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ code: 42 })
    })

    it('应该解析 meta 中的逻辑取反', () => {
      const content = `
definePage({
  meta: { disabled: !true, hidden: !false }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ disabled: false, hidden: true })
    })

    it('应该解析 meta 中的位取反', () => {
      const content = `
definePage({
  meta: { flags: ~0 }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ flags: -1 })
    })

    it('应该解析 meta 中的模板字符串', () => {
      const content = `
definePage({
  meta: { title: \`Hello World\` }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ title: 'Hello World' })
    })

    it('应该解析 meta 中的 null 值', () => {
      const content = `
definePage({
  meta: { fallback: null, active: true }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ fallback: null, active: true })
    })

    it('应该解析 meta 中深层嵌套的对象和数组', () => {
      const content = `
definePage({
  meta: {
    nav: {
      items: [
        { label: "首页", children: [{ label: "子页" }] },
        { label: "关于", children: [] }
      ]
    }
  }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({
        nav: {
          items: [
            { label: '首页', children: [{ label: '子页' }] },
            { label: '关于', children: [] }
          ]
        }
      })
    })

    it('应该解析 meta 中混合的 Identifier 和 StringLiteral key', () => {
      const content = `
definePage({
  meta: { "title": "测试", order: 1, "active": true }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ title: '测试', order: 1, active: true })
    })

    it('应该解析 meta 中包含各种数值类型', () => {
      const content = `
definePage({
  meta: { zero: 0, float: 3.14, negative: -0.5, large: 1000000 }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ zero: 0, float: 3.14, negative: -0.5, large: 1000000 })
    })

    it('应该解析 meta 中的稀疏数组', () => {
      const content = `
definePage({
  meta: { tags: ['a', 'b', 'c'] }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ tags: ['a', 'b', 'c'] })
    })

    it('带表达式的模板字符串应返回 undefined', () => {
      const content = `
definePage({
  meta: { title: \`Hello \${name}\` }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ title: undefined })
    })
  })

  describe('parseDefinePage 不支持数据结构警告', () => {
    it('遇到变量引用时应输出警告', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  meta: { name: myVar }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ name: undefined })
      expect(warnSpy).toHaveBeenCalled()
      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasIdentifierWarn = warnCalls.some(
        msg => msg.includes('Identifier') && msg.includes('meta.name')
      )
      expect(hasIdentifierWarn).toBe(true)
      warnSpy.mockRestore()
    })

    it('遇到函数调用时应输出警告', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  meta: { id: genId() }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ id: undefined })
      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasCallWarn = warnCalls.some(
        msg => msg.includes('CallExpression') && msg.includes('meta.id')
      )
      expect(hasCallWarn).toBe(true)
      warnSpy.mockRestore()
    })

    it('遇到属性访问表达式时应输出警告', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  meta: { url: config.baseUrl }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ url: undefined })
      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasMemberWarn = warnCalls.some(
        msg => msg.includes('MemberExpression') && msg.includes('meta.url')
      )
      expect(hasMemberWarn).toBe(true)
      warnSpy.mockRestore()
    })

    it('遇到箭头函数时应输出警告', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  meta: { handler: () => 'test' }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ handler: undefined })
      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasArrowWarn = warnCalls.some(
        msg => msg.includes('ArrowFunctionExpression') && msg.includes('meta.handler')
      )
      expect(hasArrowWarn).toBe(true)
      warnSpy.mockRestore()
    })

    it('遇到三元表达式时应输出警告', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  meta: { mode: isDev ? 'development' : 'production' }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ mode: undefined })
      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasConditionalWarn = warnCalls.some(
        msg => msg.includes('ConditionalExpression') && msg.includes('meta.mode')
      )
      expect(hasConditionalWarn).toBe(true)
      warnSpy.mockRestore()
    })

    it('遇到带插值的模板字符串应输出警告', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  meta: { title: \`Hello \${name}\` }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta).toEqual({ title: undefined })
      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasTemplateWarn = warnCalls.some(
        msg => msg.includes('TemplateLiteral') && msg.includes('meta.title')
      )
      expect(hasTemplateWarn).toBe(true)
      warnSpy.mockRestore()
    })

    it('嵌套路径中的不支持节点应包含完整路径', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  meta: { nav: { items: [dynamicVar] } }
})
export default () => (<div />)
      `

      const options = parseDefinePage(content, '/test/page.tsx')

      expect(options?.meta?.nav).toEqual({ items: [undefined] })
      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasNestedPathWarn = warnCalls.some(msg => msg.includes('meta.nav.items[0]'))
      expect(hasNestedPathWarn).toBe(true)
      warnSpy.mockRestore()
    })

    it('警告应包含修复建议', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  meta: { id: genId() }
})
export default () => (<div />)
      `

      parseDefinePage(content, '/test/page.tsx')

      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasSuggestion = warnCalls.some(
        msg => msg.includes('不支持函数调用') || msg.includes('字面量值')
      )
      expect(hasSuggestion).toBe(true)
      warnSpy.mockRestore()
    })

    it('正常配置不应产生任何警告', () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const content = `
definePage({
  name: 'home',
  meta: { title: 'Home', order: -1 },
  alias: ['/index'],
  redirect: '/dashboard'
})
export default () => (<div />)
      `

      parseDefinePage(content, '/test/page.tsx')

      const warnCalls = warnSpy.mock.calls.map(call => call.join(' '))
      const hasUnsupportedWarn = warnCalls.some(
        msg => msg.includes('不支持的') && msg.includes('节点')
      )
      expect(hasUnsupportedWarn).toBe(false)
      warnSpy.mockRestore()
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
