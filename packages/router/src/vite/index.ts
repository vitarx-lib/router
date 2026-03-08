/**
 * @fileoverview Vite 插件入口模块
 *
 * 这是 vitarx-router 文件路由功能的 Vite 插件主入口。
 * 提供基于文件系统的自动路由生成能力，支持热更新和 TypeScript 类型生成。
 *
 * ## 安装使用
 * ```typescript
 * // vite.config.ts
 * import VitarxRouter from 'vitarx-router/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     VitarxRouter({
 *       pagesDir: 'src/pages',
 *       extensions: ['.tsx', '.ts'],
 *       dts: 'src/auto-router.d.ts'
 *     })
 *   ]
 * })
 * ```
 *
 * ## 虚拟模块
 * - `virtual:vitarx-router:routes` - 自动生成的路由配置
 * - `virtual:vitarx-router:types` - 自动生成的类型定义
 *
 * @module vite
 */
import generate from '@babel/generator'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

import { getAbsolutePagesDirs, isPageFileInDirs, normalizeConfig } from './core/configUtils.js'
import { generateRoutes } from './core/generateRoutes.js'
import { generateFullDtsFile, generateTypes } from './core/generateTypes.js'
import { buildRouteTree, scanMultiplePages } from './core/scanPages.js'
import type { ParsedPage, VitePluginRouterOptions } from './core/types.js'
import { validateOptions } from './core/validateOptions.js'

/** definePage 的有效导入来源 */
const DEFINE_PAGE_SOURCES: string[] = ['vitarx-router/auto-routes']

/** 虚拟模块 ID：路由配置 */
const VIRTUAL_ROUTES_ID = 'virtual:vitarx-router:routes'

/** 虚拟模块 ID：类型定义 */
const VIRTUAL_TYPES_ID = 'virtual:vitarx-router:types'

/** 解析后的路由模块 ID（Vite 内部使用） */
const RESOLVED_ROUTES_ID = '\0' + VIRTUAL_ROUTES_ID

/** 解析后的类型模块 ID（Vite 内部使用） */
const RESOLVED_TYPES_ID = '\0' + VIRTUAL_TYPES_ID

// 导出类型和工具函数
export type { VitePluginRouterOptions, PageOptions } from './core/types.js'
export { definePage } from './auto-routes/definePage.js'

/**
 * 创建 Vitarx Router Vite 插件
 *
 * 该插件会自动扫描指定目录下的页面文件，生成路由配置和 TypeScript 类型定义。
 * 支持开发环境热更新，当页面文件发生变化时自动重新生成路由。
 *
 * @param options - 插件配置选项
 * @param [options.pagesDir] - 页面目录路径，支持字符串、字符串数组或对象数组
 * @param [options.extensions] - 支持的文件扩展名，默认为 ['.tsx', '.ts', '.jsx', '.js']
 * @param [options.exclude] - 要排除的文件/目录模式列表
 * @param [options.dts] - 类型声明文件路径，设为 false 可禁用生成
 * @returns Vite 插件实例
 *
 * @example
 * ```typescript
 * // 基本使用
 * VitarxRouter()
 *
 * // 自定义配置
 * VitarxRouter({
 *   pagesDir: 'src/views',
 *   extensions: ['.tsx', '.vue'],
 *   exclude: ['components', '__tests__'],
 *   dts: 'src/types/router.d.ts'
 * })
 *
 * // 多个目录
 * VitarxRouter({
 *   pagesDir: ['src/pages', 'src/admin']
 * })
 *
 * // 多个目录，每个目录独立配置
 * VitarxRouter({
 *   pagesDir: [
 *     { dir: 'src/pages', exclude: ['components'] },
 *     { dir: 'src/admin', include: ['**\/*.tsx'] }
 *   ]
 * })
 * ```
 */
