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
import { DEFAULT_DTS_FILE, DEFAULT_EXTENSIONS, DEFAULT_PAGES_DIR } from './core/constants.js'
import { generateRoutes } from './core/generateRoutes.js'
import { generateFullDtsFile, generateTypes } from './core/generateTypes.js'
import { buildRouteTree, scanPages } from './core/scanPages.js'
import type { ParsedPage, VitePluginRouterOptions } from './core/types.js'

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

/**
 * 检查文件是否为页面文件
 *
 * @param file - 文件路径
 * @param pagesDir - 页面目录路径
 * @param extensions - 支持的文件扩展名列表
 * @param exclude - 排除模式列表
 * @returns 如果是有效的页面文件返回 true
 */
function isPageFile(
  file: string,
  pagesDir: string,
  extensions: string[],
  exclude: string[]
): boolean {
  // 检查文件是否在页面目录内
  if (!file.startsWith(pagesDir)) {
    return false
  }

  // 检查是否匹配排除模式
  for (const pattern of exclude) {
    if (file.includes(pattern)) {
      return false
    }
  }

  // 检查文件扩展名
  const ext = path.extname(file)
  return extensions.includes(ext)
}

/**
 * 创建 Vitarx Router Vite 插件
 *
 * 该插件会自动扫描指定目录下的页面文件，生成路由配置和 TypeScript 类型定义。
 * 支持开发环境热更新，当页面文件发生变化时自动重新生成路由。
 *
 * @param options - 插件配置选项
 * @param [options.pagesDir] - 页面目录路径，默认为 'src/pages'
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
 * ```
 */
