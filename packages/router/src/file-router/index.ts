/**
 * @fileoverview 文件路由管理器
 *
 * 封装文件路由的核心流程，可在不同构建工具中复用。
 * 支持 Vite、Webpack、Rollup 等构建工具，或在 Node.js 脚本中直接使用。
 */
import type { GeneratorResult } from '@babel/generator'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import nodePath from 'node:path'
import { type PageDirConfig, resolveConfig, ResolvedConfig } from './config/index.js'
import { type GenerateResult, generateRoutes } from './generator/index.js'
import {
  isEqualPageOptions,
  mergePageOptions,
  parseDefinePage,
  removeDefinePage
} from './macros/index.js'
import {
  checkDefaultExport,
  type FilterOptions,
  isPageFile,
  isPageFileInDirs
} from './parser/index.js'
import { extractFileInfo, type FileInfo, parsePageFile } from './parser/parsePage.js'
import type { FileRouterOptions, PageParseResult, ScanNode } from './types/index.js'
import {
  applyPathStrategy,
  info,
  normalizePathSeparator,
  readFileContent,
  resolvePathVariable,
  validateOptions,
  warn
} from './utils/index.js'

export { resolvePageConfigs } from './config/resolve.js'
export * from './generator/index.js'
export { mergePageOptions } from './macros/definePage.js'
export type * from './types/index.js'
export * from './utils/logger.js'
/**
 * 文件监听器事件类型
 *
 * 对应 chokidar 文件监听器的事件类型
 */
export type FileWatcherEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
type ScanDirConfig = Omit<PageDirConfig, 'group'>
type FileType = 'layout' | 'config' | 'page' | 'ignore'
interface ResolvedFile {
  fileInfo: FileInfo
  fileType: FileType
}
/**
 * 文件路由管理器
 */
export class FileRouter {
  /**
   * 配置项
   */
  public readonly config: ResolvedConfig
  /**
   * 扫描的节点树
   *
   * @private
   */
  #nodeTree: ScanNode[]
  /**
   * 文件映射表
   * @private
   */
  readonly #fileMap: Map<string, ScanNode> = new Map()
  /**
   * 生成结果
   * @private
   */
  #generateResult: GenerateResult | null = null
  /**
   * 创建文件路由管理器
   *
   * @param options - 配置选项
   * @param [init = true] - 是否初始化加载
   */
  constructor(options: FileRouterOptions = {}, init: boolean = true) {
    validateOptions(options)
    this.config = resolveConfig(options)
    this.#nodeTree = init ? this.scanPages() : []
  }
  /**
   * 获取项目根目录
   */
  get root(): string {
    return this.config.root
  }
  /**
   * 获取节点树
   */
  get nodeTree(): ScanNode[] {
    return this.#nodeTree
  }

