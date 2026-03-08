/**
 * @fileoverview parsePage 模块测试
 * 
 * 测试页面文件解析功能，包括：
 * - 文件路径解析
 * - 动态参数识别
 * - definePage 宏解析
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parsePageFile, parseDefinePage, extractParamsFromPath } from '../../../src/vite/core/parsePage.js'

// 每个测试使用独立的临时目录
let testDir: string

function setupTestDir(): void {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitarx-router-parse-'))
}

function teardownTestDir(): void {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true })
  }
}

function createPageFile(relativePath: string, content: string = ''): void {
  const fullPath = path.join(testDir, relativePath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(fullPath, content, 'utf-8')
}

describe('parsePageFile', () => {
  beforeEach(() => {
    setupTestDir()
  })

  afterEach(() => {
    teardownTestDir()
  })

  describe('索引文件解析', () => {
    it('应该正确解析根索引文件', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
      expect(result!.name).toBe('')
      expect(result!.isIndex).toBe(true)
      expect(result!.isDynamic).toBe(false)
      expect(result!.params).toEqual([])
    })

    it('应该正确解析嵌套索引文件', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('user/index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'user/index.tsx'), testDir, 'user')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/user')
      expect(result!.name).toBe('user')
      expect(result!.isIndex).toBe(true)
    })

    it('应该正确解析多层嵌套索引文件', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('admin/user/index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'admin/user/index.tsx'), testDir, 'admin/user')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/admin/user')
      expect(result!.name).toBe('admin-user')
      expect(result!.isIndex).toBe(true)
    })
  })

  describe('动态路由解析', () => {
    it('应该正确解析动态参数路由', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('user/[id].tsx', content)
      const result = parsePageFile(path.join(testDir, 'user/[id].tsx'), testDir, 'user')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/user/{id}')
      expect(result!.name).toBe('user-id')
      expect(result!.isIndex).toBe(false)
      expect(result!.isDynamic).toBe(true)
      expect(result!.params).toContain('id')
    })

    it('应该正确解析根级动态路由', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('[slug].tsx', content)
      const result = parsePageFile(path.join(testDir, '[slug].tsx'), testDir, '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/{slug}')
      expect(result!.name).toBe('slug')
      expect(result!.isDynamic).toBe(true)
      expect(result!.params).toContain('slug')
    })
  })

  describe('静态路由解析', () => {
    it('应该正确解析静态路由文件', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('user/settings.tsx', content)
      const result = parsePageFile(path.join(testDir, 'user/settings.tsx'), testDir, 'user')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/user/settings')
      expect(result!.name).toBe('user-settings')
      expect(result!.isIndex).toBe(false)
      expect(result!.isDynamic).toBe(false)
    })

    it('应该正确解析根级静态路由', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('about.tsx', content)
      const result = parsePageFile(path.join(testDir, 'about.tsx'), testDir, '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/about')
      expect(result!.name).toBe('about')
      expect(result!.isIndex).toBe(false)
    })
  })

  describe('不同扩展名', () => {
    it('应该正确解析 .ts 文件', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('index.ts', content)
      const result = parsePageFile(path.join(testDir, 'index.ts'), testDir, '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
    })

    it('应该正确解析 .jsx 文件', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('index.jsx', content)
      const result = parsePageFile(path.join(testDir, 'index.jsx'), testDir, '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
    })

    it('应该正确解析 .js 文件', () => {
      const content = `export default function Page() { return <div>Page</div> }`
      createPageFile('index.js', content)
      const result = parsePageFile(path.join(testDir, 'index.js'), testDir, '')
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
    })
  })
})

describe('parseDefinePage', () => {
  beforeEach(() => {
    setupTestDir()
  })

  afterEach(() => {
    teardownTestDir()
  })

  describe('基本解析', () => {
    it('应该正确解析基本的 definePage 配置', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ name: 'user-detail' })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result).not.toBeNull()
      expect(result!.name).toBe('user-detail')
    })

    it('应该正确解析包含 meta 的配置', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({
          name: 'user-detail',
          meta: { title: '用户详情', requiresAuth: true }
        })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result).not.toBeNull()
      expect(result!.name).toBe('user-detail')
      expect(result!.meta).toEqual({
        title: '用户详情',
        requiresAuth: true
      })
    })
  })

  describe('导入别名支持', () => {
    it('应该正确识别导入别名', () => {
      const content = `
        import { definePage as config } from 'vitarx-router/auto-routes'
        config({ name: 'aliased' })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result).not.toBeNull()
      expect(result!.name).toBe('aliased')
    })
  })

  describe('错误处理', () => {
    it('文件不存在时应返回 null', () => {
      const result = parseDefinePage('/non/existent/file.tsx')
      expect(result).toBeNull()
    })

    it('没有 definePage 时应返回 null', () => {
      createPageFile('test.tsx', 'export default function Page() {}')
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      expect(result).toBeNull()
    })

    it('未导入 definePage 时应发出警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const content = `definePage({ name: 'no-import' })`
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(warnSpy).toHaveBeenCalled()
      expect(result).not.toBeNull()
      
      warnSpy.mockRestore()
    })
  })

  describe('多个 definePage 处理', () => {
    it('应该合并多个 definePage 配置', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ name: 'first' })
        definePage({ meta: { title: 'Second' } })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result).not.toBeNull()
      expect(result!.name).toBe('first')
      expect(result!.meta).toEqual({ title: 'Second' })
      expect(warnSpy).toHaveBeenCalled()
      
      warnSpy.mockRestore()
    })
  })

  describe('meta 属性解析', () => {
    it('应该正确解析字符串类型的 meta 值', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ meta: { title: '首页', description: '网站首页' } })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result!.meta!.title).toBe('首页')
      expect(result!.meta!.description).toBe('网站首页')
    })

    it('应该正确解析布尔类型的 meta 值', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ meta: { requiresAuth: true, cache: false } })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result!.meta!.requiresAuth).toBe(true)
      expect(result!.meta!.cache).toBe(false)
    })

    it('应该正确解析数字类型的 meta 值', () => {
      const content = `
        import { definePage } from 'vitarx-router/auto-routes'
        definePage({ meta: { order: 1, weight: 3.14 } })
      `
      createPageFile('test.tsx', content)
      const result = parseDefinePage(path.join(testDir, 'test.tsx'))
      
      expect(result!.meta!.order).toBe(1)
      expect(result!.meta!.weight).toBe(3.14)
    })
  })
})

describe('extractParamsFromPath', () => {
  it('应该从路径中提取单个参数', () => {
    const params = extractParamsFromPath('/user/{id}')
    expect(params).toEqual(['id'])
  })

  it('应该从路径中提取多个参数', () => {
    const params = extractParamsFromPath('/post/{category}/{slug}')
    expect(params).toEqual(['category', 'slug'])
  })

  it('静态路径应返回空数组', () => {
    const params = extractParamsFromPath('/about')
    expect(params).toEqual([])
  })

  it('根路径应返回空数组', () => {
    const params = extractParamsFromPath('/')
    expect(params).toEqual([])
  })
})

describe('默认导出检测', () => {
  beforeEach(() => {
    setupTestDir()
  })

  afterEach(() => {
    teardownTestDir()
  })

  describe('有效的函数组件导出', () => {
    it('应该识别 export default function 声明', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        export default function Page() {
          return <div>Page</div>
        }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该识别 export default 匿名函数', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        export default function() {
          return <div>Page</div>
        }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该识别 export default 箭头函数', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        export default () => {
          return <div>Page</div>
        }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该识别 export default 类组件', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        export default class Page extends React.Component {
          render() {
            return <div>Page</div>
          }
        }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该识别先声明再导出的函数', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        const Page = () => {
          return <div>Page</div>
        }
        export default Page
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该识别 export { Component as default }', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        const Page = () => {
          return <div>Page</div>
        }
        export { Page as default }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该识别 export function 配合 as default', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        function Page() {
          return <div>Page</div>
        }
        export { Page as default }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })
  })

  describe('无效的导出', () => {
    it('没有默认导出时应跳过并警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        export const Page = () => {
          return <div>Page</div>
        }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()
      expect(warnSpy.mock.calls[0][0]).toContain('未检测到默认导出')

      warnSpy.mockRestore()
    })

    it('默认导出为对象时应跳过并警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        export default {
          name: 'Page'
        }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()
      expect(warnSpy.mock.calls[0][0]).toContain('默认导出不是函数或类')

      warnSpy.mockRestore()
    })

    it('默认导出为字符串时应跳过并警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `export default 'not a component'`
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('默认导出为数字时应跳过并警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `export default 42`
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('没有任何导出时应跳过并警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        const Page = () => {
          return <div>Page</div>
        }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('文件不存在时应跳过并警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = parsePageFile('/non/existent/file.tsx', '/non/existent', '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })
  })

  describe('TypeScript 类型支持', () => {
    it('应该识别带 TypeScript 类型的函数组件', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        import type { FC } from 'react'
        
        const Page: FC = () => {
          return <div>Page</div>
        }
        export default Page
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该识别带 Props 类型的函数组件', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `
        interface Props {
          title: string
        }
        
        export default function Page({ title }: Props) {
          return <div>{title}</div>
        }
      `
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })
  })

  describe('非 JS/TS 文件跳过检测', () => {
    it('应该跳过 .md 文件的默认导出检测', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // .md 文件内容不是有效的 JS，但应该跳过检测
      const content = `# Page Title\n\nThis is markdown content.`
      createPageFile('index.md', content)
      const result = parsePageFile(path.join(testDir, 'index.md'), testDir, '')

      // .md 文件应该正常解析，不进行导出检测
      expect(result).not.toBeNull()
      expect(result!.path).toBe('/')
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该跳过 .vue 文件的默认导出检测', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `<template><div>Page</div></template>`
      createPageFile('index.vue', content)
      const result = parsePageFile(path.join(testDir, 'index.vue'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该跳过 .svelte 文件的默认导出检测', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `<script>export let name;</script><div>{name}</div>`
      createPageFile('index.svelte', content)
      const result = parsePageFile(path.join(testDir, 'index.svelte'), testDir, '')

      expect(result).not.toBeNull()
      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该对 .tsx 文件进行默认导出检测', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // .tsx 文件没有默认导出，应该警告并跳过
      const content = `const Page = () => <div>Page</div>`
      createPageFile('index.tsx', content)
      const result = parsePageFile(path.join(testDir, 'index.tsx'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该对 .ts 文件进行默认导出检测', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `const Page = () => null`
      createPageFile('index.ts', content)
      const result = parsePageFile(path.join(testDir, 'index.ts'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该对 .jsx 文件进行默认导出检测', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `const Page = () => <div>Page</div>`
      createPageFile('index.jsx', content)
      const result = parsePageFile(path.join(testDir, 'index.jsx'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('应该对 .js 文件进行默认导出检测', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const content = `const Page = () => null`
      createPageFile('index.js', content)
      const result = parsePageFile(path.join(testDir, 'index.js'), testDir, '')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })
  })
})
