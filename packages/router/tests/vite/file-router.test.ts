import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { scanPages, buildRouteTree } from '../../src/vite/core/scanPages.js'
import { parsePageFile } from '../../src/vite/core/parsePage.js'
import { generateRoutes, generateRoutesJSON } from '../../src/vite/core/generateRoutes.js'
import { generateTypes, generateFullDtsFile } from '../../src/vite/core/generateTypes.js'
import type { ParsedPage } from '../../src/vite/core/types.js'

const TEST_DIR = path.join(__dirname, '__test_pages__')

function createTestDir(): void {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true })
  }
}

function removeTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true })
  }
}

function createPageFile(relativePath: string, content: string = ''): void {
  const fullPath = path.join(TEST_DIR, relativePath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(fullPath, content, 'utf-8')
}

describe('parsePageFile', () => {
  it('should parse index file correctly', () => {
    const result = parsePageFile('/src/pages/index.tsx', '/src/pages', '')
    expect(result).not.toBeNull()
    expect(result!.path).toBe('/')
    expect(result!.name).toBe('')
    expect(result!.isIndex).toBe(true)
  })

  it('should parse nested index file correctly', () => {
    const result = parsePageFile('/src/pages/user/index.tsx', '/src/pages', 'user')
    expect(result).not.toBeNull()
    expect(result!.path).toBe('/user')
    expect(result!.name).toBe('user')
    expect(result!.isIndex).toBe(true)
  })

  it('should parse dynamic route file correctly', () => {
    const result = parsePageFile('/src/pages/user/[id].tsx', '/src/pages', 'user')
    expect(result).not.toBeNull()
    expect(result!.path).toBe('/user/{id}')
    expect(result!.name).toBe('user-id')
    expect(result!.isIndex).toBe(false)
    expect(result!.isDynamic).toBe(true)
    expect(result!.params).toContain('id')
  })

  it('should parse regular file correctly', () => {
    const result = parsePageFile('/src/pages/user/settings.tsx', '/src/pages', 'user')
    expect(result).not.toBeNull()
    expect(result!.path).toBe('/user/settings')
    expect(result!.name).toBe('user-settings')
    expect(result!.isIndex).toBe(false)
    expect(result!.isDynamic).toBe(false)
  })
})

describe('scanPages', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    removeTestDir()
  })

  it('should return empty array if pages directory does not exist', () => {
    const result = scanPages({
      pagesDir: '/non/existent/path',
      extensions: ['.tsx', '.ts'],
      exclude: []
    })
    expect(result).toEqual([])
  })

  it('should scan pages directory correctly', () => {
    createPageFile('index.tsx')
    createPageFile('user/index.tsx')
    createPageFile('user/[id].tsx')
    createPageFile('about.tsx')

    const result = scanPages({
      pagesDir: TEST_DIR,
      extensions: ['.tsx', '.ts'],
      exclude: []
    })

    expect(result.length).toBe(4)
    const paths = result.map(p => p.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/user')
    expect(paths).toContain('/user/{id}')
    expect(paths).toContain('/about')
  })

  it('should exclude files matching exclude patterns', () => {
    createPageFile('index.tsx')
    createPageFile('admin/index.tsx')

    const result = scanPages({
      pagesDir: TEST_DIR,
      extensions: ['.tsx', '.ts'],
      exclude: ['admin']
    })

    expect(result.length).toBe(1)
    expect(result[0].path).toBe('/')
  })
})

describe('buildRouteTree', () => {
  it('should build route tree with nested routes', () => {
    const pages: ParsedPage[] = [
      {
        path: '/',
        filePath: '/src/pages/index.tsx',
        name: 'home',
        params: [],
        isIndex: true,
        isDynamic: false,
        children: [],
        parentPath: ''
      },
      {
        path: '/user',
        filePath: '/src/pages/user/index.tsx',
        name: 'user',
        params: [],
        isIndex: true,
        isDynamic: false,
        children: [],
        parentPath: 'user'
      },
      {
        path: '/user/{id}',
        filePath: '/src/pages/user/[id].tsx',
        name: 'user-id',
        params: ['id'],
        isIndex: false,
        isDynamic: true,
        children: [],
        parentPath: 'user'
      }
    ]

    const tree = buildRouteTree(pages)
    
    expect(tree.length).toBeGreaterThan(0)
    
    const userRoute = tree.find(r => r.path === '/user')
    expect(userRoute).toBeDefined()
  })
})

describe('generateRoutes', () => {
  it('should generate routes code correctly', () => {
    const pages: ParsedPage[] = [
      {
        path: '/',
        filePath: '/src/pages/index.tsx',
        name: 'home',
        params: [],
        isIndex: true,
        isDynamic: false,
        children: [],
        parentPath: ''
      },
      {
        path: '/user/{id}',
        filePath: '/src/pages/user/[id].tsx',
        name: 'user-id',
        params: ['id'],
        isIndex: false,
        isDynamic: true,
        children: [],
        meta: { title: 'User Detail' },
        parentPath: 'user'
      }
    ]

    const code = generateRoutes(pages)
    
    expect(code).toContain("import { lazy } from 'vitarx'")
    expect(code).toContain("export default [")
    expect(code).toContain("name: 'home'")
    expect(code).toContain("path: '/'")
    expect(code).toContain("name: 'user-id'")
    expect(code).toContain("path: '/user/{id}'")
    expect(code).toContain("meta: {\"title\":\"User Detail\"}")
  })

  it('should generate routes JSON correctly', () => {
    const pages: ParsedPage[] = [
      {
        path: '/',
        filePath: '/src/pages/index.tsx',
        name: 'home',
        params: [],
        isIndex: true,
        isDynamic: false,
        children: [],
        parentPath: ''
      }
    ]

    const routes = generateRoutesJSON(pages)
    
    expect(routes.length).toBe(1)
    expect(routes[0].name).toBe('home')
    expect(routes[0].path).toBe('/')
  })
})

describe('generateTypes', () => {
  it('should generate types correctly', () => {
    const pages: ParsedPage[] = [
      {
        path: '/',
        filePath: '/src/pages/index.tsx',
        name: 'home',
        params: [],
        isIndex: true,
        isDynamic: false,
        children: [],
        parentPath: ''
      },
      {
        path: '/user/{id}',
        filePath: '/src/pages/user/[id].tsx',
        name: 'user-id',
        params: ['id'],
        isIndex: false,
        isDynamic: true,
        children: [],
        parentPath: 'user'
      }
    ]

    const types = generateTypes(pages)
    
    expect(types).toContain('export interface RouteIndexMap')
    expect(types).toContain("'home': {}")
    expect(types).toContain("'user-id': { params: { id: string | number } }")
    expect(types).toContain("'/user/{id}': { params: { id: string | number } }")
  })

  it('should generate full dts file correctly', () => {
    const pages: ParsedPage[] = [
      {
        path: '/',
        filePath: '/src/pages/index.tsx',
        name: 'home',
        params: [],
        isIndex: true,
        isDynamic: false,
        children: [],
        parentPath: ''
      }
    ]

    const dts = generateFullDtsFile(pages)
    
    expect(dts).toContain('// Generated by vitarx-router')
    expect(dts).toContain("declare module 'vitarx-router'")
    expect(dts).toContain('interface RouteIndexMap extends AutoRouteIndexMap')
  })
})
