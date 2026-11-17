/**
 * 职责：验证已拆分路径中的分隔符不会被重新解析；不测试 URL 编码生成策略。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { WebRouter } from '../../../src/core/router/web.js'
import { createMemoryRouter } from '../../../src/core/shared/router.js'
import type { Router } from '../../../src/core/router/router.js'
import { createMockComponent } from '../testHelpers.js'

/**
 * 待销毁的路由器，防止浏览器事件监听泄漏到其他用例。
 */
let router: Router | undefined

afterEach((): void => {
  router?.destroy()
  router = undefined
  window.history.replaceState(null, '', '/')
})

describe('已解码路径', () => {
  it.each(['a%3Fb', 'a%23b', 'a%253Fb'])(
    '初始化保留编码路径参数 %s',
    async (encoded): Promise<void> => {
      window.history.replaceState(null, '', `/user/${encoded}?page=2#section`)
      const webRouter = new WebRouter({
        mode: 'path',
        routes: [{ path: '/user/{id}', component: createMockComponent() }]
      })
      router = webRouter
      webRouter.init()
      await webRouter.isReady()
      expect(webRouter.route.params.id).toBe(decodeURIComponent(encoded))
      expect(webRouter.route.query).toEqual({ page: '2' })
      expect(webRouter.route.hash).toBe('#section')
    }
  )

  it.each([true, false])(
    'popstate 恢复路径时保留分隔符，有历史状态：%s',
    async (hasState): Promise<void> => {
      const webRouter = new WebRouter({
        mode: 'path',
        routes: [{ path: '/user/{id}', component: createMockComponent() }]
      })
      router = webRouter
      await webRouter.replace('/user/start')
      webRouter.init()
      const state = hasState
        ? { path: '/user/a?b#c', query: { page: '2' }, hash: '#section' }
        : null
      window.history.replaceState(state, '', '/user/a%3Fb%23c?page=2#section')
      const completed = new Promise<void>(resolve => webRouter.afterEach((): void => resolve()))
      window.dispatchEvent(new PopStateEvent('popstate', { state }))
      await completed
      expect(webRouter.route.params.id).toBe('a?b#c')
      expect(webRouter.route.query).toEqual({ page: '2' })
      expect(webRouter.route.hash).toBe('#section')
    }
  )

  it('RouteLocation 再次导航不拆分已解析的路径', async (): Promise<void> => {
    const memoryRouter = createMemoryRouter({
      mode: 'path',
      routes: [{ path: '/user/{id}', name: 'user', component: createMockComponent() }]
    })
    router = memoryRouter
    await memoryRouter.push({ index: 'user', params: { id: 'a?b#c' } })
    const location = { ...memoryRouter.route, matched: [] }
    await memoryRouter.push({ index: 'user', params: { id: 'other' } })
    await memoryRouter.push(location)
    expect(memoryRouter.route.params.id).toBe('a?b#c')
    expect(memoryRouter.route.query).toEqual({})
  })
})
