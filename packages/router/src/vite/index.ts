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
 *       dts: 'typed-router.d.ts'
 *     })
 *   ]
 * })
 * ```
 *
 * ## 虚拟模块
 * - `virtual:vitarx-router:routes` - 自动生成的路由配置
 *
 * @module vite
 */
import chalk from 'chalk'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

import { getAbsolutePagesDirs, isPageFileInDirs, normalizeConfig } from './core/configUtils.js'
import { generateRoutes } from './core/generateRoutes.js'
import { generateFullDtsFile } from './core/generateTypes.js'
import { info } from './core/logger.js'
import { removeDefinePage } from './core/removeDefinePage.js'
import { buildRouteTree, scanMultiplePages } from './core/scanPages.js'
import type { PagesDirConfig, ParsedPage, VitePluginRouterOptions } from './core/types.js'
import { validateOptions } from './core/validateOptions.js'

/** definePage 的有效导入来源 */
const DEFINE_PAGE_SOURCES: string[] = ['vitarx-router/auto-routes']

/** 虚拟模块 ID：路由配置 */
const VIRTUAL_ROUTES_ID = 'virtual:vitarx-router:routes'

/** 解析后的路由模块 ID（Vite 内部使用） */
const RESOLVED_ROUTES_ID = '\0' + VIRTUAL_ROUTES_ID

// 导出类型和工具函数
export type { VitePluginRouterOptions } from './core/types.js'

/**
 * 创建 Vitarx Router Vite 插件
 *
 * 该插件会自动扫描指定目录下的页面文件，生成路由配置和 TypeScript 类型定义。
 * 支持开发环境热更新，当页面文件发生变化时自动重新生成路由。
 *
 * @param options - 插件配置选项
 * @param [options.pagesDir] - 页面目录路径，支持字符串、字符串数组或对象数组
 * @param [options.extensions] - 支持的文件扩展名，默认为 ['.tsx', '.ts', '.jsx', '.js']
 * @param [options.include] - 要包含的文件/目录 glob 模式列表
 * @param [options.exclude] - 要排除的文件/目录 glob 模式列表
 * @param [options.dts] - 类型声明文件路径，设为 false 可禁用生成
 * @param [options.importMode] - 组件导入模式，'lazy' | 'file'，默认 'lazy'
 * @param [options.extendRoute] - 路由扩展钩子，用于自定义扩展路由配置
 * @param [options.imports] - 自定义导入语句，向虚拟模块注入额外的导入
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
 *
 * // 使用路由扩展钩子
 * VitarxRouter({
 *   extendRoute(route) {
 *     route.meta = { ...route.meta, layout: 'default' }
 *     return route
 *   }
 * })
 *
 * // 使用 file 模式 + 自定义导入
 * VitarxRouter({
 *   importMode: 'file',
 *   imports: ["import { lazy } from 'vitarx'"],
 *   extendRoute(route) {
 *     route.component = `lazy(() => import('${route.component}'))`
 *     return route
 *   }
 * })
 * ```
 */
export default function VitarxRouter(options: VitePluginRouterOptions = {}): Plugin {
  // 验证配置选项
  validateOptions(options)

  // 规范化配置
  const normalizedConfig = normalizeConfig(options)
  const { pagesDirs, extensions, dts, importMode, extendRoute, imports, namingStrategy } =
    normalizedConfig

  // 插件内部状态
  let config: ResolvedConfig | null = null
  let absolutePagesDirs: PagesDirConfig[] = []
  let pages: ParsedPage[] = []
  let routeTree: ParsedPage[] = []
  let cachedRoutesPromise: Promise<string> | null = null

  /**
   * 扫描页面目录并构建路由树
   */
  function scanAndBuildRoutes(): void {
    // 扫描多个页面目录
    pages = scanMultiplePages({
      pagesDirs: absolutePagesDirs,
      extensions
    })

    // 构建路由树
    routeTree = buildRouteTree(pages)

    // 清空缓存
    cachedRoutesPromise = null
  }

  /**
   * 获取路由配置代码
   */
  function getRoutesCode(): Promise<string> {
    if (!cachedRoutesPromise) {
      cachedRoutesPromise = generateRoutes(routeTree, {
        importMode,
        extendRoute,
        imports,
        namingStrategy
      })
    }
    return cachedRoutesPromise
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

    info(`✨ generate type definitions: ${chalk.yellow(dtsPath)}`, 'server')
  }

  return {
    name: 'vite-plugin-vitarx-router',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig
      // 缓存绝对路径配置，避免重复计算
      absolutePagesDirs = getAbsolutePagesDirs(pagesDirs, config)
      // 初始化扫描和生成类型文件
      scanAndBuildRoutes()
      writeDtsFile()
    },

    resolveId(id) {
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_ROUTES_ID
      }
      return null
    },

    async load(id) {
      if (id === RESOLVED_ROUTES_ID) {
        return await getRoutesCode()
      }
      return null
    },

    transform(code, id) {
      // 只在构建模式下移除 definePage
      // 开发模式下保留原始代码，让其他插件（如 vitarx）可以处理
      if (config?.command !== 'build') {
        return null
      }

      if (!isPageFileInDirs(id, absolutePagesDirs, extensions)) {
        return null
      }

      return removeDefinePage(code, id, DEFINE_PAGE_SOURCES)
    },

    configureServer(server) {
      for (const dirConfig of absolutePagesDirs) {
        server.watcher.add(dirConfig.dir)
      }
      /**
       * 处理页面文件变更
       */
      const handlePageFileChange = (file: string, server: ViteDevServer): void => {
        if (isPageFileInDirs(file, absolutePagesDirs, extensions)) {
          scanAndBuildRoutes()
          writeDtsFile()
          const mod = server.moduleGraph.getModuleById(RESOLVED_ROUTES_ID)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
          }
        }
      }
      server.watcher.on('add', file => handlePageFileChange(file, server))
      server.watcher.on('unlink', file => handlePageFileChange(file, server))
      server.watcher.on('change', file => handlePageFileChange(file, server))
    }
  }
}
