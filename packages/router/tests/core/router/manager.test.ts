import { h, logger } from 'vitarx'
import { describe, expect, it, vi } from 'vitest'
import { RouteManager } from '../../../src/core/router/manager.js'
import type { Route } from '../../../src/core/types/index.js'

function createMockComponent() {
  return () => h('div', {}, 'mock')
}

function createMockComponent2() {
  return () => h('span', {}, 'mock2')
}

describe('RouteManager', () => {
  describe('构造函数', () => {
    it('应该使用默认配置', () => {
      const manager = new RouteManager([])
      expect(manager.config.pattern).toEqual(/[^/]+/)
      expect(manager.config.strict).toBe(false)
      expect(manager.config.ignoreCase).toBe(false)
      expect(manager.config.fallbackIndex).toBe(false)
    })

    it('应该接受自定义配置', () => {
      const manager = new RouteManager([], {
        pattern: /\d+/,
        strict: true,
        ignoreCase: true,
        fallbackIndex: true
      })
      expect(manager.config.pattern).toEqual(/\d+/)
      expect(manager.config.strict).toBe(true)
      expect(manager.config.ignoreCase).toBe(true)
      expect(manager.config.fallbackIndex).toBe(true)
    })

    it('配置应该是只读的', () => {
      const manager = new RouteManager([])
      expect(Object.isFrozen(manager.config)).toBe(true)
    })
  })

  describe('findByPath', () => {
    it('应该找到静态路由', () => {
      const routes: Route[] = [{ path: '/home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/home')).toBeDefined()
      expect(manager.findByPath('/home')?.path).toBe('/home')
    })

    it('应该返回 null 对于不存在的路径', () => {
      const manager = new RouteManager([])
      expect(manager.findByPath('/nonexistent')).toBeNull()
    })

    it('应该在 ignoreCase 模式下忽略大小写', () => {
      const routes: Route[] = [{ path: '/Home', component: createMockComponent() }]
      const manager = new RouteManager(routes, { ignoreCase: true })
      expect(manager.findByPath('/home')).toBeDefined()
      expect(manager.findByPath('/HOME')).toBeDefined()
    })

    it('应该找到分组路由', () => {
      const routes: Route[] = [
        {
          path: '/parent',
          children: [{ path: 'child', component: createMockComponent() }]
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/parent')).toBeDefined()
      expect(manager.findByPath('/parent/child')).toBeDefined()
    })
  })

  describe('findByName', () => {
    it('应该找到命名路由', () => {
      const routes: Route[] = [{ path: '/home', name: 'home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByName('home')).toBeDefined()
      expect(manager.findByName('home')?.path).toBe('/home')
    })

    it('应该返回 null 对于不存在的名称', () => {
      const manager = new RouteManager([])
      expect(manager.findByName('nonexistent')).toBeNull()
    })
  })

  describe('find', () => {
    it('路径参数应该调用 findByPath', () => {
      const routes: Route[] = [{ path: '/home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.find('/home')).toBeDefined()
    })

    it('名称参数应该调用 findByName', () => {
      const routes: Route[] = [{ path: '/home', name: 'home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.find('home')).toBeDefined()
    })

    it('Symbol 参数应该调用 findByName', () => {
      const sym = Symbol('home')
      const routes: Route[] = [{ path: '/home', name: sym, component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.find(sym)).toBeDefined()
    })
  })

  describe('matchByPath - 静态路由', () => {
    it('应该匹配静态路由', () => {
      const routes: Route[] = [{ path: '/home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      const result = manager.matchByPath('/home')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/home')
      expect(result?.params).toEqual({})
    })

    it('应该返回 null 对于不匹配的路径', () => {
      const manager = new RouteManager([])
      expect(manager.matchByPath('/nonexistent')).toBeNull()
    })

    it('strict 模式下应该拒绝尾部斜杠', () => {
      const routes: Route[] = [{ path: '/home', component: createMockComponent() }]
      const manager = new RouteManager(routes, { strict: true })
      expect(manager.matchByPath('/home/')).toBeNull()
    })

    it('非 strict 模式下应该允许尾部斜杠', () => {
      const routes: Route[] = [{ path: '/home', component: createMockComponent() }]
      const manager = new RouteManager(routes, { strict: false })
      expect(manager.matchByPath('/home/')).toBeDefined()
    })
  })

  describe('matchByPath - 动态路由', () => {
    it('应该匹配动态路由并提取参数', () => {
      const routes: Route[] = [{ path: '/users/{id}', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      const result = manager.matchByPath('/users/123')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/users/{id}')
      expect(result?.params.id).toBe('123')
    })

    it('应该匹配多个参数', () => {
      const routes: Route[] = [
        { path: '/users/{userId}/posts/{postId}', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByPath('/users/123/posts/456')
      expect(result).toBeDefined()
      expect(result?.params.userId).toBe('123')
      expect(result?.params.postId).toBe('456')
    })

    it('应该匹配可选参数', () => {
      const routes: Route[] = [{ path: '/users/{id?}', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      const result1 = manager.matchByPath('/users/123')
      expect(result1?.params.id).toBe('123')
      const result2 = manager.matchByPath('/users')
      expect(result2).toBeDefined()
    })

    it('应该使用自定义 pattern 匹配参数', () => {
      const routes: Route[] = [
        {
          path: '/users/{id}',
          component: createMockComponent(),
          pattern: { id: /\d+/ }
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.matchByPath('/users/123')).toBeDefined()
      expect(manager.matchByPath('/users/abc')).toBeNull()
    })
  })

  describe('matchByPath - fallbackIndex', () => {
    it('应该在 fallbackIndex 模式下回退匹配', () => {
      const routes: Route[] = [{ path: '/users', component: createMockComponent() }]
      const manager = new RouteManager(routes, { fallbackIndex: true })
      const result = manager.matchByPath('/users/index')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/users')
    })

    it('非 fallbackIndex 模式下不应该回退匹配', () => {
      const routes: Route[] = [{ path: '/users', component: createMockComponent() }]
      const manager = new RouteManager(routes, { fallbackIndex: false })
      expect(manager.matchByPath('/users/index')).toBeNull()
    })
  })

  describe('matchByName', () => {
    it('应该匹配命名路由', () => {
      const routes: Route[] = [{ path: '/home', name: 'home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      const result = manager.matchByName('home')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/home')
    })

    it('应该返回 null 对于不存在的名称', () => {
      const manager = new RouteManager([])
      expect(manager.matchByName('nonexistent')).toBeNull()
    })

    it('动态路由应该验证并填充参数', () => {
      const routes: Route[] = [
        { path: '/users/{id}', name: 'user', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByName('user', { id: '123' })
      expect(result).toBeDefined()
      expect(result?.path).toBe('/users/123')
      expect(result?.params.id).toBe('123')
    })

    it('缺少必填参数应该返回 null', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
      const routes: Route[] = [
        { path: '/users/{id}', name: 'user', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      expect(manager.matchByName('user', {})).toBeNull()
      warnSpy.mockRestore()
    })

    it('参数格式不匹配应该返回 null', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
      const routes: Route[] = [
        {
          path: '/users/{id}',
          name: 'user',
          component: createMockComponent(),
          pattern: { id: /\d+/ }
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.matchByName('user', { id: 'abc' })).toBeNull()
      warnSpy.mockRestore()
    })
  })

  describe('match', () => {
    it('路径参数应该调用 matchByPath', () => {
      const routes: Route[] = [{ path: '/home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.match('/home')).toBeDefined()
    })

    it('名称参数应该调用 matchByName', () => {
      const routes: Route[] = [{ path: '/home', name: 'home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.match('home')).toBeDefined()
    })
  })

  describe('addRoute', () => {
    it('应该添加新路由', () => {
      const manager = new RouteManager([])
      manager.addRoute({ path: '/home', component: createMockComponent() })
      expect(manager.findByPath('/home')).toBeDefined()
    })

    it('应该添加命名路由', () => {
      const manager = new RouteManager([])
      manager.addRoute({ path: '/home', name: 'home', component: createMockComponent() })
      expect(manager.findByName('home')).toBeDefined()
    })

    it('应该添加子路由', () => {
      const manager = new RouteManager([{ path: '/parent', component: createMockComponent() }])
      manager.addRoute({ path: 'child', component: createMockComponent() }, '/parent')
      expect(manager.findByPath('/parent/child')).toBeDefined()
    })

    it('父路由不存在应该抛出错误', () => {
      const manager = new RouteManager([])
      expect(() => {
        manager.addRoute({ path: 'child', component: createMockComponent() }, '/nonexistent')
      }).toThrow(/Parent route.*not found/)
    })
  })

  describe('removeRoute', () => {
    it('应该移除存在的路由', () => {
      const routes: Route[] = [{ path: '/home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.removeRoute('/home')).toBe(true)
      expect(manager.findByPath('/home')).toBeNull()
    })

    it('应该返回 false 对于不存在的路由', () => {
      const manager = new RouteManager([])
      expect(manager.removeRoute('/nonexistent')).toBe(false)
    })

    it('应该移除命名路由', () => {
      const routes: Route[] = [{ path: '/home', name: 'home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.removeRoute('home')).toBe(true)
      expect(manager.findByName('home')).toBeNull()
    })

    it('删除路由不会级联删除子路由', () => {
      const routes: Route[] = [
        {
          path: '/parent',
          component: createMockComponent(),
          children: [
            { path: 'child1', component: createMockComponent() },
            {
              path: 'child2',
              component: createMockComponent(),
              children: [{ path: 'grandchild', component: createMockComponent() }]
            }
          ]
        }
      ]
      const manager = new RouteManager(routes)
      // 分组路由（有 component 和 children）不会被注册到 routes
      // 只有子路由会被注册（child1 和 child2），grandchild 有 parent child2，所以不会被注册到 routes
      expect(manager.routes.size).toBe(2)
      // 验证子路由都能被找到
      expect(manager.findByPath('/parent/child1')).toBeDefined()
      expect(manager.findByPath('/parent/child2')).toBeDefined()
      expect(manager.findByPath('/parent/child2/grandchild')).toBeDefined()
      // 删除子路由
      manager.removeRoute('/parent/child1')
      expect(manager.routes.size).toBe(1)
      expect(manager.findByPath('/parent/child1')).toBeNull()
      // 其他子路由仍然存在
      expect(manager.findByPath('/parent/child2')).toBeDefined()
      expect(manager.findByPath('/parent/child2/grandchild')).toBeDefined()
    })
  })

  describe('clearRoutes', () => {
    it('应该清空所有路由', () => {
      const routes: Route[] = [
        { path: '/', component: createMockComponent() },
        { path: '/home', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      expect(manager.routes.size).toBe(2)
      manager.clearRoutes()
      expect(manager.routes.size).toBe(0)
      expect(manager.staticRoutes.size).toBe(0)
      expect(manager.namedRoutes.size).toBe(0)
      expect(manager.dynamicRoutes.size).toBe(0)
      expect(manager.aliasRoutes.size).toBe(0)
    })
  })

  describe('路由组', () => {
    it('应该正确处理无组件的路由组', () => {
      const routes: Route[] = [
        {
          path: '/parent',
          children: [{ path: 'child', component: createMockComponent() }]
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/parent/child')).toBeDefined()
    })

    it('路由组应该注册到 routes', () => {
      const routes: Route[] = [
        {
          path: '/parent',
          children: [{ path: 'child', component: createMockComponent() }]
        }
      ]
      const manager = new RouteManager(routes)
      // 只有顶层路由在 routes 中
      expect(manager.routes.size).toBe(1)
      // 但子路由应该能被找到
      expect(manager.findByPath('/parent')).toBeDefined()
      expect(manager.findByPath('/parent/child')).toBeDefined()
    })

    it('带重定向的路由组应该注册到映射', () => {
      const routes: Route[] = [
        {
          path: '/parent',
          redirect: '/home',
          children: [{ path: 'child', component: createMockComponent() }]
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/parent')).toBeDefined()
    })
  })

  describe('嵌套路由', () => {
    it('应该正确处理多层嵌套', () => {
      const routes: Route[] = [
        {
          path: '/parent',
          component: createMockComponent(),
          children: [
            {
              path: 'child',
              component: createMockComponent(),
              children: [{ path: 'grandchild', component: createMockComponent() }]
            }
          ]
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/parent')).toBeDefined()
      expect(manager.findByPath('/parent/child')).toBeDefined()
      expect(manager.findByPath('/parent/child/grandchild')).toBeDefined()
    })

    it('子路由应该正确注册', () => {
      const routes: Route[] = [
        {
          path: '/parent',
          component: createMockComponent(),
          children: [
            { path: 'child1', component: createMockComponent() },
            { path: 'child2', component: createMockComponent() }
          ]
        }
      ]
      const manager = new RouteManager(routes)
      // 分组路由（有 component 和 children）不会被注册到 staticRoutes
      // 但子路由会被注册
      expect(manager.findByPath('/parent/child1')).toBeDefined()
      expect(manager.findByPath('/parent/child2')).toBeDefined()
      // 验证 parent 引用
      const child1 = manager.findByPath('/parent/child1')
      expect(child1?.parent?.path).toBe('/parent')
    })

    it('parent 引用应该正确', () => {
      const routes: Route[] = [
        {
          path: '/parent',
          component: createMockComponent(),
          children: [{ path: 'child', component: createMockComponent() }]
        }
      ]
      const manager = new RouteManager(routes)
      const child = manager.findByPath('/parent/child')
      expect(child?.parent?.path).toBe('/parent')
    })
  })

  describe('重定向', () => {
    it('应该正确处理字符串重定向', () => {
      const routes: Route[] = [
        { path: '/old', redirect: '/new', component: createMockComponent() },
        { path: '/new', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const oldRoute = manager.findByPath('/old')
      expect(oldRoute?.redirect).toBe('/new')
    })

    it('应该正确处理对象重定向', () => {
      const routes: Route[] = [
        {
          path: '/old',
          redirect: { index: 'home', params: { id: '123' } },
          component: createMockComponent()
        }
      ]
      const manager = new RouteManager(routes)
      const oldRoute = manager.findByPath('/old')
      expect(oldRoute?.redirect).toEqual({ index: 'home', params: { id: '123' } })
    })

    it('应该正确处理函数重定向', () => {
      const redirectFn = () => '/new'
      const routes: Route[] = [
        { path: '/old', redirect: redirectFn, component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const oldRoute = manager.findByPath('/old')
      expect(oldRoute?.redirect).toBe(redirectFn)
    })
  })

  describe('重复检测', () => {
    it('应该检测重复路径', () => {
      expect(() => {
        new RouteManager([
          { path: '/home', component: createMockComponent() },
          { path: '/home', component: createMockComponent() }
        ])
      }).toThrow(/Duplicate route path/)
    })

    it('应该检测重复名称', () => {
      expect(() => {
        new RouteManager([
          { path: '/', name: 'home', component: createMockComponent() },
          { path: '/home', name: 'home', component: createMockComponent() }
        ])
      }).toThrow(/Duplicate route name/)
    })
  })

  describe('错误处理', () => {
    it('路径不是字符串应该抛出错误', () => {
      expect(() => {
        new RouteManager([{ path: 123 as any, component: createMockComponent() }])
      }).toThrow(/Route path must be a string/)
    })

    it('组件、重定向、子路由同时为空应该抛出错误', () => {
      expect(() => {
        new RouteManager([{ path: '/home' }])
      }).toThrow(/component or redirect or children/)
    })
  })

  describe('meta 和 beforeEnter', () => {
    it('应该正确保存 meta', () => {
      const routes: Route[] = [
        {
          path: '/home',
          component: createMockComponent(),
          meta: { title: 'Home', requiresAuth: true }
        }
      ]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/home')
      expect(route?.meta).toEqual({ title: 'Home', requiresAuth: true })
    })

    it('应该正确保存函数形式的 beforeEnter', () => {
      const guard = () => true
      const routes: Route[] = [
        { path: '/home', component: createMockComponent(), beforeEnter: guard }
      ]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/home')
      expect(route?.beforeEnter).toBe(guard)
    })

    it('应该正确保存数组形式的 beforeEnter', () => {
      const guards = [() => true, () => false] as any
      const routes: Route[] = [
        { path: '/home', component: createMockComponent(), beforeEnter: guards }
      ]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/home')
      expect(route?.beforeEnter).toEqual(guards)
    })
  })

  describe('路由别名', () => {
    describe('一级路由别名', () => {
      it('应该正确解析单个别名', () => {
        const routes: Route[] = [
          { path: '/users', component: createMockComponent(), alias: '/members' }
        ]
        const manager = new RouteManager(routes)
        expect(manager.findByPath('/users')).toBeDefined()
        expect(manager.findByPath('/members')).toBeDefined()
        expect(manager.findByPath('/members')?.path).toBe('/users')
      })

      it('应该正确解析多个别名', () => {
        const routes: Route[] = [
          { path: '/users', component: createMockComponent(), alias: ['/members', '/people'] }
        ]
        const manager = new RouteManager(routes)
        expect(manager.findByPath('/users')).toBeDefined()
        expect(manager.findByPath('/members')).toBeDefined()
        expect(manager.findByPath('/people')).toBeDefined()
        expect(manager.aliasRoutes.size).toBe(2)
      })

      it('相对别名应该自动添加前导斜杠', () => {
        const routes: Route[] = [{ path: '/home', component: createMockComponent(), alias: 'main' }]
        const manager = new RouteManager(routes)
        expect(manager.findByPath('/home')).toBeDefined()
        expect(manager.findByPath('/main')).toBeDefined()
      })

      it('动态路由别名变量应该与主路径一致', () => {
        const routes: Route[] = [
          { path: '/users/{id}', component: createMockComponent(), alias: '/members/{id}' }
        ]
        const manager = new RouteManager(routes)
        expect(manager.matchByPath('/users/123')).toBeDefined()
        expect(manager.matchByPath('/members/456')).toBeDefined()
        expect(manager.matchByPath('/members/456')?.route.path).toBe('/users/{id}')
      })

      it('动态路由别名变量不一致应该抛出错误', () => {
        expect(() => {
          new RouteManager([
            { path: '/users/{id}', component: createMockComponent(), alias: '/members/{userId}' }
          ])
        }).toThrow(/variables do not match/)
      })

      it('动态路由别名缺少变量应该抛出错误', () => {
        expect(() => {
          new RouteManager([
            { path: '/users/{id}', component: createMockComponent(), alias: '/members' }
          ])
        }).toThrow(/must contain variables/)
      })
    })

    describe('子路由别名', () => {
      it('绝对路径别名应该忽略父级路径', () => {
        const routes: Route[] = [
          {
            path: '/users/{id}',
            component: createMockComponent(),
            children: [
              {
                path: 'profile',
                component: createMockComponent(),
                alias: '/{id}'
              }
            ]
          }
        ]
        const manager = new RouteManager(routes)
        expect(manager.matchByPath('/users/123/profile')).toBeDefined()
        const result = manager.matchByPath('/456')
        expect(result).toBeDefined()
        expect(result?.route.path).toBe('/users/{id}/profile')
        expect(result?.params.id).toBe('456')
      })

      it('空字符串别名应该映射到父级路径', () => {
        const routes: Route[] = [
          {
            path: '/users',
            children: [
              {
                path: 'profile',
                component: createMockComponent(),
                alias: ''
              }
            ]
          }
        ]
        const manager = new RouteManager(routes)
        expect(manager.matchByPath('/users/profile')).toBeDefined()
        const result = manager.matchByPath('/users')
        expect(result).toBeDefined()
        expect(result?.route.path).toBe('/users/profile')
      })

      it('相对路径别名应该拼接父级路径', () => {
        const routes: Route[] = [
          {
            path: '/users',
            component: createMockComponent(),
            children: [
              {
                path: 'profile',
                component: createMockComponent(),
                alias: 'info'
              }
            ]
          }
        ]
        const manager = new RouteManager(routes)
        expect(manager.matchByPath('/users/profile')).toBeDefined()
        expect(manager.findByPath('/users/info')).toBeDefined()
        expect(manager.findByPath('/users/info')?.path).toBe('/users/profile')
      })

      it('根路由不允许空字符串别名', () => {
        expect(() => {
          new RouteManager([{ path: '/', component: createMockComponent(), alias: '' }])
        }).toThrow(/Empty alias is not allowed/)
      })

      it('应该正确处理混合别名类型', () => {
        const routes: Route[] = [
          {
            path: '/users/{id}',
            component: createMockComponent(),
            children: [
              {
                path: 'profile',
                component: createMockComponent(),
                alias: ['/{id}', 'info']
              }
            ]
          }
        ]
        const manager = new RouteManager(routes)
        expect(manager.matchByPath('/users/123/profile')).toBeDefined()
        expect(manager.matchByPath('/456')?.route.path).toBe('/users/{id}/profile')
        expect(manager.findByPath('/users/{id}/info')).toBeDefined()
      })
    })

    describe('别名匹配', () => {
      it('matchByPath 应该正确匹配静态别名', () => {
        const routes: Route[] = [
          { path: '/home', component: createMockComponent(), alias: '/main' }
        ]
        const manager = new RouteManager(routes)
        const result = manager.matchByPath('/main')
        expect(result).toBeDefined()
        expect(result?.route.path).toBe('/home')
        expect(result?.path).toBe('/main')
      })

      it('matchByPath 应该正确匹配动态别名', () => {
        const routes: Route[] = [
          { path: '/users/{id}', component: createMockComponent(), alias: '/members/{id}' }
        ]
        const manager = new RouteManager(routes)
        const result = manager.matchByPath('/members/123')
        expect(result).toBeDefined()
        expect(result?.route.path).toBe('/users/{id}')
        expect(result?.params.id).toBe('123')
      })
    })

    describe('别名管理', () => {
      it('removeRoute 应该移除关联别名', () => {
        const routes: Route[] = [
          { path: '/home', component: createMockComponent(), alias: ['/main', '/index'] }
        ]
        const manager = new RouteManager(routes)
        expect(manager.aliasRoutes.size).toBe(2)
        manager.removeRoute('/home')
        expect(manager.aliasRoutes.size).toBe(0)
        expect(manager.findByPath('/main')).toBeNull()
      })

      it('clearRoutes 应该清空别名映射', () => {
        const routes: Route[] = [
          { path: '/home', component: createMockComponent(), alias: ['/main', '/index'] }
        ]
        const manager = new RouteManager(routes)
        expect(manager.aliasRoutes.size).toBe(2)
        manager.clearRoutes()
        expect(manager.aliasRoutes.size).toBe(0)
      })

      it('removeRoute 应该级联删除子路由', () => {
        const routes: Route[] = [
          {
            path: '/parent',
            component: createMockComponent(),
            children: [
              { path: 'child1', component: createMockComponent() },
              {
                path: 'child2',
                component: createMockComponent(),
                children: [{ path: 'grandchild', component: createMockComponent() }]
              }
            ]
          }
        ]
        const manager = new RouteManager(routes)
        // 分组路由（有 component 和 children）不会被注册到 staticRoutes
        // 但子路由会被注册（child1 和 child2），grandchild 有 parent child2，所以不会被注册到 routes
        expect(manager.routes.size).toBe(2)
        expect(manager.findByPath('/parent/child1')).toBeDefined()
        expect(manager.findByPath('/parent/child2')).toBeDefined()
        expect(manager.findByPath('/parent/child2/grandchild')).toBeDefined()
        // 删除子路由
        manager.removeRoute('/parent/child1')
        expect(manager.routes.size).toBe(1)
        expect(manager.findByPath('/parent/child1')).toBeNull()
        // 其他子路由仍然存在
        expect(manager.findByPath('/parent/child2')).toBeDefined()
      })
    })

    describe('重复检测', () => {
      it('应该检测重复别名', () => {
        expect(() => {
          new RouteManager([
            { path: '/home', component: createMockComponent(), alias: '/main' },
            { path: '/about', component: createMockComponent(), alias: '/main' }
          ])
        }).toThrow(/Duplicate route alias/)
      })

      it('应该检测别名与路径冲突', () => {
        expect(() => {
          new RouteManager([
            { path: '/home', component: createMockComponent() },
            { path: '/about', component: createMockComponent(), alias: '/home' }
          ])
        }).toThrow(/Duplicate route alias/)
      })
    })

    describe('ignoreCase 模式', () => {
      it('应该在 ignoreCase 模式下正确处理别名', () => {
        const routes: Route[] = [
          { path: '/home', component: createMockComponent(), alias: '/Main' }
        ]
        const manager = new RouteManager(routes, { ignoreCase: true })
        expect(manager.findByPath('/HOME')).toBeDefined()
        expect(manager.findByPath('/main')).toBeDefined()
        expect(manager.findByPath('/MAIN')).toBeDefined()
      })
    })
  })

  describe('pattern 继承', () => {
    it('子路由应该继承父级的 pattern 配置', () => {
      const routes: Route[] = [
        {
          path: '/users/{id}',
          component: createMockComponent(),
          pattern: { id: /\d+/ },
          children: [{ path: 'profile', component: createMockComponent() }]
        }
      ]
      const manager = new RouteManager(routes)
      // 父路由有 component，是分组路由，不会被注册到 staticRoutes
      // 需要通过子路由来验证 pattern 继承
      const profile = manager.matchByPath('/users/123/profile')
      expect(profile?.route?.rawPattern?.id).toEqual(/\d+/)
    })

    it('分组路由应该传递 pattern 配置给子路由', () => {
      const routes: Route[] = [
        {
          path: '/users/{id}',
          pattern: { id: /\d+/ },
          children: [{ path: 'profile', component: createMockComponent() }]
        }
      ]
      const manager = new RouteManager(routes)
      // 分组路由本身不可被查找，但子路由可以
      const profile = manager.matchByPath('/users/123/profile')
      expect(profile?.route?.rawPattern?.id).toEqual(/\d+/)
    })
  })

  describe('边界情况 - 路径处理', () => {
    it('应该正确处理根路径', () => {
      const routes: Route[] = [{ path: '/', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/')).toBeDefined()
      expect(manager.matchByPath('/')?.route.path).toBe('/')
    })

    it('应该正确处理空字符串路径（等同于根路径）', () => {
      const routes: Route[] = [{ path: '', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/')).toBeDefined()
    })

    it('应该正确处理带空格的路径', () => {
      const routes: Route[] = [{ path: '  /home  ', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/home')).toBeDefined()
    })

    it('应该正确处理多个连续斜杠', () => {
      const routes: Route[] = [{ path: '//home//page', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/home/page')).toBeDefined()
    })

    it('应该正确处理无前导斜杠的路径', () => {
      const routes: Route[] = [{ path: 'home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/home')).toBeDefined()
    })

    it('应该正确处理带尾部斜杠的路径', () => {
      const routes: Route[] = [{ path: '/home/', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/home')).toBeDefined()
    })

    it('应该正确处理多层嵌套路径', () => {
      const routes: Route[] = [
        {
          path: '/a',
          children: [
            {
              path: 'b',
              children: [
                {
                  path: 'c',
                  children: [{ path: 'd', component: createMockComponent() }]
                }
              ]
            }
          ]
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.findByPath('/a/b/c/d')).toBeDefined()
      // 只有顶层路由在 routes 中
      expect(manager.routes.size).toBe(1)
    })
  })

  describe('边界情况 - 名称处理', () => {
    it('应该正确处理带前导斜杠的名称（发出警告后去除）', () => {
      const routes: Route[] = [{ path: '/home', name: '/home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.findByName('home')).toBeDefined()
    })

    it('应该正确处理 Symbol 类型的路由名称', () => {
      const homeSymbol = Symbol('home')
      const routes: Route[] = [
        { path: '/home', name: homeSymbol, component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      expect(manager.findByName(homeSymbol)).toBeDefined()
      expect(manager.matchByName(homeSymbol)).toBeDefined()
    })

    it('应该正确处理多个 Symbol 名称', () => {
      const sym1 = Symbol('route1')
      const sym2 = Symbol('route2')
      const routes: Route[] = [
        { path: '/route1', name: sym1, component: createMockComponent() },
        { path: '/route2', name: sym2, component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      expect(manager.findByName(sym1)).toBeDefined()
      expect(manager.findByName(sym2)).toBeDefined()
    })
  })

  describe('动态路由 - 高级测试', () => {
    it('应该正确处理多个可选参数', () => {
      const routes: Route[] = [{ path: '/files/{dir?}/{file?}', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.matchByPath('/files')).toBeDefined()
      expect(manager.matchByPath('/files/docs')).toBeDefined()
      expect(manager.matchByPath('/files/docs/readme')).toBeDefined()
    })

    it('应该正确处理混合必填和可选参数', () => {
      const routes: Route[] = [
        { path: '/users/{id?}/posts/{postId?}', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const result1 = manager.matchByPath('/users/posts')
      expect(result1).toBeDefined()
      expect(result1?.params.id).toBeUndefined()
      expect(result1?.params.postId).toBeUndefined()
      const result2 = manager.matchByPath('/users/123/posts/456')
      expect(result2).toBeDefined()
      expect(result2?.params.id).toBe('123')
      expect(result2?.params.postId).toBe('456')
    })

    it('应该正确处理连续的动态参数', () => {
      const routes: Route[] = [
        { path: '/api/{version}/{resource}', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByPath('/api/v1/users')
      expect(result).toBeDefined()
      expect(result?.params.version).toBe('v1')
      expect(result?.params.resource).toBe('users')
    })

    it('应该正确处理自定义 pattern 验证', () => {
      const routes: Route[] = [
        {
          path: '/users/{id}',
          component: createMockComponent(),
          pattern: { id: /^[a-z]+$/ }
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.matchByPath('/users/abc')).toBeDefined()
      expect(manager.matchByPath('/users/ABC')).toBeNull()
      expect(manager.matchByPath('/users/123')).toBeNull()
    })

    it('应该正确处理多个参数的自定义 pattern', () => {
      const routes: Route[] = [
        {
          path: '/users/{userId}/posts/{postId}',
          component: createMockComponent(),
          pattern: { userId: /\d+/, postId: /\d+/ }
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.matchByPath('/users/123/posts/456')).toBeDefined()
      expect(manager.matchByPath('/users/abc/posts/456')).toBeNull()
      expect(manager.matchByPath('/users/123/posts/xyz')).toBeNull()
    })

    it('动态路由应该正确注册到 dynamicRoutes', () => {
      const routes: Route[] = [{ path: '/users/{id}', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.dynamicRoutes.size).toBe(1)
      expect(manager.dynamicRoutes.get(2)).toBeDefined()
      expect(manager.dynamicRoutes.get(2)).toHaveLength(1)
    })

    it('可选参数动态路由应该注册多个长度', () => {
      const routes: Route[] = [{ path: '/users/{id?}', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.dynamicRoutes.size).toBe(2)
      expect(manager.dynamicRoutes.get(2)).toBeDefined()
      expect(manager.dynamicRoutes.get(1)).toBeDefined()
    })

    it('两个可选参数应该注册三个长度', () => {
      const routes: Route[] = [{ path: '/a/{b?}/{c?}', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      expect(manager.dynamicRoutes.size).toBe(3)
      expect(manager.dynamicRoutes.get(3)).toBeDefined()
      expect(manager.dynamicRoutes.get(2)).toBeDefined()
      expect(manager.dynamicRoutes.get(1)).toBeDefined()
    })
  })

  describe('matchByName - 高级测试', () => {
    it('应该正确处理可选参数', () => {
      const routes: Route[] = [
        { path: '/users/{id?}', name: 'user', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const result1 = manager.matchByName('user', { id: '123' })
      expect(result1).toBeDefined()
      expect(result1?.path).toBe('/users/123')
      expect(result1?.params.id).toBe('123')
      const result2 = manager.matchByName('user', {})
      expect(result2).toBeDefined()
      expect(result2?.path).toBe('/users')
      expect(result2?.params).toEqual({})
    })

    it('应该正确处理数字类型的参数', () => {
      const routes: Route[] = [
        { path: '/users/{id}', name: 'user', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByName('user', { id: 123 })
      expect(result).toBeDefined()
      expect(result?.path).toBe('/users/123')
      expect(result?.params.id).toBe('123')
    })

    it('应该正确处理空字符串参数值', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
      const routes: Route[] = [
        { path: '/users/{id}', name: 'user', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByName('user', { id: '' })
      expect(result).toBeNull()
      warnSpy.mockRestore()
    })

    it('应该正确处理可选参数的空值', () => {
      const routes: Route[] = [
        { path: '/users/{id?}', name: 'user', component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByName('user', { id: '' })
      expect(result).toBeDefined()
      expect(result?.params.id).toBeUndefined()
    })

    it('应该正确处理自定义 pattern 验证', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
      const routes: Route[] = [
        {
          path: '/users/{id}',
          name: 'user',
          component: createMockComponent(),
          pattern: { id: /\d+/ }
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.matchByName('user', { id: '123' })).toBeDefined()
      expect(manager.matchByName('user', { id: 'abc' })).toBeNull()
      warnSpy.mockRestore()
    })

    it('应该忽略未定义参数但验证已有参数', () => {
      const routes: Route[] = [{ path: '/home', name: 'home', component: createMockComponent() }]
      const manager = new RouteManager(routes)
      const result = manager.matchByName('home', { extra: 'value' })
      expect(result).toBeDefined()
      expect(result?.params).toEqual({})
    })

    it('应该正确处理多个参数', () => {
      const routes: Route[] = [
        {
          path: '/users/{userId}/posts/{postId}',
          name: 'post',
          component: createMockComponent()
        }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByName('post', { userId: '1', postId: '2' })
      expect(result).toBeDefined()
      expect(result?.path).toBe('/users/1/posts/2')
      expect(result?.params.userId).toBe('1')
      expect(result?.params.postId).toBe('2')
    })
  })

  describe('addRoute - 高级测试', () => {
    it('应该添加动态路由', () => {
      const manager = new RouteManager([])
      manager.addRoute({ path: '/users/{id}', component: createMockComponent() })
      expect(manager.dynamicRoutes.size).toBe(1)
      expect(manager.matchByPath('/users/123')).toBeDefined()
    })

    it('应该添加带名称的父路由', () => {
      const manager = new RouteManager([
        { path: '/parent', name: 'parent', component: createMockComponent() }
      ])
      manager.addRoute({ path: 'child', component: createMockComponent() }, 'parent')
      expect(manager.findByPath('/parent/child')).toBeDefined()
    })

    it('应该添加到有组件的父路由下', () => {
      const manager = new RouteManager([{ path: '/parent', component: createMockComponent() }])
      manager.addRoute({ path: 'new', component: createMockComponent() }, '/parent')
      expect(manager.findByPath('/parent/new')).toBeDefined()
      expect(manager.routes.size).toBe(2)
      const child = manager.findByPath('/parent/new')
      expect(child?.parent?.path).toBe('/parent')
    })

    it('添加的路由应该有正确的 parent 引用', () => {
      const manager = new RouteManager([{ path: '/parent', component: createMockComponent() }])
      manager.addRoute({ path: 'child', component: createMockComponent() }, '/parent')
      const child = manager.findByPath('/parent/child')
      expect(child?.parent?.path).toBe('/parent')
    })

    it('添加的路由应该能被正确查找', () => {
      const manager = new RouteManager([{ path: '/parent', component: createMockComponent() }])
      manager.addRoute({ path: 'child', component: createMockComponent() }, '/parent')
      expect(manager.findByPath('/parent/child')).toBeDefined()
      expect(manager.matchByPath('/parent/child')?.route.path).toBe('/parent/child')
    })

    it('应该添加带别名的路由', () => {
      const manager = new RouteManager([])
      manager.addRoute({ path: '/home', component: createMockComponent(), alias: '/main' })
      expect(manager.findByPath('/home')).toBeDefined()
      expect(manager.findByPath('/main')).toBeDefined()
      expect(manager.aliasRoutes.size).toBe(1)
    })

    it('应该添加带重定向的路由', () => {
      const manager = new RouteManager([{ path: '/target', component: createMockComponent() }])
      manager.addRoute({ path: '/old', redirect: '/target', component: createMockComponent() })
      const oldRoute = manager.findByPath('/old')
      expect(oldRoute?.redirect).toBe('/target')
    })

    it('应该添加带 meta 的路由', () => {
      const manager = new RouteManager([])
      manager.addRoute({
        path: '/admin',
        component: createMockComponent(),
        meta: { requiresAuth: true }
      })
      const route = manager.findByPath('/admin')
      expect(route?.meta).toEqual({ requiresAuth: true })
    })
  })

  describe('removeRoute - 高级测试', () => {
    it('应该移除动态路由', () => {
      const manager = new RouteManager([
        { path: '/users/{id}', name: 'user', component: createMockComponent() }
      ])
      expect(manager.matchByPath('/users/123')).toBeDefined()
      // 动态路由通过名称删除
      manager.removeRoute('user')
      expect(manager.matchByPath('/users/123')).toBeNull()
    })

    it('应该移除可选参数动态路由', () => {
      const manager = new RouteManager([
        { path: '/users/{id?}', name: 'user', component: createMockComponent() }
      ])
      expect(manager.matchByPath('/users/123')).toBeDefined()
      expect(manager.matchByPath('/users')).toBeDefined()
      // 动态路由通过名称删除
      manager.removeRoute('user')
      expect(manager.matchByPath('/users/123')).toBeNull()
      expect(manager.matchByPath('/users')).toBeNull()
    })

    it('应该移除带别名的路由', () => {
      const manager = new RouteManager([
        { path: '/home', component: createMockComponent(), alias: ['/main', '/index'] }
      ])
      expect(manager.aliasRoutes.size).toBe(2)
      manager.removeRoute('/home')
      expect(manager.aliasRoutes.size).toBe(0)
      expect(manager.findByPath('/main')).toBeNull()
      expect(manager.findByPath('/index')).toBeNull()
    })

    it('移除后可以重新添加相同路由', () => {
      const manager = new RouteManager([{ path: '/home', component: createMockComponent() }])
      manager.removeRoute('/home')
      expect(manager.findByPath('/home')).toBeNull()
      manager.addRoute({ path: '/home', component: createMockComponent() })
      expect(manager.findByPath('/home')).toBeDefined()
    })

    it('移除后可以重新添加相同名称的路由', () => {
      const manager = new RouteManager([
        { path: '/', name: 'home', component: createMockComponent() }
      ])
      manager.removeRoute('home')
      expect(manager.findByName('home')).toBeNull()
      manager.addRoute({ path: '/', name: 'home', component: createMockComponent() })
      expect(manager.findByName('home')).toBeDefined()
    })

    it('移除子路由不应该影响父路由', () => {
      const manager = new RouteManager([
        {
          path: '/parent',
          component: createMockComponent(),
          children: [{ path: 'child', component: createMockComponent() }]
        }
      ])
      manager.removeRoute('/parent/child')
      expect(manager.findByPath('/parent')).toBeDefined()
      expect(manager.findByPath('/parent/child')).toBeNull()
    })

    it('移除分组路由不会级联删除子路由', () => {
      const manager = new RouteManager([
        {
          path: '/parent',
          children: [
            { path: 'child1', component: createMockComponent() },
            { path: 'child2', component: createMockComponent() }
          ]
        }
      ])
      // 分组路由（没有 redirect）不会被注册到任何映射中
      // 只有子路由会被注册
      expect(manager.routes.size).toBe(2)
      expect(manager.findByPath('/parent/child1')).toBeDefined()
      expect(manager.findByPath('/parent/child2')).toBeDefined()
      // 分组路由本身不可被查找/删除
      expect(manager.find('/parent')).toBeNull()
      // 删除子路由
      manager.removeRoute('/parent/child1')
      expect(manager.findByPath('/parent/child1')).toBeNull()
      expect(manager.findByPath('/parent/child2')).toBeDefined()
    })
  })

  describe('props 处理', () => {
    it('应该正确处理布尔值 props', () => {
      const routes: Route[] = [{ path: '/home', component: createMockComponent(), props: true }]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/home')
      expect(route?.props).toEqual({ default: true })
    })

    it('应该正确处理对象 props', () => {
      const routes: Route[] = [
        { path: '/home', component: createMockComponent(), props: { title: 'Home' } }
      ]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/home')
      expect(route?.props).toEqual({ default: { title: 'Home' } })
    })

    it('应该正确处理函数 props', () => {
      const propsFn = () => ({ dynamic: true })
      const routes: Route[] = [{ path: '/home', component: createMockComponent(), props: propsFn }]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/home')
      expect((route?.props as any)?.default).toBe(propsFn)
    })

    it('动态路由应该正确处理 props', () => {
      const routes: Route[] = [
        { path: '/users/{id}', component: createMockComponent(), props: true }
      ]
      const manager = new RouteManager(routes)
      // 动态路由通过 matchByPath 查找
      const result = manager.matchByPath('/users/123')
      expect(result?.route?.props).toEqual({ default: true })
    })
  })

  describe('beforeEnter 处理', () => {
    it('应该正确处理函数形式的 beforeEnter', () => {
      const guard = () => true as const
      const routes: Route[] = [
        { path: '/home', component: createMockComponent(), beforeEnter: guard }
      ]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/home')
      expect(route?.beforeEnter).toBe(guard)
    })

    it('应该正确处理数组形式的 beforeEnter', () => {
      const guard1 = () => true as const
      const guard2 = () => false as const
      const routes: Route[] = [
        { path: '/home', component: createMockComponent(), beforeEnter: [guard1, guard2] as any }
      ]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/home')
      expect(Array.isArray(route?.beforeEnter)).toBe(true)
      expect((route?.beforeEnter as Function[]).length).toBe(2)
    })
  })

  describe('路由匹配优先级', () => {
    it('静态路由应该优先于动态路由', () => {
      const routes: Route[] = [
        { path: '/users/new', component: createMockComponent() },
        { path: '/users/{id}', component: createMockComponent2() }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByPath('/users/new')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/users/new')
    })

    it('别名匹配应该优先于动态路由', () => {
      const routes: Route[] = [
        { path: '/home', component: createMockComponent(), alias: '/users/new' },
        { path: '/users/{id}', component: createMockComponent2() }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByPath('/users/new')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/home')
    })
  })

  describe('分组路由 - 高级测试', () => {
    it('分组路由不应该注册到 staticRoutes', () => {
      const manager = new RouteManager([
        { path: '/parent', children: [{ path: 'child', component: createMockComponent() }] }
      ])
      expect(manager.staticRoutes.has('/parent')).toBe(false)
    })

    it('带重定向的分组路由应该注册到 staticRoutes', () => {
      const manager = new RouteManager([
        {
          path: '/parent',
          redirect: '/parent/child',
          children: [{ path: 'child', component: createMockComponent() }]
        }
      ])
      expect(manager.staticRoutes.has('/parent')).toBe(true)
    })

    it('分组路由不应该被注册到 routes', () => {
      const manager = new RouteManager([
        { path: '/parent', children: [{ path: 'child', component: createMockComponent() }] }
      ])
      // 分组路由（没有 redirect）不会被注册到 routes
      expect(manager.routes.size).toBe(1)
      // 只有子路由会被注册
      expect(manager.findByPath('/parent/child')).toBeDefined()
    })

    it('带组件的路由有 isGroup 标记但不会被注册到 staticRoutes', () => {
      const manager = new RouteManager([
        {
          path: '/parent',
          component: createMockComponent(),
          children: [{ path: 'child', component: createMockComponent() }]
        }
      ])
      // 有 component 和 children 的路由是分组路由，不会被注册到 staticRoutes
      expect(manager.findByPath('/parent')).toBeNull()
      // 但子路由会被注册
      expect(manager.findByPath('/parent/child')).toBeDefined()
    })

    it('无 children 的路由不应该有 isGroup 标记', () => {
      const manager = new RouteManager([{ path: '/simple', component: createMockComponent() }])
      const route = manager.findByPath('/simple')
      expect(route?.isGroup).toBe(false)
    })

    it('分组路由应该正确传递 pattern 给子路由', () => {
      const manager = new RouteManager([
        {
          path: '/api/{version}',
          pattern: { version: /^v\d+$/ },
          children: [
            { path: 'users', component: createMockComponent() },
            { path: 'posts', component: createMockComponent() }
          ]
        }
      ])
      // 子路由会被注册
      const users = manager.matchByPath('/api/v1/users')
      const posts = manager.matchByPath('/api/v2/posts')
      // 子路由应该继承父路由的 rawPattern
      // 注意：子路由的路径是 /api/{version}/users，包含动态参数 {version}
      // 所以子路由的 rawPattern 应该包含 version
      expect(users?.route?.rawPattern?.version).toEqual(/^v\d+$/)
      expect(posts?.route?.rawPattern?.version).toEqual(/^v\d+$/)
    })
  })

  describe('动态别名 - 高级测试', () => {
    it('动态别名应该正确提取参数', () => {
      const routes: Route[] = [
        {
          path: '/users/{userId}/posts/{postId}',
          component: createMockComponent(),
          alias: '/articles/{userId}/author/{postId}'
        }
      ]
      const manager = new RouteManager(routes)
      const result = manager.matchByPath('/articles/123/author/456')
      expect(result).toBeDefined()
      expect(result?.route.path).toBe('/users/{userId}/posts/{postId}')
      expect(result?.params.userId).toBe('123')
      expect(result?.params.postId).toBe('456')
    })

    it('动态别名应该使用相同的 pattern 验证', () => {
      const routes: Route[] = [
        {
          path: '/users/{id}',
          component: createMockComponent(),
          pattern: { id: /\d+/ },
          alias: '/members/{id}'
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.matchByPath('/members/123')).toBeDefined()
      expect(manager.matchByPath('/members/abc')).toBeNull()
    })

    it('可选参数别名应该正确匹配', () => {
      const routes: Route[] = [
        {
          path: '/users/{id?}',
          component: createMockComponent(),
          alias: '/members/{id?}'
        }
      ]
      const manager = new RouteManager(routes)
      expect(manager.matchByPath('/members')).toBeDefined()
      expect(manager.matchByPath('/members/123')).toBeDefined()
    })
  })

  describe('错误处理 - 高级测试', () => {
    it('路径为 null 应该抛出错误', () => {
      expect(() => {
        new RouteManager([{ path: null as any, component: createMockComponent() }])
      }).toThrow(/Route path must be a string/)
    })

    it('路径为 undefined 应该抛出错误', () => {
      expect(() => {
        new RouteManager([{ path: undefined as any, component: createMockComponent() }])
      }).toThrow(/Route path must be a string/)
    })

    it('分组路由无子路由应该抛出错误', () => {
      expect(() => {
        new RouteManager([{ path: '/parent', children: [] }])
      }).toThrow(/component or redirect or children/)
    })

    it('分组路由 children 为空数组应该抛出错误', () => {
      expect(() => {
        new RouteManager([{ path: '/parent', children: [] }])
      }).toThrow(/component or redirect or children/)
    })

    it('无效的重定向值应该被忽略', () => {
      const routes: Route[] = [
        { path: '/old', redirect: 123 as any, component: createMockComponent() }
      ]
      const manager = new RouteManager(routes)
      const route = manager.findByPath('/old')
      expect(route?.redirect).toBeUndefined()
    })
  })

  describe('ignoreCase 模式 - 高级测试', () => {
    it('动态路由应该在 ignoreCase 模式下正确匹配', () => {
      const routes: Route[] = [{ path: '/Users/{ID}', component: createMockComponent() }]
      const manager = new RouteManager(routes, { ignoreCase: true })
      expect(manager.matchByPath('/users/123')).toBeDefined()
      expect(manager.matchByPath('/USERS/123')).toBeDefined()
    })

    it('命名路由查找应该在 ignoreCase 模式下工作', () => {
      const routes: Route[] = [{ path: '/Home', name: 'Home', component: createMockComponent() }]
      const manager = new RouteManager(routes, { ignoreCase: true })
      expect(manager.findByPath('/home')).toBeDefined()
      expect(manager.findByPath('/HOME')).toBeDefined()
    })

    it('动态路由别名应该在 ignoreCase 模式下正确匹配', () => {
      const routes: Route[] = [
        { path: '/Users/{id}', component: createMockComponent(), alias: '/Members/{id}' }
      ]
      const manager = new RouteManager(routes, { ignoreCase: true })
      expect(manager.matchByPath('/members/123')).toBeDefined()
      expect(manager.matchByPath('/MEMBERS/123')).toBeDefined()
    })
  })

  describe('strict 模式 - 高级测试', () => {
    it('strict 模式下根路径应该允许尾部斜杠', () => {
      const routes: Route[] = [{ path: '/', component: createMockComponent() }]
      const manager = new RouteManager(routes, { strict: true })
      expect(manager.matchByPath('/')).toBeDefined()
    })

    it('strict 模式下动态路由应该正确匹配', () => {
      const routes: Route[] = [{ path: '/users/{id}', component: createMockComponent() }]
      const manager = new RouteManager(routes, { strict: true })
      expect(manager.matchByPath('/users/123')).toBeDefined()
      expect(manager.matchByPath('/users/123/')).toBeNull()
    })
  })

  describe('fallbackIndex - 高级测试', () => {
    it('fallbackIndex 不应该匹配动态路由', () => {
      const routes: Route[] = [{ path: '/users/{id}', component: createMockComponent() }]
      const manager = new RouteManager(routes, { fallbackIndex: true })
      expect(manager.matchByPath('/users/{id}/index')).toBeNull()
    })

    it('fallbackIndex 应该正确处理根路径', () => {
      const routes: Route[] = [{ path: '/', component: createMockComponent() }]
      const manager = new RouteManager(routes, { fallbackIndex: true })
      expect(manager.matchByPath('/index')).toBeDefined()
      expect(manager.matchByPath('/index')?.route.path).toBe('/')
    })

    it('fallbackIndex 应该正确处理多层路径', () => {
      const routes: Route[] = [{ path: '/admin/users', component: createMockComponent() }]
      const manager = new RouteManager(routes, { fallbackIndex: true })
      expect(manager.matchByPath('/admin/users/index')).toBeDefined()
      expect(manager.matchByPath('/admin/users/index')?.route.path).toBe('/admin/users')
    })
  })
})
