/**
 * 职责：验证公共导航入口解析路径查询参数和锚点；不测试视图渲染。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NavState } from '../../../src/core/common/constant.js'
import type { MemoryRouter } from '../../../src/core/router/memory.js'
import { createMockComponent, createTestRouter } from '../testHelpers.js'

describe('路径查询参数', () => {
  let router: MemoryRouter

  beforeEach(async (): Promise<void> => {
    router = createTestRouter()
    await router.isReady()
  })

  afterEach((): void => router.destroy())

  it.each(['push', 'replace'] as const)('%s 支持字符串路径查询参数', async method => {
    const result = await router[method]('/user/123?search=%E4%B8%AD%E6%96%87&empty=#section')
    expect(result.state).toBe(NavState.success)
    expect(router.route.path).toBe('/user/123')
    expect(router.route.params).toEqual({ id: '123' })
    expect(router.route.query).toEqual({ search: '中文', empty: '' })
    expect(router.route.hash).toBe('#section')
  })

  it.each(['push', 'replace'] as const)(
    '%s 保留编码参数并生成可往返解析的链接',
    async (method): Promise<void> => {
      const result = await router[method]('/home?value=a%26b&plus=%2B&encoded=%252F')
      expect(result.state).toBe(NavState.success)
      const expected = { value: 'a&b', plus: '+', encoded: '%2F' }
      expect(router.route.query).toEqual(expected)
      expect(router.matchRoute({ index: router.route.href })?.query).toEqual(expected)
    }
  )

  it('合并对象目标的查询参数且不修改输入', async (): Promise<void> => {
    const target = {
      index: '/home?page=1&search=test#old',
      query: { page: '2' },
      hash: '#new' as const
    }
    const snapshot = structuredClone(target)
    await router.push(target)
    expect(router.route.query).toEqual({ page: '2', search: 'test' })
    expect(router.route.hash).toBe('#new')
    expect(target).toEqual(snapshot)
  })

  it('保留查询值中的问号以及锚点中的分隔符', (): void => {
    const route = router.matchRoute({ index: '/home?value=a?b#section?x#y' })
    expect(route?.query).toEqual({ value: 'a?b' })
    expect(route?.hash).toBe('#section?x#y')
  })

  it('显式空锚点覆盖路径中的锚点', (): void => {
    expect(router.matchRoute({ index: '/home?x=1#old', hash: '' })?.hash).toBe('')
  })

  it('命名路由不参与路径解析', (): void => {
    router.addRoute({ name: 'search?name', path: '/search', component: createMockComponent() })
    expect(router.matchRoute({ index: 'search?name' })?.path).toBe('/search')
  })

  it('解析路径后再去除后缀', (): void => {
    const suffixedRouter = createTestRouter({ suffix: '.html' })
    try {
      const route = suffixedRouter.matchRoute({ index: '/home.html?page=1' })
      expect(route?.path).toBe('/home')
      expect(route?.query).toEqual({ page: '1' })
    } finally {
      suffixedRouter.destroy()
    }
  })

  it('守卫重定向支持路径查询参数', async (): Promise<void> => {
    router.beforeEach(to => (to.path === '/about' ? '/home?redirected=1' : true))
    await router.push('/about')
    expect(router.route.path).toBe('/home')
    expect(router.route.query).toEqual({ redirected: '1' })
  })
})
