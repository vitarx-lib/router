import { describe, expect, it, vi } from 'vitest'
import {
  resolveComponent,
  resolvePattern,
  resolveProps
} from '../../../src/core/common/resolve.js'
import type { Route } from '../../../src/core/types/index.js'

function createMockComponent() {
  return vi.fn()
}

describe('common/resolve', () => {
  describe('resolveComponent', () => {
    it('应该将单个组件转换为命名视图格式', () => {
      const component = createMockComponent()
      const route: Route = { path: '/home', component }
      const result = resolveComponent(route, '/home')
      expect(result).toEqual({ default: component })
    })

    it('应该直接返回有效的命名视图组件', () => {
      const defaultComponent = createMockComponent()
      const sidebarComponent = createMockComponent()
      const route: Route = {
        path: '/dashboard',
        component: {
          default: defaultComponent,
          sidebar: sidebarComponent
        }
      }
      const result = resolveComponent(route, '/dashboard')
      expect(result).toEqual({
        default: defaultComponent,
        sidebar: sidebarComponent
      })
    })

    it('当组件为对象但缺少 default 时应该抛出错误', () => {
      const route: Route = {
        path: '/dashboard',
        component: {
          sidebar: createMockComponent()
        } as any
      }
      expect(() => resolveComponent(route, '/dashboard')).toThrow(
        'when "component" is an object (named views), it must have a "default" view'
      )
    })

    it('当命名视图中的组件无效时应该抛出错误', () => {
      const route: Route = {
        path: '/dashboard',
        component: {
          default: createMockComponent(),
          sidebar: 'invalid' as any
        }
      }
      expect(() => resolveComponent(route, '/dashboard')).toThrow(
        'named view "sidebar" must be a valid component'
      )
    })

    it('当没有组件、没有子路由但有重定向时应该抛出错误', () => {
      const route: Route = {
        path: '/redirect',
        redirect: '/home'
      }
      expect(() => resolveComponent(route, '/redirect')).toThrow(
        'when "component" is not present, "children" and "redirect" must be configured'
      )
    })

    it('当没有组件但有子路由时应该返回 undefined', () => {
      const route: Route = {
        path: '/parent',
        children: [{ path: '/parent/child', component: createMockComponent() }]
      }
      const result = resolveComponent(route, '/parent')
      expect(result).toBeUndefined()
    })

    it('当没有组件但有子路由和重定向时应该返回 undefined', () => {
      const route: Route = {
        path: '/parent',
        redirect: '/home',
        children: [{ path: '/parent/child', component: createMockComponent() }]
      }
      const result = resolveComponent(route, '/parent')
      expect(result).toBeUndefined()
    })

    it('当组件为 undefined 时应该返回 undefined', () => {
      const route: Route = { path: '/home' }
      const result = resolveComponent(route, '/home')
      expect(result).toBeUndefined()
    })
  })

  describe('resolvePattern', () => {
    const defaultPattern = /[^/]+/

    it('应该正确解析简单路径', () => {
      const result = resolvePattern('/home', {}, false, false, defaultPattern)
      expect(result.regex.test('/home')).toBe(true)
      expect(result.regex.test('/home/')).toBe(true)
      expect(result.pattern).toEqual([])
    })

    it('应该正确解析带参数的路径', () => {
      const result = resolvePattern('/user/{id}', {}, false, false, defaultPattern)
      expect(result.regex.test('/user/123')).toBe(true)
      expect(result.regex.test('/user/abc')).toBe(true)
      expect(result.pattern).toHaveLength(1)
      expect(result.pattern[0].name).toBe('id')
      expect(result.pattern[0].optional).toBe(false)
    })

    it('应该正确解析可选参数', () => {
      const result = resolvePattern('/user/{id?}', {}, false, false, defaultPattern)
      expect(result.regex.test('/user/')).toBe(true)
      expect(result.regex.test('/user/123')).toBe(true)
      expect(result.pattern).toHaveLength(1)
      expect(result.pattern[0].name).toBe('id')
      expect(result.pattern[0].optional).toBe(true)
    })

    it('应该正确处理严格模式', () => {
      const strictResult = resolvePattern('/home', {}, true, false, defaultPattern)
      expect(strictResult.regex.test('/home')).toBe(true)
      expect(strictResult.regex.test('/home/')).toBe(false)

      const nonStrictResult = resolvePattern('/home', {}, false, false, defaultPattern)
      expect(nonStrictResult.regex.test('/home')).toBe(true)
      expect(nonStrictResult.regex.test('/home/')).toBe(true)
    })

    it('应该正确处理忽略大小写', () => {
      const caseSensitive = resolvePattern('/Home', {}, false, false, defaultPattern)
      expect(caseSensitive.regex.test('/Home')).toBe(true)
      expect(caseSensitive.regex.test('/home')).toBe(false)

      const caseInsensitive = resolvePattern('/Home', {}, false, true, defaultPattern)
      expect(caseInsensitive.regex.test('/Home')).toBe(true)
      expect(caseInsensitive.regex.test('/home')).toBe(true)
    })

    it('应该正确使用自定义 pattern', () => {
      const customPattern = /\d+/
      const result = resolvePattern('/user/{id}', { id: customPattern }, false, false, defaultPattern)
      expect(result.regex.test('/user/123')).toBe(true)
      expect(result.regex.test('/user/abc')).toBe(false)
      expect(result.pattern[0].regex).toBe(customPattern)
    })

    it('当自定义 pattern 不是正则时应该使用默认 pattern', () => {
      const result = resolvePattern('/user/{id}', { id: 'invalid' as any }, false, false, defaultPattern)
      expect(result.pattern[0].regex).toBe(defaultPattern)
    })

    it('应该检测重复的参数名', () => {
      expect(() => resolvePattern('/user/{id}/{id}', {}, false, false, defaultPattern)).toThrow(
        'duplicate parameter name "id"'
      )
    })

    it('应该检测必填参数跟在可选参数后面的情况', () => {
      expect(() => resolvePattern('/user/{id?}/{name}', {}, false, false, defaultPattern)).toThrow(
        'required variables cannot follow optional variables'
      )
    })

    it('应该正确解析多个参数', () => {
      const result = resolvePattern('/user/{userId}/post/{postId}', {}, false, false, defaultPattern)
      expect(result.pattern).toHaveLength(2)
      expect(result.pattern[0].name).toBe('userId')
      expect(result.pattern[1].name).toBe('postId')
    })

    it('应该正确解析多个可选参数', () => {
      const result = resolvePattern('/user/{id?}/{name?}', {}, false, false, defaultPattern)
      expect(result.pattern).toHaveLength(2)
      expect(result.pattern[0].optional).toBe(true)
      expect(result.pattern[1].optional).toBe(true)
    })

    it('应该正确处理正则中的锚点', () => {
      const patternWithAnchors = /^[a-z]+$/
      const result = resolvePattern('/user/{id}', { id: patternWithAnchors }, false, false, defaultPattern)
      expect(result.regex.test('/user/abc')).toBe(true)
      expect(result.regex.test('/user/ABC')).toBe(false)
    })
  })

  describe('resolveProps', () => {
    it('当没有组件配置时应该返回 undefined', () => {
      const route: Route = { path: '/home' }
      const result = resolveProps(route, '/home')
      expect(result).toBeUndefined()
    })

    it('当没有 props 配置时应该返回 undefined', () => {
      const route: Route = { path: '/home', component: createMockComponent() }
      const result = resolveProps(route, '/home')
      expect(result).toBeUndefined()
    })

    it('当 props 为 undefined 时应该返回 undefined', () => {
      const route: Route = { path: '/home', component: createMockComponent(), props: undefined }
      const result = resolveProps(route, '/home')
      expect(result).toBeUndefined()
    })

    it('应该正确处理布尔值 props', () => {
      const route: Route = { path: '/home', component: createMockComponent(), props: true }
      const result = resolveProps(route, '/home')
      expect(result).toEqual({ default: true })
    })

    it('应该正确处理对象类型的 props', () => {
      const propsObj = { title: 'Home' }
      const route: Route = { path: '/home', component: createMockComponent(), props: propsObj }
      const result = resolveProps(route, '/home')
      expect(result).toEqual({ default: propsObj })
    })

    it('应该正确处理函数类型的 props', () => {
      const propsFn = () => ({ title: 'Home' })
      const route: Route = { path: '/home', component: createMockComponent(), props: propsFn }
      const result = resolveProps(route, '/home')
      expect(result).toEqual({ default: propsFn })
    })

    it('当 props 类型无效时应该抛出错误', () => {
      const route: Route = {
        path: '/home',
        component: createMockComponent(),
        props: 123 as any
      }
      expect(() => resolveProps(route, '/home')).toThrow(
        '"props" has invalid type, only boolean, object, or function types are supported'
      )
    })

    it('应该正确处理命名视图的 props', () => {
      const defaultComponent = createMockComponent()
      const sidebarComponent = createMockComponent()
      const route: Route = {
        path: '/dashboard',
        component: {
          default: defaultComponent,
          sidebar: sidebarComponent
        },
        props: {
          default: true,
          sidebar: { title: 'Sidebar' }
        }
      }
      const result = resolveProps(route, '/dashboard')
      expect(result).toEqual({
        default: true,
        sidebar: { title: 'Sidebar' }
      })
    })

    it('当命名视图使用非对象 props 时应该抛出错误', () => {
      const route: Route = {
        path: '/dashboard',
        component: {
          default: createMockComponent(),
          sidebar: createMockComponent()
        },
        props: true as any
      }
      expect(() => resolveProps(route, '/dashboard')).toThrow(
        '"props" must be a object type when using named views'
      )
    })

    it('当命名视图 props 中的类型无效时应该抛出错误', () => {
      const route: Route = {
        path: '/dashboard',
        component: {
          default: createMockComponent(),
          sidebar: createMockComponent()
        },
        props: {
          default: true,
          sidebar: 123 as any
        }
      }
      expect(() => resolveProps(route, '/dashboard')).toThrow(
        '"props.sidebar" has invalid type, only boolean, object, or function types are supported'
      )
    })

    it('当命名视图 props 中某个视图没有配置时应该跳过', () => {
      const route: Route = {
        path: '/dashboard',
        component: {
          default: createMockComponent(),
          sidebar: createMockComponent()
        },
        props: {
          default: true
        }
      }
      const result = resolveProps(route, '/dashboard')
      expect(result).toEqual({ default: true })
    })

    it('当命名视图 props 中某个视图配置为 undefined 时应该跳过', () => {
      const route: Route = {
        path: '/dashboard',
        component: {
          default: createMockComponent(),
          sidebar: createMockComponent()
        },
        props: {
          default: true,
          sidebar: undefined
        } as any
      }
      const result = resolveProps(route, '/dashboard')
      expect(result).toEqual({ default: true })
    })

    it('当解析结果为空对象时应该返回 undefined', () => {
      const route: Route = {
        path: '/dashboard',
        component: {
          default: createMockComponent(),
          sidebar: createMockComponent()
        },
        props: {} as any
      }
      const result = resolveProps(route, '/dashboard')
      expect(result).toBeUndefined()
    })
  })
})
