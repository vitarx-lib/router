/**
 * @fileoverview 文件路由管理器
 *
 * 封装文件路由的核心流程，可在不同构建工具中复用。
 * 支持 Vite、Webpack、Rollup 等构建工具，或在 Node.js 脚本中直接使用。
 *
 * 架构分层（manager/ 目录内）：
 * - file-classifier: 文件分类（页面/布局/配置/忽略）
 * - file-processor: 文件处理（配置解析、布局注册、页面路由创建）
 * - scanner: 目录扫描（递归扫描文件系统，构建路由树）
 * - route-updater: 增量更新（添加/移除/更新路由，支持 HMR）
 * - index.ts: 编排层（FileRouter 类，组合上述模块）
 */
import type { GeneratorResult } from '@babel/generator'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import nodePath from 'node:path'
import { resolveConfig, type ResolvedConfig } from '../config/index.js'
import { type GenerateResult, generateRoutes } from '../generator/index.js'
import { removeDefinePage } from '../macros/index.js'
import { type FilterOptions } from '../parser/index.js'
import { extractFileInfo } from '../parser/parsePage.js'
import { computeRouteFullPath } from '../parser/routePath.js'
import type { FileRouterOptions, ScanNode } from '../types/index.js'
import {
  applyPathStrategy,
  info,
  readFileContent,
  resolvePathVariable,
  validateOptions
} from '../utils/index.js'
import { checkIsPageFile, getPageType } from './file-classifier.js'
import { type ProcessorContext } from './file-processor.js'
import { addPage, removePage, updatePage, type UpdaterContext } from './route-updater.js'
import { scanPages } from './scanner.js'

/**
 * 文件监听器事件类型
 *
 * 对应 chokidar 文件监听器的事件类型
 */
export type FileWatcherEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'

/**
 * 文件路由管理器
 *
 * 作为编排层，组合扫描器、处理器和更新器，
 * 对外提供统一的路由管理 API。
 */
export class FileRouter {
  /** 配置项 */
  public readonly config: ResolvedConfig
  /** 扫描的节点树 */
  #nodeTree: ScanNode[]
  /** 文件映射表：文件/目录路径 → 路由节点 */
  readonly #fileMap: Map<string, ScanNode> = new Map()
  /** 生成结果缓存 */
  #generateResult: GenerateResult | null = null

  /**
   * 创建文件路由管理器
   *
   * @param options - 配置选项
   * @param init - 是否在构造时扫描页面目录，默认 true
   */
  constructor(options: FileRouterOptions = {}, init: boolean = true) {
    validateOptions(options)
    this.config = resolveConfig(options)
    this.#nodeTree = init ? this.#scanPages() : []
  }

  /** 项目根目录 */
  get root(): string {
    return this.config.root
  }

  /** 顶层路由节点数组 */
  get nodeTree(): ScanNode[] {
    return this.#nodeTree
  }

  /**
   * 文件映射表
   *
   * 键为文件或目录路径，值为对应的路由节点。
   * 布局/配置文件也映射到其所属的父路由节点。
   */
  get fileMap(): Map<string, ScanNode> {
    return this.#fileMap
  }

  /**
   * 重新加载所有页面
   *
   * 清空现有路由树和文件映射，重新扫描所有页面目录。
   *
   * @returns 当前实例，支持链式调用
   */
  public reload(): this {
    this.clearGenerateResult()
    this.#fileMap.clear()
    this.#nodeTree = this.#scanPages()
    return this
  }

  /**
   * 检查文件是否为页面文件
   *
   * @param file - 文件绝对路径
   * @param filter - 可选的过滤配置，覆盖默认的 config.pages
   * @returns 是否为页面文件
   */
  public isPageFile(file: string, filter?: FilterOptions | readonly FilterOptions[]): boolean {
    return checkIsPageFile(file, this.config, filter)
  }

  /**
   * 获取文件的完整路由路径
   *
   * 判断文件是否为页面文件，如果是则计算其最终生成的路由 fullPath。
   * 非页面文件（布局文件、配置文件等）返回 null。
   *
   * @param filePath - 文件绝对路径
   * @returns 完整路由路径，非页面文件返回 null
   */
  public getRouteFullPath(filePath: string): string | null {
    if (!this.isPageFile(filePath)) return null
    const fileInfo = extractFileInfo(filePath)
    const fileType = getPageType(filePath, fileInfo.rawName, this.config)
    if (fileType !== 'page') return null
    return computeRouteFullPath(filePath, fileInfo, {
      fileMap: this.fileMap,
      pages: this.config.pages,
      pageParser: this.config.pageParser,
      groupParser: this.config.groupParser,
      pathStrategy: this.config.pathStrategy
    })
  }

