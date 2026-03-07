import { describe, expect, it } from 'vitest'
import {
  addPathSuffix,
  cloneRouteLocation,
  createDynamicPattern,
  formatHash,
  formatPath,
  getPathSuffix,
  isRouteGroup,
  isVariablePath,
  mergePathParams,
  objectToQueryString,
  optionalVariableCount,
  queryStringToObject,
  splitPathAndSuffix,
  urlToRouteTarget,
  validateSuffix
} from '../../src/core/utils.js'
import type { RouteLocation, RouteNormalized } from '../../src/index.js'

describe('utils', () => {
  describe('isVariablePath', () => {
    it('应该正确识别包含变量的路径', () => {
      expect(isVariablePath('/{id}')).toBe(true)
      expect(isVariablePath('/user/{id}')).toBe(true)
      expect(isVariablePath('/user/{id?}')).toBe(true)
      expect(isVariablePath('/user/{id}/profile/{name}')).toBe(true)
    })

    it('应该正确识别不包含变量的路径', () => {
      expect(isVariablePath('/home')).toBe(false)
      expect(isVariablePath('/user/profile')).toBe(false)
      expect(isVariablePath('/')).toBe(false)
    })

    it('应该正确处理边缘情况', () => {
      expect(isVariablePath('')).toBe(false)
      expect(isVariablePath('{}')).toBe(false)
      expect(isVariablePath('{id')).toBe(false)
    })
  })

  describe('optionalVariableCount', () => {
    it('应该正确计算可选变量数量', () => {
      expect(optionalVariableCount('/user/{id?}')).toBe(1)
      expect(optionalVariableCount('/user/{id?}/{name?}')).toBe(2)
      expect(optionalVariableCount('/user/{id}/{name?}')).toBe(1)
    })

    it('应该在没有可选变量时返回0', () => {
      expect(optionalVariableCount('/user/{id}')).toBe(0)
      expect(optionalVariableCount('/home')).toBe(0)
    })

    it('应该正确处理带空格的路径', () => {
      expect(optionalVariableCount('/user/{ id? }')).toBe(1)
    })
  })

  describe('isRouteGroup', () => {
    it('应该正确识别路由组', () => {
      const route = {
        path: '/parent',
        children: [{ path: '/child' }]
      } as unknown as RouteNormalized
      expect(isRouteGroup(route)).toBe(true)
    })

    it('应该正确识别非路由组', () => {
      const route = {
        path: '/home',
        children: []
      } as unknown as RouteNormalized
      expect(isRouteGroup(route)).toBe(false)
    })

    it('应该正确处理没有children属性的路由', () => {
      const route = { path: '/home' } as unknown as RouteNormalized
      expect(isRouteGroup(route)).toBe(false)
    })
  })

  describe('createDynamicPattern', () => {
    it('应该为简单动态路径创建正确的正则', () => {
      const result = createDynamicPattern('/user/{id}', {}, false, /[\w.]+/)
      expect(result.length).toBe(2)
      expect(result.optional).toBe(0)
      expect(result.regex.test('/user/123/')).toBe(true)
      expect(result.regex.test('/user/abc/')).toBe(true)
      expect(result.regex.test('/user/')).toBe(false)
    })

    it('应该正确处理可选变量', () => {
      const result = createDynamicPattern('/user/{id?}', {}, false, /[\w.]+/)
      expect(result.optional).toBe(1)
      expect(result.regex.test('/user/123/')).toBe(true)
      expect(result.regex.test('/user/')).toBe(true)
    })

    it('应该在可选变量后有必填变量时抛出错误', () => {
      expect(() => {
        createDynamicPattern('/user/{id?}/{name}', {}, false, /[\w.]+/)
      }).toThrow('[Router]：动态路径 /user/{id?}/{name} 中，可选变量后不能存在必填变量')
    })

    it('应该正确处理自定义正则', () => {
      const pattern = { id: /\d+/ }
      const result = createDynamicPattern('/user/{id}', pattern, false, /[\w.]+/)
      expect(result.regex.test('/user/123/')).toBe(true)
      expect(result.regex.test('/user/abc/')).toBe(false)
    })

    it('应该正确处理严格模式', () => {
      const strictResult = createDynamicPattern('/User/{id}', {}, true, /[\w.]+/)
      const nonStrictResult = createDynamicPattern('/User/{id}', {}, false, /[\w.]+/)

      expect(strictResult.regex.test('/user/123/')).toBe(false)
      expect(nonStrictResult.regex.test('/user/123/')).toBe(true)
    })

    it('应该对无效正则使用默认模式并发出警告', () => {
      const pattern = { id: 'invalid' as any }
      const result = createDynamicPattern('/user/{id}', pattern, false, /[\w.]+/)
      expect(result.regex.test('/user/123/')).toBe(true)
    })
  })

  describe('formatPath', () => {
    it('应该正确格式化路径', () => {
      expect(formatPath('home')).toBe('/home')
      expect(formatPath('/home')).toBe('/home')
      expect(formatPath('/home/')).toBe('/home')
      expect(formatPath('home/')).toBe('/home')
    })

    it('应该处理重复斜杠', () => {
      expect(formatPath('//home//page')).toBe('/home/page')
      expect(formatPath('///home')).toBe('/home')
    })

    it('应该去除空格', () => {
      expect(formatPath(' / home / page ')).toBe('/home/page')
    })

    it('应该正确处理根路径', () => {
      expect(formatPath('/')).toBe('/')
      expect(formatPath('')).toBe('/')
    })

    it('应该正确处理特殊路径', () => {
      expect(formatPath('/#/')).toBe('/#/')
    })
  })

  describe('mergePathParams', () => {
    it('应该正确合并路径参数', () => {
      expect(mergePathParams('/user/{id}', { id: '123' })).toBe('/user/123')
      expect(mergePathParams('/user/{id}/profile/{name}', { id: '123', name: 'john' })).toBe(
        '/user/123/profile/john'
      )
    })

    it('应该正确处理可选参数', () => {
      expect(mergePathParams('/user/{id?}', { id: '123' })).toBe('/user/123')
      expect(mergePathParams('/user/{id?}', {})).toBe('/user')
    })

    it('应该在缺少必填参数时抛出错误', () => {
      expect(() => {
        mergePathParams('/user/{id}', {})
      }).toThrow('[Router]: 访问路由/user/{id}时缺少参数 id')
    })

    it('应该对非变量路径直接返回', () => {
      expect(mergePathParams('/home', {})).toBe('/home')
    })

    it('应该将参数中的空格替换为下划线', () => {
      expect(mergePathParams('/user/{id}', { id: 'hello world' })).toBe('/user/hello_world')
    })

    it('应该支持数字类型的参数', () => {
      expect(mergePathParams('/user/{id}', { id: 123 })).toBe('/user/123')
    })
  })

  describe('formatHash', () => {
    it('应该正确添加#前缀', () => {
      expect(formatHash('section', true)).toBe('#section')
      expect(formatHash('#section', true)).toBe('#section')
    })

    it('应该正确去除#前缀', () => {
      expect(formatHash('#section', false)).toBe('section')
      expect(formatHash('section', false)).toBe('section')
    })

    it('应该正确处理空值', () => {
      expect(formatHash('', true)).toBe('')
      expect(formatHash('', false)).toBe('')
    })

    it('应该正确处理非字符串类型', () => {
      expect(formatHash(null, true)).toBe('')
      expect(formatHash(undefined, true)).toBe('')
      expect(formatHash(123, true)).toBe('')
    })

    it('应该正确处理带空格的hash', () => {
      expect(formatHash(' section ', true)).toBe('#section')
    })
  })

  describe('queryStringToObject', () => {
    it('应该正确解析查询字符串', () => {
      expect(queryStringToObject('?key1=value1&key2=value2')).toEqual({
        key1: 'value1',
        key2: 'value2'
      })
    })

    it('应该正确处理没有?前缀的字符串', () => {
      expect(queryStringToObject('key=value')).toEqual({ key: 'value' })
    })

    it('应该正确处理空字符串', () => {
      expect(queryStringToObject('')).toEqual({})
      expect(queryStringToObject('?')).toEqual({})
    })

    it('应该正确解码URI编码', () => {
      expect(queryStringToObject('?name=%E4%B8%AD%E6%96%87')).toEqual({ name: '中文' })
    })

    it('应该正确处理重复的键', () => {
      const result = queryStringToObject('?key=value1&key=value2')
      expect(result).toHaveProperty('key')
    })
  })

  describe('objectToQueryString', () => {
    it('应该正确将对象转换为查询字符串', () => {
      const result = objectToQueryString({ key1: 'value1', key2: 'value2' })
      expect(result).toContain('key1=value1')
      expect(result).toContain('key2=value2')
      expect(result.startsWith('?')).toBe(true)
    })

    it('应该对空对象返回空字符串', () => {
      expect(objectToQueryString({})).toBe('')
    })
  })

  describe('urlToRouteTarget', () => {
    it('应该正确解析path模式的URL', () => {
      const mockUrl = {
        pathname: '/user/profile',
        search: '?id=123',
        hash: '#section'
      } as Location

      const result = urlToRouteTarget(mockUrl, 'path', '/')

      expect(result.index).toBe('/user/profile')
      expect(result.query).toEqual({ id: '123' })
      expect(result.hash).toBe('#section')
    })

    it('应该正确解析hash模式的URL', () => {
      const mockUrl = {
        pathname: '/',
        search: '',
        hash: '#/user/profile#section'
      } as Location

      const result = urlToRouteTarget(mockUrl, 'hash', '/')

      expect(result.index).toBe('/user/profile')
      expect(result.hash).toBe('#section')
    })

    it('应该正确处理base路径', () => {
      const mockUrl = {
        pathname: '/app/user/profile',
        search: '',
        hash: ''
      } as Location

      const result = urlToRouteTarget(mockUrl, 'path', '/app')

      expect(result.index).toBe('/user/profile')
    })
  })

  describe('splitPathAndSuffix', () => {
    it('应该正确拆分路径和后缀', () => {
      expect(splitPathAndSuffix('/page.html')).toEqual({
        path: '/page',
        suffix: 'html'
      })
    })

    it('应该正确处理没有后缀的路径', () => {
      expect(splitPathAndSuffix('/page')).toEqual({
        path: '/page',
        suffix: ''
      })
    })

    it('应该正确处理多个点的路径', () => {
      expect(splitPathAndSuffix('/path/to/file.min.js')).toEqual({
        path: '/path/to/file.min',
        suffix: 'js'
      })
    })
  })

  describe('getPathSuffix', () => {
    it('应该正确获取路径后缀', () => {
      expect(getPathSuffix('/page.html')).toBe('.html')
      expect(getPathSuffix('/file.min.js')).toBe('.js')
    })

    it('应该对没有后缀的路径返回空字符串', () => {
      expect(getPathSuffix('/page')).toBe('')
      expect(getPathSuffix('/page/')).toBe('')
    })

    it('应该正确处理以点结尾的路径', () => {
      expect(getPathSuffix('/page.')).toBe('')
    })
  })

  describe('validateSuffix', () => {
    it('应该对根路径返回true', () => {
      expect(validateSuffix('', '*', '/', '/')).toBe(true)
    })

    it('应该正确处理通配符后缀', () => {
      expect(validateSuffix('html', '*', '/page.html', '/page')).toBe(true)
      expect(validateSuffix('js', '*', '/app.js', '/app')).toBe(true)
    })

    it('应该正确处理false后缀', () => {
      expect(validateSuffix('', false, '/page', '/page')).toBe(true)
      expect(validateSuffix('html', false, '/page.html', '/page')).toBe(false)
    })

    it('应该正确处理数组后缀', () => {
      expect(validateSuffix('html', ['html', 'htm'], '/page.html', '/page')).toBe(true)
      expect(validateSuffix('js', ['html', 'htm'], '/app.js', '/app')).toBe(false)
    })

    it('应该正确处理字符串后缀', () => {
      expect(validateSuffix('html', 'html', '/page.html', '/page')).toBe(true)
      expect(validateSuffix('js', 'html', '/app.js', '/app')).toBe(false)
    })
  })

  describe('addPathSuffix', () => {
    it('应该正确添加后缀', () => {
      expect(addPathSuffix('/page', 'html')).toBe('/page.html')
      expect(addPathSuffix('/page', '.html')).toBe('/page.html')
    })

    it('应该对空后缀返回原路径', () => {
      expect(addPathSuffix('/page', '')).toBe('/page')
    })

    it('应该对以斜杠结尾的路径不添加后缀', () => {
      expect(addPathSuffix('/page/', 'html')).toBe('/page/')
    })

    it('应该对已包含点的路径不添加后缀', () => {
      expect(addPathSuffix('/page.html', 'js')).toBe('/page.html')
    })
  })

  describe('cloneRouteLocation', () => {
    it('应该正确克隆路由位置对象', () => {
      const route: RouteLocation = {
        __is_route_location: true,
        index: '/user',
        path: '/user',
        fullPath: '/user?id=123',
        hash: '',
        params: { id: '123' },
        query: { id: '123' },
        matched: [],
        meta: { title: 'User' },
        suffix: ''
      }

      const cloned = cloneRouteLocation(route)

      expect(cloned).not.toBe(route)
      expect(cloned.params).not.toBe(route.params)
      expect(cloned.query).not.toBe(route.query)
      expect(cloned.meta).not.toBe(route.meta)
      expect(cloned.matched).not.toBe(route.matched)

      expect(cloned.index).toBe(route.index)
      expect(cloned.path).toBe(route.path)
      expect(cloned.params).toEqual(route.params)
    })

    it('应该正确克隆matched数组', () => {
      const matchedItem = { path: '/user' } as unknown as RouteNormalized
      const route: RouteLocation = {
        __is_route_location: true,
        index: '/user',
        path: '/user',
        fullPath: '/user',
        hash: '',
        params: {},
        query: {},
        matched: [matchedItem],
        meta: {},
        suffix: ''
      }

      const cloned = cloneRouteLocation(route)

      expect(cloned.matched).toEqual([matchedItem])
      expect(cloned.matched).not.toBe(route.matched)
    })
  })
})