export default function VitarxRouter(options: VitePluginRouterOptions = {}): Plugin {
  // 解构配置，应用默认值
  const {
    pagesDir = DEFAULT_PAGES_DIR,
    extensions = DEFAULT_EXTENSIONS,
    exclude = [],
    dts = DEFAULT_DTS_FILE
  } = options

  // 插件内部状态
  let config: ResolvedConfig | null = null
  let pages: ParsedPage[] = []
  let routeTree: ParsedPage[] = []
  let cachedRoutes: string | null = null
  let cachedTypes: string | null = null

  /**
   * 获取页面目录的绝对路径
   *
   * @returns 页面目录的绝对路径
   */
  function getAbsolutePagesDir(): string {
    if (!config) return pagesDir
    return path.isAbsolute(pagesDir) ? pagesDir : path.resolve(config.root, pagesDir)
  }

  /**
   * 扫描页面目录并构建路由树
   *
   * 该函数会清空缓存，重新扫描页面目录，解析文件并构建路由树结构。
   */
  function scanAndBuildRoutes(): void {
    const absolutePagesDir = getAbsolutePagesDir()

    // 扫描页面目录
    pages = scanPages({
      pagesDir: absolutePagesDir,
      extensions,
      exclude
    })

    // 构建路由树
    routeTree = buildRouteTree(pages)

    // 清空缓存，下次获取时重新生成
    cachedRoutes = null
    cachedTypes = null
  }

  /**
   * 获取路由配置代码
   *
   * 使用缓存机制，只在路由树变化时重新生成。
   *
   * @returns 路由配置代码字符串
   */
  function getRoutesCode(): string {
    if (!cachedRoutes) {
      cachedRoutes = generateRoutes(routeTree)
    }
    return cachedRoutes
  }

  /**
   * 获取类型定义代码
   *
   * 使用缓存机制，只在路由树变化时重新生成。
   *
   * @returns 类型定义代码字符串
   */
  function getTypesCode(): string {
    if (!cachedTypes) {
      cachedTypes = generateTypes(routeTree)
    }
    return cachedTypes
  }

  /**
   * 写入 .d.ts 类型声明文件
   *
   * 如果配置了 dts 选项，会将类型定义写入指定文件。
   * 自动创建不存在的目录。
   */
  function writeDtsFile(): void {
    if (dts === false || !config) return

    const dtsPath = path.isAbsolute(dts) ? dts : path.resolve(config.root, dts)
    const dtsDir = path.dirname(dtsPath)

    // 确保目录存在
    if (!fs.existsSync(dtsDir)) {
      fs.mkdirSync(dtsDir, { recursive: true })
    }

    // 写入类型定义文件
    const content = generateFullDtsFile(routeTree)
    fs.writeFileSync(dtsPath, content, 'utf-8')

    // 打印日志
    console.log(`[vitarx-router] 类型定义文件已生成: ${dtsPath}`)
  }

  /**
   * 处理页面文件变更
   *
   * 当页面文件被添加、删除或修改时，重新扫描路由并更新缓存。
   *
   * @param file - 变更的文件路径
   * @param server - Vite 开发服务器实例
   */
  function handlePageFileChange(file: string, server: ViteDevServer): void {
    const absolutePagesDir = getAbsolutePagesDir()
    if (isPageFile(file, absolutePagesDir, extensions, exclude)) {
      scanAndBuildRoutes()
      writeDtsFile()
      // 使虚拟模块缓存失效
      const mod = server.moduleGraph.getModuleById(RESOLVED_ROUTES_ID)
      if (mod) {
        server.moduleGraph.invalidateModule(mod)
      }
    }
  }

  return {
    /** 插件名称 */
    name: 'vite-plugin-vitarx-router',

    /** 插件执行顺序：pre 确保在其他插件之前执行 */
    enforce: 'pre',

    /**
     * Vite 配置解析完成后的钩子
     *
     * 在此阶段初始化插件状态，扫描页面并生成类型文件。
     */
    configResolved(resolvedConfig) {
      config = resolvedConfig
      scanAndBuildRoutes()
      writeDtsFile()
    },

    /**
     * 模块 ID 解析钩子
     *
     * 拦截虚拟模块的导入，返回内部解析后的 ID。
     */
    resolveId(id) {
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_ROUTES_ID
      }
      if (id === VIRTUAL_TYPES_ID) {
        return RESOLVED_TYPES_ID
      }
      return null
    },

    /**
     * 模块加载钩子
     *
     * 为虚拟模块提供生成的内容。
     */
    load(id) {
      if (id === RESOLVED_ROUTES_ID) {
        return getRoutesCode()
      }
      if (id === RESOLVED_TYPES_ID) {
        return getTypesCode()
      }
      return null
    },

    /**
     * 代码转换钩子
     *
     * 移除页面文件中的 definePage 宏调用。
     * definePage 仅用于构建时解析，运行时不需要。
     * 支持处理导入别名的情况。
     */
    transform(code, id) {
      const absolutePagesDir = getAbsolutePagesDir()

      // 只处理页面目录下的文件
      if (!isPageFile(id, absolutePagesDir, extensions, exclude)) {
        return null
      }

      // 快速检查是否包含 definePage 或相关导入
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
        // 用于存储导入的 definePage 的本地名称（可能是别名）
        let definePageLocalName: string | null = null

        traverse(ast, {
          // 首先处理导入语句，确定 definePage 的本地名称
          ImportDeclaration(nodePath) {
            const { node } = nodePath

            // 检查是否是从有效来源导入
            if (!DEFINE_PAGE_SOURCES.includes(node.source.value)) {
              return
            }

            // 查找 definePage 的导入并记录本地名称
            const specifiers = node.specifiers.filter(spec => {
              if (spec.type === 'ImportSpecifier') {
                const importedName =
                  spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value

                if (importedName === 'definePage') {
                  // 记录本地名称（可能是别名）
                  definePageLocalName = spec.local.name
                  hasDefinePage = true
                  return false // 移除这个导入
                }
              }
              return true
            })

            // 如果还有其他导入，更新 specifiers；否则移除整个导入语句
            if (specifiers.length > 0) {
              node.specifiers = specifiers
            } else {
              nodePath.remove()
            }
          },

          // 处理函数调用
          CallExpression(nodePath) {
            const { node } = nodePath

            // 检查是否是 definePage 调用（原始名称）
            if (node.callee.type === 'Identifier' && node.callee.name === 'definePage') {
              hasDefinePage = true
              nodePath.remove()
            }

            // 检查是否使用了别名调用
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

        // 生成转换后的代码
        const output = generate(ast, {
          retainLines: false,
          compact: false
        })

        return {
          code: output.code,
          map: null
        }
      } catch (error) {
        // AST 解析失败时返回原始代码
        console.warn(`[vitarx-router] 转换代码失败: ${id}`, error)
        return null
      }
    },

    /**
     * 开发服务器配置钩子
     *
     * 设置文件监听器，实现热更新功能。
     */
    configureServer(server) {
      const absolutePagesDir = getAbsolutePagesDir()

      // 将页面目录添加到监听器
      server.watcher.add(absolutePagesDir)

      // 监听文件添加事件
      server.watcher.on('add', file => {
        handlePageFileChange(file, server)
      })

      // 监听文件删除事件
      server.watcher.on('unlink', file => {
        handlePageFileChange(file, server)
      })

      // 监听文件修改事件
      server.watcher.on('change', file => {
        handlePageFileChange(file, server)
      })
    },

    /**
     * 构建开始钩子
     *
     * 确保在构建前生成最新的路由配置和类型文件。
     */
    buildStart(): void {
      scanAndBuildRoutes()
      writeDtsFile()
    }
  }
}
