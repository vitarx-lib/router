/**
 * @fileoverview AST 值提取工具模块测试
 *
 * 测试从 Babel AST 节点中提取各种类型的值，包括：
 * - extractPageOptions 页面配置提取
 * - name 属性提取
 * - meta 属性提取
 * - pattern 属性提取
 * - redirect 属性提取
 * - alias 属性提取
 */
import { parse } from '@babel/parser'
import { describe, expect, it } from 'vitest'
import { extractPageOptions } from '../../../src/file-router/macros/astValueExtractor.js'
import type { PageOptions } from '../../../src/file-router/types/route.js'

function extractFromCode(code: string): PageOptions {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'objectRestSpread', 'dynamicImport']
  })

  const expression = (ast.program.body[0] as any).expression
  return extractPageOptions(expression)
}

describe('macros/astValueExtractor', () => {
  describe('extractPageOptions', () => {
    it('应该提取 name 属性', () => {
      const result = extractFromCode(`({ name: 'home' })`)
      expect(result.name).toBe('home')
    })

    it('应该在 name 非字符串时不设置', () => {
      const result = extractFromCode(`({ name: 123 })`)
      expect(result.name).toBeUndefined()
    })

    it('应该提取 meta 属性', () => {
      const result = extractFromCode(`({ meta: { title: 'Home', requiresAuth: true } })`)
      expect(result.meta).toEqual({ title: 'Home', requiresAuth: true })
    })

    it('应该提取 meta 中的嵌套对象', () => {
      const result = extractFromCode(`({ meta: { layout: { name: 'default' } } })`)
      expect(result.meta).toEqual({ layout: { name: 'default' } })
    })

    it('应该提取 meta 中的数组值', () => {
      const result = extractFromCode(`({ meta: { roles: ['admin', 'user'] } })`)
      expect(result.meta).toEqual({ roles: ['admin', 'user'] })
    })

    it('应该提取 meta 中的 null 值', () => {
      const result = extractFromCode(`({ meta: { value: null } })`)
      expect(result.meta).toEqual({ value: null })
    })

    it('应该提取 pattern 属性（正则字面量）', () => {
      const result = extractFromCode(`({ pattern: { id: /^\\d+$/ } })`)
      expect(result.pattern).toEqual({ id: /^\d+$/ })
    })

    it('应该提取 pattern 属性（带标志的正则字面量）', () => {
      const result = extractFromCode(`({ pattern: { id: /^\\d+$/gi } })`)
      expect(result.pattern).toEqual({ id: /^\d+$/gi })
    })

    it('应该提取 pattern 属性（new RegExp 构造）', () => {
      const result = extractFromCode(`({ pattern: { id: new RegExp('^\\\\d+$') } })`)
      expect(result.pattern).toEqual({ id: /^\d+$/ })
    })

    it('应该提取 pattern 属性（new RegExp 带标志）', () => {
      const result = extractFromCode(`({ pattern: { id: new RegExp('^\\\\d+$', 'i') } })`)
      expect(result.pattern).toEqual({ id: /^\d+$/i })
    })

    it('应该提取 redirect 字符串', () => {
      const result = extractFromCode(`({ redirect: '/login' })`)
      expect(result.redirect).toBe('/login')
    })

    it('应该提取 redirect 对象配置', () => {
      const result = extractFromCode(`({ redirect: { index: '/login', query: { from: 'home' } } })`)
      expect(result.redirect).toEqual({ index: '/login', query: { from: 'home' } })
    })

    it('应该提取 redirect 对象配置带 params', () => {
      const result = extractFromCode(`({ redirect: { index: 'user-detail', params: { id: '1' } } })`)
      expect(result.redirect).toEqual({ index: 'user-detail', params: { id: '1' } })
    })

    it('应该在 redirect 对象缺少 index 时不设置', () => {
      const result = extractFromCode(`({ redirect: { query: { from: 'home' } } })`)
      expect(result.redirect).toBeUndefined()
    })

    it('应该提取 alias 字符串', () => {
      const result = extractFromCode(`({ alias: '/home' })`)
      expect(result.alias).toBe('/home')
    })

    it('应该提取 alias 字符串数组', () => {
      const result = extractFromCode(`({ alias: ['/home', '/index'] })`)
      expect(result.alias).toEqual(['/home', '/index'])
    })

    it('应该在 alias 数组为空时不设置', () => {
      const result = extractFromCode(`({ alias: [] })`)
      expect(result.alias).toBeUndefined()
    })

    it('应该提取完整的页面配置', () => {
      const result = extractFromCode(`({
        name: 'user-detail',
        meta: { title: '用户详情', requiresAuth: true },
        redirect: '/login',
        alias: ['/user', '/account']
      })`)
      expect(result.name).toBe('user-detail')
      expect(result.meta).toEqual({ title: '用户详情', requiresAuth: true })
      expect(result.redirect).toBe('/login')
      expect(result.alias).toEqual(['/user', '/account'])
    })

    it('应该返回空对象对于空的对象表达式', () => {
      const result = extractFromCode(`({})`)
      expect(result).toEqual({})
    })

    it('应该忽略非 Identifier 的 key', () => {
      const result = extractFromCode(`({ 'name': 'home' })`)
      expect(result.name).toBeUndefined()
    })

    it('应该忽略未知的属性', () => {
      const result = extractFromCode(`({ unknown: 'value' })`)
      expect(result).toEqual({})
    })
  })
})
