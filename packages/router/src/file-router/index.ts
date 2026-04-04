/**
 * @fileoverview 文件路由管理器
 *
 * 封装文件路由的核心流程，可在不同构建工具中复用。
 * 支持 Vite、Webpack、Rollup 等构建工具，或在 Node.js 脚本中直接使用。
 */
import fs from 'node:fs'
import path from 'node:path'
import { resolveConfig, type ResolvedConfig } from './config/index.js'
import { generateFullDtsFile, generateRoutes } from './generator/index.js'
import { removeDefinePage } from './macros/index.js'
import { buildRouteTree, isPageFileInDirs, scanMultiplePages } from './scanner/index.js'
import type { FileRouterOptions, ParsedPage } from './types.js'
import { validateOptions } from './utils/index.js'

export * from './types.js'
export * from './utils/logger.js'

/**
 * 路由生成结果
 */
export interface RoutesResult {
  /** 生成的路由代码 */
  code: string
  /** 页面列表 */
  pages: ParsedPage[]
  /** 路由树 */
  routeTree: ParsedPage[]
}

/**
 * 类型定义生成结果
 */
interface WriteDtsResult {
  /** 类型定义内容 */
  content: string
  /** 写入路径（绝对路径） */
  path: string
}

/**
 * 文件路由管理器
 *
 * 封装文件路由的核心流程，提供统一的 API 供不同构建工具使用。
 *
 * @example
 * ```typescript
 * // 基本使用
 * const router = new FileRouter({
 *   pagesDir: 'src/pages',
 *   extensions: ['.tsx', '.ts']
 * })
 *
 * router.setRoot('/project/root')
 * router.scan()
 *
 * // 生成路由代码
 * const routes = await router.generateRoutes()
 *
 * // 生成类型定义
 * const dts = router.generateDts()
 * ```
 *
 * @example
 * ```typescript
 * // 在 Vite 插件中使用
 * const router = new FileRouter(options)
 *
 * return {
 *   configResolved(config) {
 *     router.setRoot(config.root)
 *     router.scan()
 *   },
 *   async load(id) {
 *     if (id === VIRTUAL_ID) {
 *       return (await router.generateRoutes()).code
 *     }
 *   }
 * }
 * ```
 */
export class FileRouter {
  public readonly config: ResolvedConfig
  private _pages: ParsedPage[] = []
  private _routeTree: ParsedPage[] = []
  private _cachedRoutesPromise: Promise<string> | null = null

  /**
   * 创建文件路由管理器
   *
   * @param options - 配置选项
   */
  constructor(options: FileRouterOptions = {}) {
    validateOptions(options)
    this.config = resolveConfig(options)
  }

  /**
   * 获取项目根目录
   */
  get root(): string {
    return this.config.root
  }

  /**
   * 扫描页面目录
   *
   * 扫描前会清除缓存，确保每次扫描后调用 `generateRoutes()` 会重新生成路由代码。
   * 扫描所有配置的页面目录，解析页面文件并构建路由树。
   * 扫描后会清除路由代码缓存。
   */
  scan(): void {
    this._cachedRoutesPromise = null
    this._pages = scanMultiplePages({
      pages: this.config.pages,
      extensions: this.config.extensions,
      namingStrategy: this.config.namingStrategy
    })

    this._routeTree = buildRouteTree(this._pages)
  }

  /**
   * 清除缓存
   *
   * 清除路由代码缓存，下次调用 `generateRoutes()` 会重新生成。
   */
  invalidate(): void {
    this._cachedRoutesPromise = null
  }

  /**
   * 检查文件是否为页面文件
   *
   * @param file - 文件绝对路径
   * @returns {boolean} - 是否为页面文件
   */
  isPageFile(file: string): boolean {
    return isPageFileInDirs(file, this.config.pages, this.config.extensions)
  }

  /**
   * 获取页面列表
   *
   * 返回扫描后的扁平页面列表，包含所有页面文件的原始信息。
   * 与 getRouteTree() 的区别：
   * - 本方法返回扁平数组，每个页面独立存在，无父子关系
   * - getRouteTree() 返回层级树结构，具有嵌套的父子关系
   *
   * @returns - 解析后的扁平页面列表
   */
  getPages(): ParsedPage[] {
    return this._pages
  }

  /**
   * 获取路由树
   *
   * 返回构建后的层级路由树结构，支持布局路由和嵌套路由。
   * 与 getPages() 的区别：
   * - 本方法返回层级树结构，子路由使用相对路径
   * - getPages() 返回扁平数组，每个页面使用完整路径
   *
   * @returns - 层级路由树结构
   */
  getRouteTree(): ParsedPage[] {
    return this._routeTree
  }

  /**
   * 生成路由代码
   *
   * @returns - 路由生成结果
   */
  async generateRoutes(): Promise<RoutesResult> {
    if (!this._cachedRoutesPromise) {
      this._cachedRoutesPromise = generateRoutes(this._routeTree, {
        importMode: this.config.importMode,
        extendRoute: this.config.extendRoute,
        imports: this.config.injectImports,
        namingStrategy: this.config.namingStrategy
      })
    }

    const code = await this._cachedRoutesPromise

    return {
      code,
      pages: this._pages,
      routeTree: this._routeTree
    }
  }

  /**
   * 生成类型定义
   *
   * @returns - 类型定义内容
   */
  generateDts(): string {
    return generateFullDtsFile(this._routeTree)
  }

  /**
   * 写入类型定义文件
   *
   * @param dtsPath - 类型定义文件路径，可以是绝对路径或相对于项目根目录的相对路径
   * @returns 写入结果信息
   */
  writeDts(dtsPath: string): WriteDtsResult {
    const absolutePath = path.isAbsolute(dtsPath) ? dtsPath : path.resolve(this.root, dtsPath)

    const dtsDir = path.dirname(absolutePath)

    if (!fs.existsSync(dtsDir)) {
      fs.mkdirSync(dtsDir, { recursive: true })
    }

    const content = this.generateDts()
    fs.writeFileSync(absolutePath, content, 'utf-8')

    return {
      content,
      path: absolutePath
    }
  }

  /**
   * 移除 definePage 宏
   *
   * 在构建模式下移除页面文件中的 definePage 宏调用。
   * definePage 作为全局宏使用，无需导入。
   *
   * @param code - 源代码
   * @param filePath - 文件路径
   * @returns 转换后的代码，无需转换返回 null
   */
  removeDefinePage(code: string, filePath: string) {
    if (!this.isPageFile(filePath)) {
      return null
    }
    return removeDefinePage(code, filePath)
  }
}
