/**
 * @fileoverview 文件处理器测试
 *
 * 测试 file-processor 模块的核心处理逻辑：
 * - 配置文件处理（processConfigFile）
 * - 布局文件处理（processLayoutFile）
 * - 页面文件处理（processPageFile）
 * - 分组解析（parseGroupResult）
 */
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../../../src/file-router/config/index.js'
import type {
  ProcessorContext,
  ScanDirConfig
} from '../../../src/file-router/manager/file-processor.js'
import {
  parseGroupResult,
  processConfigFile,
  processLayoutFile,
  processPageFile
} from '../../../src/file-router/manager/file-processor.js'
import { extractFileInfo } from '../../../src/file-router/parser/parsePage.js'
import type { FileRouterOptions, ScanNode } from '../../../src/file-router/types/index.js'

function createContext(options: FileRouterOptions = {}): ProcessorContext {
  const config = resolveConfig(options)
  const fileMap = new Map<string, ScanNode>()
  return {
    config,
    fileMap,
    readFile: () => 'export default function Test() { return null }',
    applyPathStrategy: (path: string) => path
  }
}

describe('file-router/manager/file-processor', () => {
  describe('parseGroupResult', () => {
    it('未配置 groupParser 时应使用原始目录名', () => {
      const result = parseGroupResult('users', '/src/pages/users')
      expect(result.routePath).toBe('users')
      expect(result.options).toBeUndefined()
    })

    it('groupParser 返回字符串时应作为路径', () => {
      const parser = (dirName: string) => dirName.replace(/^\d+\./, '')
      const result = parseGroupResult('1.home', '/src/pages/1.home', parser)
      expect(result.routePath).toBe('home')
      expect(result.options).toBeUndefined()
    })

    it('groupParser 返回对象时应提取路径和选项', () => {
      const parser = (dirName: string) => {
        const match = dirName.match(/^(\d+)\.(.+)$/)
        if (match) {
          return { path: match[2], options: { meta: { order: Number(match[1]) } } }
        }
        return dirName
      }
      const result = parseGroupResult('1.home', '/src/pages/1.home', parser)
      expect(result.routePath).toBe('home')
      expect(result.options).toEqual({ meta: { order: 1 } })
    })

    it('groupParser 返回对象但 options 为 undefined 时不应设置选项', () => {
      const parser = () => ({ path: 'custom' })
      const result = parseGroupResult('users', '/src/pages/users', parser)
      expect(result.routePath).toBe('custom')
      expect(result.options).toBeUndefined()
    })
  })

  describe('processConfigFile', () => {
    it('parent 为 undefined 时不应执行任何操作', () => {
      const context = createContext()
      // 不应抛出异常
      processConfigFile('/test/pages/_config.ts', undefined, context)
    })

    it('有 definePage 选项时应合并到父路由并设置 dirConfigFile', () => {
      const context = createContext()
      context.readFile = () => `definePage({ meta: { requiresAuth: true } })`
      const parent: ScanNode = { isGroup: true, filePath: '/test/pages', path: '/pages' }

      processConfigFile('/test/pages/_config.ts', parent, context)

      expect(parent.dirConfigFile).toBe('/test/pages/_config.ts')
      expect(parent.options).toBeDefined()
      expect(context.fileMap.has('/test/pages/_config.ts')).toBe(true)
    })

    it('无 definePage 选项时不应修改父路由', () => {
      const context = createContext()
      context.readFile = () => 'export const config = {}'
      const parent: ScanNode = { isGroup: true, filePath: '/test/pages', path: '/pages' }

      processConfigFile('/test/pages/_config.ts', parent, context)

      expect(parent.dirConfigFile).toBeUndefined()
      expect(context.fileMap.has('/test/pages/_config.ts')).toBe(false)
    })
  })

  describe('processLayoutFile', () => {
    it('parent 为 undefined 时不应执行任何操作', () => {
      const context = createContext()
      const fileInfo = extractFileInfo('/test/pages/_layout.tsx')
      processLayoutFile('/test/pages/_layout.tsx', fileInfo, undefined, context)
    })

    it('有默认导出时应注册布局组件到父路由', () => {
      const context = createContext()
      context.readFile = () => 'export default function Layout() { return null }'
      const fileInfo = extractFileInfo('/test/pages/_layout.tsx')
      const parent: ScanNode = { isGroup: true, filePath: '/test/pages', path: '/pages' }

      processLayoutFile('/test/pages/_layout.tsx', fileInfo, parent, context)

      expect(parent.components).toBeDefined()
      expect(parent.components?.default).toBe('/test/pages/_layout.tsx')
      expect(context.fileMap.has('/test/pages/_layout.tsx')).toBe(true)
    })

    it('无默认导出时不应注册组件但应建立 fileMap 映射', () => {
      const context = createContext()
      context.readFile = () => 'export function Layout() { return null }'
      const fileInfo = extractFileInfo('/test/pages/_layout.tsx')
      const parent: ScanNode = { isGroup: true, filePath: '/test/pages', path: '/pages' }

      processLayoutFile('/test/pages/_layout.tsx', fileInfo, parent, context)

      expect(parent.components).toBeUndefined()
      // 即使无默认导出，fileMap 映射仍应建立
      expect(context.fileMap.has('/test/pages/_layout.tsx')).toBe(true)
    })
  })

  describe('processPageFile', () => {
    it('应创建路由节点并注册到 pageMapping', () => {
      const context = createContext({ root: '/test', pages: 'src/pages' })
      context.readFile = () => 'export default function Home() { return null }'
      const fileInfo = extractFileInfo('/test/src/pages/index.tsx')
      const pageMapping = new Map<string, ScanNode>()
      const page: ScanDirConfig = {
        dir: '/test/src/pages',
        include: ['**/*.{jsx,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/.*'],
        prefix: ''
      }

      const route = processPageFile(
        { filePath: '/test/src/pages/index.tsx', fileInfo, page, pageMapping },
        context
      )

      expect(route).toBeDefined()
      expect(route?.path).toBe('')
      expect(route?.components?.default).toBe('/test/src/pages/index.tsx')
      expect(pageMapping.has('index')).toBe(true)
    })

    it('无默认导出且无重定向时应返回 null', () => {
      const context = createContext({ root: '/test', pages: 'src/pages' })
      context.readFile = () => 'export function Home() { return null }'
      const fileInfo = extractFileInfo('/test/src/pages/index.tsx')
      const pageMapping = new Map<string, ScanNode>()
      const page: ScanDirConfig = {
        dir: '/test/src/pages',
        include: ['**/*.{jsx,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/.*'],
        prefix: ''
      }

      const route = processPageFile(
        { filePath: '/test/src/pages/index.tsx', fileInfo, page, pageMapping },
        context
      )

      expect(route).toBeNull()
    })

    it('同路径已有路由时应合并命名视图', () => {
      const context = createContext({ root: '/test', pages: 'src/pages' })
      context.readFile = () => 'export default function Sidebar() { return null }'
      const fileInfo = extractFileInfo('/test/src/pages/index@sidebar.tsx')
      const existingRoute: ScanNode = {
        isGroup: false,
        filePath: '/test/src/pages/index.tsx',
        path: '',
        components: { default: '/test/src/pages/index.tsx' }
      }
      const pageMapping = new Map<string, ScanNode>([['index', existingRoute]])
      const page: ScanDirConfig = {
        dir: '/test/src/pages',
        include: ['**/*.{jsx,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/.*'],
        prefix: ''
      }

      const route = processPageFile(
        { filePath: '/test/src/pages/index@sidebar.tsx', fileInfo, page, pageMapping },
        context
      )

      // 合并到已有路由，返回 null
      expect(route).toBeNull()
      expect(existingRoute.components?.sidebar).toBe('/test/src/pages/index@sidebar.tsx')
    })

    it('有重定向配置但无默认导出时应创建路由', () => {
      const context = createContext({ root: '/test', pages: 'src/pages' })
      context.readFile = () => `definePage({ redirect: '/home' })\nexport function Test() {}`
      const fileInfo = extractFileInfo('/test/src/pages/test.tsx')
      const pageMapping = new Map<string, ScanNode>()
      const page: ScanDirConfig = {
        dir: '/test/src/pages',
        include: ['**/*.{jsx,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/.*'],
        prefix: ''
      }

      const route = processPageFile(
        { filePath: '/test/src/pages/test.tsx', fileInfo, page, pageMapping },
        context
      )

      expect(route).toBeDefined()
      expect(route?.options?.redirect).toBe('/home')
    })
  })
})