  /**
   * 生成路由代码和类型定义
   *
   * 结果会被缓存，直到调用 clearGenerateResult 或触发路由变更。
   *
   * @returns 生成结果，包含 routes、code、dts
   */
  public generate(): GenerateResult {
    if (!this.#generateResult) {
      this.#generateResult = generateRoutes(this.nodeTree, {
        imports: this.config.injectImports,
        extendRoute: this.config.extendRoute,
        beforeWriteRoutes: this.config.beforeWriteRoutes,
        importMode: this.config.importMode,
        dts: !!this.config.dts
      })
      this.#writeDts(this.#generateResult.dts)
    }
    return this.#generateResult
  }

  /** 清空生成结果缓存 */
  public clearGenerateResult(): void {
    this.#generateResult = null
  }

  /**
   * 移除 definePage 宏调用
   *
   * definePage 在客户端无法运行，构建时必须移除。
   *
   * @param code - 源代码
   * @param filePath - 文件路径
   * @returns 转换后的代码，无需转换返回 null
   */
  public removeDefinePage(code: string, filePath: string): GeneratorResult | null {
    return removeDefinePage(code, filePath)
  }

  /**
   * 添加页面文件到路由树
   *
   * @param filePath - 文件绝对路径
   * @returns 是否创建了新的路由节点
   */
  public addPage(filePath: string): boolean {
    return addPage(filePath, this.#createUpdaterContext())
  }

  /**
   * 移除指定的文件或目录
   *
   * 通常用于开发模式下文件被删除时。
   * 移除成功后需调用 clearGenerateResult 确保下次获取新的生成结果。
   *
   * @param filePath - 文件/目录绝对路径
   * @returns 存在则移除并返回 true，不存在返回 false
   */
  public removePage(filePath: string): boolean {
    return removePage(filePath, this.#createUpdaterContext())
  }

  /**
   * 更新文件
   *
   * 如果文件未被扫描，则会自动添加。
   *
   * @param filePath - 文件绝对路径
   * @returns 是否更新了路由
   */
  public updatePage(filePath: string): boolean {
    return updatePage(filePath, this.#createUpdaterContext())
  }

  /**
   * 处理文件变化事件
   *
   * 根据事件类型分发到对应的增量操作，
   * 并在路由变更时自动清除生成缓存。
   *
   * @param eventName - 文件变化事件名
   * @param path - 文件路径
   * @returns 是否影响了路由
   */
  public handleChange(eventName: FileWatcherEvent, path: string): boolean {
    let result: boolean
    switch (eventName) {
      case 'unlinkDir':
      case 'unlink':
        result = this.removePage(path)
        break
      case 'change':
        result = this.updatePage(path)
        break
      default:
        result = false
    }
    if (result) {
      this.clearGenerateResult()
      const relativePath = nodePath.relative(this.root, path)
      info(`✨ Route updated: ${relativePath}`)
    }
    return result
  }

  // ─── 私有方法 ───────────────────────────────────────────────

  /**
   * 创建处理器上下文
   *
   * 将实例状态（config、fileMap）和操作（readFile、applyPathStrategy）
   * 封装为上下文对象，供子模块使用。
   */
  #createProcessorContext(): ProcessorContext {
    return {
      config: this.config,
      fileMap: this.#fileMap,
      readFile: (file: string) => readFileContent(file, this.config.transform),
      applyPathStrategy: (path: string) =>
        resolvePathVariable(applyPathStrategy(path, this.config.pathStrategy))
    }
  }

  /**
   * 创建增量更新上下文
   *
   * 在处理器上下文基础上增加可变的 nodeTree 引用。
   */
  #createUpdaterContext(): UpdaterContext {
    return {
      ...this.#createProcessorContext(),
      nodeTree: this.#nodeTree
    }
  }

  /** 扫描所有页面目录 */
  #scanPages(): ScanNode[] {
    return scanPages(this.#createProcessorContext())
  }

  /** 写入类型定义文件 */
  #writeDts(content: string): void {
    const dtsPath = this.config.dts
    if (!dtsPath) return
    const absolutePath = nodePath.isAbsolute(dtsPath)
      ? dtsPath
      : nodePath.resolve(this.root, dtsPath)
    const dtsDir = nodePath.dirname(absolutePath)
    if (!existsSync(dtsDir)) {
      mkdirSync(dtsDir, { recursive: true })
    }
    writeFileSync(absolutePath, content, 'utf-8')
  }
}