export default function VitarxRouter(options: VitePluginRouterOptions = {}): Plugin {
  // 验证配置选项
  validateOptions(options)

  // 规范化配置
  const normalizedConfig = normalizeConfig(options)
  const { pagesDirs, extensions, dts } = normalizedConfig

  // 插件内部状态
  let config: ResolvedConfig | null = null
  let pages: ParsedPage[] = []
  let routeTree: ParsedPage[] = []
  let cachedRoutes: string | null = null
  let cachedTypes: string | null = null

  /**
   * 扫描页面目录并构建路由树
   */
  function scanAndBuildRoutes(): void {
    const absolutePagesDirs = getAbsolutePagesDirs(pagesDirs, config)

    // 扫描多个页面目录
    pages = scanMultiplePages({
      pagesDirs: absolutePagesDirs,
      extensions
    })

    // 构建路由树
    routeTree = buildRouteTree(pages)

    // 清空缓存
    cachedRoutes = null
    cachedTypes = null
  }

  /**
   * 获取路由配置代码
   */
  function getRoutesCode(): string {
    if (!cachedRoutes) {
      cachedRoutes = generateRoutes(routeTree)
    }
    return cachedRoutes
  }

  /**
   * 获取类型定义代码
   */
  function getTypesCode(): string {
    if (!cachedTypes) {
      cachedTypes = generateTypes(routeTree)
    }
    return cachedTypes
  }

  /**
   * 写入 .d.ts 类型声明文件
   */
  function writeDtsFile(): void {
    if (dts === false || !config) return

    const dtsPath = path.isAbsolute(dts) ? dts : path.resolve(config.root, dts)
    const dtsDir = path.dirname(dtsPath)

    if (!fs.existsSync(dtsDir)) {
      fs.mkdirSync(dtsDir, { recursive: true })
    }

    const content = generateFullDtsFile(routeTree)
    fs.writeFileSync(dtsPath, content, 'utf-8')

    console.log(`[vitarx-router] 类型定义文件已生成: ${dtsPath}`)
  }

  /**
   * 处理页面文件变更
   */
  function handlePageFileChange(file: string, server: ViteDevServer): void {
    const absolutePagesDirs = getAbsolutePagesDirs(pagesDirs, config)
    if (isPageFileInDirs(file, absolutePagesDirs, extensions)) {
      scanAndBuildRoutes()
      writeDtsFile()
      const mod = server.moduleGraph.getModuleById(RESOLVED_ROUTES_ID)
      if (mod) {
        server.moduleGraph.invalidateModule(mod)
      }
    }
  }

  /**
   * 移除 definePage 宏调用
   */
  function removeDefinePage(code: string, id: string): { code: string; map: null } | null {
    const hasDefinePageContent =
      code.includes('definePage') || DEFINE_PAGE_SOURCES.some(src => code.includes(src))

    if (!hasDefinePageContent) {
      return null
    }

    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'topLevelAwait',
          'classProperties',
          'objectRestSpread',
          'dynamicImport'
        ]
      })

      let hasDefinePage = false
      let definePageLocalName: string | null = null

      traverse(ast, {
        ImportDeclaration(nodePath) {
          const { node } = nodePath

          if (!DEFINE_PAGE_SOURCES.includes(node.source.value)) {
            return
          }

          const specifiers = node.specifiers.filter(spec => {
            if (spec.type === 'ImportSpecifier') {
              const importedName =
                spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value

              if (importedName === 'definePage') {
                definePageLocalName = spec.local.name
                hasDefinePage = true
                return false
              }
            }
            return true
          })

          if (specifiers.length > 0) {
            node.specifiers = specifiers
          } else {
            nodePath.remove()
          }
        },

        CallExpression(nodePath) {
          const { node } = nodePath

          if (node.callee.type === 'Identifier' && node.callee.name === 'definePage') {
            hasDefinePage = true
            nodePath.remove()
          }

          if (
            definePageLocalName &&
            definePageLocalName !== 'definePage' &&
            node.callee.type === 'Identifier' &&
            node.callee.name === definePageLocalName
          ) {
            hasDefinePage = true
            nodePath.remove()
          }
        }
      })

      if (!hasDefinePage) {
        return null
      }

      const output = generate(ast, {
        retainLines: false,
        compact: false
      })

      return {
        code: output.code,
        map: null
      }
    } catch (error) {
      console.warn(`[vitarx-router] 转换代码失败: ${id}`, error)
      return null
    }
  }

  return {
    name: 'vite-plugin-vitarx-router',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig
      scanAndBuildRoutes()
      writeDtsFile()
    },

    resolveId(id) {
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_ROUTES_ID
      }
      if (id === VIRTUAL_TYPES_ID) {
        return RESOLVED_TYPES_ID
      }
      return null
    },

    load(id) {
      if (id === RESOLVED_ROUTES_ID) {
        return getRoutesCode()
      }
      if (id === RESOLVED_TYPES_ID) {
        return getTypesCode()
      }
      return null
    },

    transform(code, id) {
      const absolutePagesDirs = getAbsolutePagesDirs(pagesDirs, config)

      if (!isPageFileInDirs(id, absolutePagesDirs, extensions)) {
        return null
      }

      return removeDefinePage(code, id)
    },

    configureServer(server) {
      const absolutePagesDirs = getAbsolutePagesDirs(pagesDirs, config)

      for (const dirConfig of absolutePagesDirs) {
        server.watcher.add(dirConfig.dir)
      }

      server.watcher.on('add', file => handlePageFileChange(file, server))
      server.watcher.on('unlink', file => handlePageFileChange(file, server))
      server.watcher.on('change', file => handlePageFileChange(file, server))
    },

    buildStart() {
      scanAndBuildRoutes()
      writeDtsFile()
    }
  }
}