  /**
   * 获取文件映射表
   *
   * 键为文件或目录路径，值为对应的节点对象
   */
  get fileMap(): Map<string, ScanNode> {
    return this.#fileMap
  }
  /**
   * 加载/重新加载文件路由管理器
   *
   * @returns {FileRouter} 文件路由管理器实例
   */
  public reload(): this {
    this.clearGenerateResult()
    this.#fileMap.clear()
    this.#nodeTree = this.scanPages()
    return this
  }
  /**
   * 构建路由数组
   *
   * @returns 扫描到的页面文件列表
   */
  protected scanPages(): ScanNode[] {
    const pages: ScanNode[] = []
    for (const page of this.config.pages) {
      if (!existsSync(page.dir)) {
        warn(`Directory ${page.dir} does not exist, please check your configuration.`)
        continue
      }
      if (page.group && page.prefix) {
        const route: ScanNode = {
          isGroup: true,
          filePath: page.dir,
          path: this.applyPathStrategy(page.prefix)
        }
        route.children = this.scanPageDir({ ...page, prefix: '' }, route)
        // 如果有子路由则添加到页面列表中
        if (route.children.size > 0) {
          pages.push(route)
          this.fileMap.set(route.filePath, route)
        }
        continue
      }
      const children = this.scanPageDir(page)
      pages.push(...children.values())
    }
    return pages
  }
  /**
   * 扫描页面目录
   *
   * @param page - 页面配置
   * @param parent - 父路由
   * @protected
   */
  private scanPageDir(page: ScanDirConfig, parent?: ScanNode): Set<ScanNode> {
    const entries = readdirSync(page.dir, { withFileTypes: true })
    // 直接子路由映射，键为文件名，不包含@视图命名，用于合并命名视图到同一个路由对象
    const pageMapping = new Map<string, ScanNode>()
    const children: Set<ScanNode> = new Set()
    for (const dirent of entries) {
      const filePath = normalizePathSeparator(nodePath.resolve(dirent.parentPath, dirent.name))
      let route: ScanNode | null = null
      if (dirent.isDirectory()) {
        // 处理嵌套子目录
        route = this.processDir(filePath, dirent.name, page, parent)
      } else {
        // 处理文件
        route = this.processFile(filePath, page, pageMapping, parent)
      }
      if (route) {
        children.add(route)
        this.fileMap.set(filePath, route)
      }
    }
    // 返回子路由集合
    return children
  }
  /**
   * 处理目录
   *
   * @param filePath - 目录路径
   * @param fileName - 目录名
   * @param page - 页面配置
   * @param parent - 父节点
   * @private
   */
  private processDir(
    filePath: string,
    fileName: string,
    page: ScanDirConfig,
    parent?: ScanNode
  ): ScanNode | null {
    const pathPrefix = parent ? '' : page.prefix
    const route: ScanNode = {
      isGroup: true,
      parent,
      filePath,
      path: this.applyPathStrategy(pathPrefix + fileName)
    }
    route.children = this.scanPageDir({ ...page, dir: filePath, prefix: '' }, route)
    return route.children.size > 0 ? route : null
  }
  /**
   * 处理文件
   *
   * 根据文件类型分发到对应的处理器。
   *
   * @param filePath - 文件路径
   * @param page - 页面配置
   * @param pageMapping - 同路径路由映射
   * @param parent - 父节点
   * @private
   */
  private processFile(
    filePath: string,
    page: ScanDirConfig,
    pageMapping: Map<string, ScanNode>,
    parent?: ScanNode
  ): ScanNode | null {
    const { fileInfo, fileType } = this.resolveFile(filePath, page)
    switch (fileType) {
      case 'ignore':
        return null
      case 'config':
        this.processConfigFile(filePath, parent)
        return null
      case 'layout':
        this.processLayoutFile(filePath, fileInfo, parent)
        return null
      case 'page':
        return this.processPageFile(filePath, fileInfo, page, pageMapping, parent)
    }
  }
  /**
   * 解析文件信息与类型
   *
   * 统一入口，避免多处重复调用 extractFileInfo + getPageType。
   *
   * @param filePath - 文件路径
   * @param page - 页面配置
   * @returns 文件信息与类型
   */
  private resolveFile(filePath: string, page: ScanDirConfig): ResolvedFile {
    const fileInfo = extractFileInfo(filePath)
    const fileType = this.getPageType(filePath, fileInfo.rawName, page)
    return { fileInfo, fileType }
  }
  /**
   * 处理分组配置文件
   *
   * 解析 definePage 宏并合并到父路由选项中。
   *
   * @param filePath - 文件路径
   * @param parent - 父节点
   */
  private processConfigFile(filePath: string, parent?: ScanNode): void {
    if (!parent) return
    const content = this.readFile(filePath)
    const pageOptions = parseDefinePage(content, filePath)
    if (pageOptions) {
      parent.options = mergePageOptions(parent.options, pageOptions)
      parent.dirConfigFile = filePath
      this.fileMap.set(filePath, parent)
    }
  }
  /**
   * 处理分组布局文件
   *
   * 将布局组件注册到父路由的 components 中。
   *
   * @param filePath - 文件路径
   * @param fileInfo - 文件信息
   * @param parent - 父节点
   */
  private processLayoutFile(filePath: string, fileInfo: FileInfo, parent?: ScanNode): void {
    if (!parent) return
    const content = this.readFile(filePath)
    if (checkDefaultExport(content, filePath)) {
      parent.components ??= {}
      parent.components[fileInfo.viewName ?? 'default'] = filePath
    }
    this.fileMap.set(filePath, parent)
  }
  /**
   * 处理页面文件
   *
   * 解析路由路径、视图命名和页面选项，创建或合并路由节点。
   *
   * @param filePath - 文件路径
   * @param fileInfo - 文件信息
   * @param page - 页面配置
   * @param pageMapping - 同路径路由映射
   * @param parent - 父节点
   * @param [precomputedParsed] - 预计算的解析结果，避免重复调用 parsePageFile
   * @returns 新创建的路由节点，或 null（合并到已有路由时）
   */
  private processPageFile(
    filePath: string,
    fileInfo: FileInfo,
    page: ScanDirConfig,
    pageMapping: Map<string, ScanNode>,
    parent?: ScanNode,
    precomputedParsed?: PageParseResult
  ): ScanNode | null {
    const parsed = precomputedParsed ?? parsePageFile(filePath, this.config.pageParser, fileInfo)
    const viewName = parsed.viewName ?? 'default'
    const content = this.readFile(filePath)
    const sameRoute = pageMapping.get(parsed.path)
    if (sameRoute) {
      if (!checkDefaultExport(content, filePath)) return null
      sameRoute.components![viewName] = filePath
      this.fileMap.set(filePath, sameRoute)
      return null
    }
    const definePageOptions = parseDefinePage(content, filePath)
    const pageOptions = mergePageOptions(parsed.options, definePageOptions)
    if (!pageOptions.redirect && !checkDefaultExport(content, filePath)) return null
    const finalPath = this.applyPathStrategy(
      (parent ? '' : page.prefix) + (parsed.path === 'index' ? '' : parsed.path)
    )
    const route: ScanNode = {
      isGroup: false,
      parent,
      filePath,
      path: finalPath,
      components: {
        [viewName]: filePath
      }
    }
    if (Object.keys(pageOptions).length) route.options = pageOptions
    pageMapping.set(parsed.path, route)
    return route
  }
  /**
   * 在已有路由树中查找同路径路由
   *
   * 用于 addPage 场景：新增文件时需要检查是否已存在同路径的路由节点，
   * 以便将命名视图合并到已有路由而非创建重复路由。
   *
   * @param pathKey - 标准化后的路由路径
   * @param prefix - 路径前缀
   * @param parent - 父节点
   * @returns 同路径的路由节点，未找到返回 null
   */
  private findSameRoute(pathKey: string, prefix: string, parent?: ScanNode): ScanNode | null {
    const newRoutePath = this.applyPathStrategy(prefix + pathKey)
    const pages = parent ? parent.children! : this.nodeTree
    for (const route of pages) {
      if (route.path === newRoutePath) return route
    }
    return null
  }
  /**
   * 应用路径策略
   *
   * @param path - 路径
   * @protected
   */
  private applyPathStrategy(path: string): string {
    return resolvePathVariable(applyPathStrategy(path, this.config.pathStrategy))
  }
  /**
   * 读取文件内容
   *
   * @param file - 文件绝对路径
   */
  private readFile(file: string): string {
    return readFileContent(file, this.config.transform)
  }
  /**
   * 获取文件类型
   *
   * @param file - 文件绝对路径
   * @param rawName - 文件名（不含扩展名和 @视图命名）
   * @param pages - 页面配置
   * @returns 文件类型
   */
  private getPageType(
    file: string,
    rawName: string,
    pages?: FilterOptions | readonly FilterOptions[]
  ): FileType {
    if (rawName === this.config.layoutFileName) {
      return 'layout'
    }
    if (rawName === this.config.configFileName && (file.endsWith('.ts') || file.endsWith('.js'))) {
      return 'config'
    }
    if (this.isPageFile(file, pages)) {
      return 'page'
    }
    return 'ignore'
  }
  /**
   * 检查文件是否为页面文件
   *
   * @param file - 文件绝对路径
   * @param filter - 过滤配置，默认为 `config.pages`
   * @returns {boolean} - 是否为页面文件
   */
  public isPageFile(file: string, filter?: FilterOptions | readonly FilterOptions[]): boolean {
    if (filter) {
      if (Array.isArray(filter)) {
        return !!isPageFileInDirs(file, filter)
      } else {
        return isPageFile(file, filter as FilterOptions)
      }
    }
    return !!isPageFileInDirs(file, this.config.pages)
  }
  /**
   * 写入类型定义文件
   */
  private writeDts(content: string): void {
    const dtsPath = this.config.dts
    if (!dtsPath) return void 0
    const absolutePath = nodePath.isAbsolute(dtsPath)
      ? dtsPath
      : nodePath.resolve(this.root, dtsPath)

    const dtsDir = nodePath.dirname(absolutePath)

    if (!existsSync(dtsDir)) {
      mkdirSync(dtsDir, { recursive: true })
    }
    writeFileSync(absolutePath, content, 'utf-8')
  }
  /**
   * 生成路由
   *
   * @returns {GenerateResult} 生成结果，包含routes、dts、code
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
      this.writeDts(this.#generateResult.dts)
    }
    return this.#generateResult
  }
  /**
   * 清空生成结果
   */
  public clearGenerateResult(): void {
    this.#generateResult = null
  }
  /**
   * 移除 definePage 宏
   *
   * 移除页面文件中的 definePage 宏调用。
   * definePage 在客户端无法运行，必须移除。
   *
   * @param code - 源代码
   * @param filePath - 文件路径
   * @returns 转换后的代码，无需转换返回 null
   */
  public removeDefinePage(code: string, filePath: string): GeneratorResult | null {
    return removeDefinePage(code, filePath)
  }
  /**
   * 添加页面文件
   *
   * 根据文件类型直接调用对应处理器，避免重复类型判断和文件解析。
   *
   * @param filePath - 文件路径
   * @returns 是否创建了新的路由节点
   */
  public addPage(filePath: string): boolean {
    const page = isPageFileInDirs(filePath, this.config.pages) as PageDirConfig | false
    if (!page) return false
    const dirPath = nodePath.dirname(filePath)
    const parent = this.fileMap.get(dirPath)
    const prefix = parent ? '' : page.prefix
    const { fileInfo, fileType } = this.resolveFile(filePath, page)
    const pageConfig: ScanDirConfig = {
      dir: dirPath,
      include: page.include,
      exclude: page.exclude,
      prefix
    }

    switch (fileType) {
      case 'ignore':
        return false
      case 'config':
        this.processConfigFile(filePath, parent)
        return false
      case 'layout':
        this.processLayoutFile(filePath, fileInfo, parent)
        return false
      case 'page': {
        const parsed = parsePageFile(filePath, this.config.pageParser, fileInfo)
        const pageMapping = new Map<string, ScanNode>()
        const sameRoute = this.findSameRoute(parsed.path, prefix, parent)
        if (sameRoute) {
          pageMapping.set(parsed.path, sameRoute)
        }
        const route = this.processPageFile(
          filePath,
          fileInfo,
          pageConfig,
          pageMapping,
          parent,
          parsed
        )
        if (route) {
          this.fileMap.set(filePath, route)
          return true
        }
        return false
      }
    }
  }
  /**
   * 移除指定的文件或目录
   *
   * 通常用于在开发模式下，文件内容改变时，移除旧的路由映射，重新生成
   *
   * 移除成功后续手动调用 `clearGenerateResult` 方法确保下一次获取新的生成结果！
   *
   * @param filePath - 文件/目录路径
   * @returns {boolean} - 存在则移除并返回 true，不存在则返回 false
   */
  public removePage(filePath: string): boolean {
    const route = this.fileMap.get(filePath)
    if (route) {
      // 移除组件映射，其中包含页面文件自身以及命名文件
      if (route.components) {
        Object.values(route.components).forEach(file => {
          this.fileMap.delete(file)
        })
      }
      // 移除配置文件映射
      if (route.dirConfigFile) {
        this.fileMap.delete(route.dirConfigFile)
      }
      // 递归移除子文件
      if (route.children) {
        // 分组路由需要移除自身的映射
        this.fileMap.delete(filePath)
        route.children.forEach(child => {
          this.removePage(child.filePath)
        })
      }
      // 从父级移除
      route.parent?.children?.delete(route)
      return true
    }
    return false
  }
  /**
   * 更新文件
   *
   * 如果文件未被扫描，则会自动添加。
   *
   * @param filePath - 文件路径
   * @returns {boolean} - 是否更新了文件
   */
  public updatePage(filePath: string): boolean {
    const route = this.fileMap.get(filePath)
    if (route) {
      const content = this.readFile(filePath)
      // 解析页面选项
      const newOptions = parseDefinePage(content, filePath)
      // 忽略不具备默认导出，且无重定向配置的文件
      if (!newOptions?.redirect && !checkDefaultExport(content, filePath)) {
        // 移除文件
        this.removePage(filePath)
      }
      if (isEqualPageOptions(route.options, newOptions)) {
        return false
      }
      if (newOptions) {
        route.options = newOptions
      } else {
        delete route.options
      }
      return true
    }
    return this.addPage(filePath)
  }
  /**
   * 处理文件变化
   *
   * @param eventName - 文件变化事件名
   * @param path - 文件路径
   * @returns {boolean} - 是否影响了路由
   * @example
   * ```typescript
   * router.handleChange('change', '/path/to/file.ts')
   * // 在vite中使用
   * server.watcher.on('all', (event,path) => {
   *   const mod = server.moduleGraph.getModuleById(RESOLVED_ROUTES_ID)
   *   if (mod) {
   *     const result = router.handleChange(event, path)
   *     // 如果 handleChange 返回 true，则表示路由受到影响，需要更新模块
   *     if(result) server.moduleGraph.invalidateModule(mod)
   *   }
   * })
   * ```
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
}
