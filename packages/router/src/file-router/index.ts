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
import { parseRoutePath } from './parser/parsePage.js'
import type { FileRouterOptions, ParsedNode } from './types/index.js'
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
export type * from './types/index.js'
export * from './utils/logger.js'

type ScanDirConfig = Omit<PageDirConfig, 'group'>
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
  #nodeTree: ParsedNode[]
  /**
   * 文件映射表
   * @private
   */
  readonly #fileMap: Map<string, ParsedNode> = new Map()
  /**
   * 生成结果
   * @private
   */
  #generateResult: GenerateResult | null = null
  /**
   * 创建文件路由管理器
   *
   * @param options - 配置选项
   */
  constructor(options: FileRouterOptions = {}) {
    validateOptions(options)
    this.config = resolveConfig(options)
    this.#nodeTree = this.scanPages()
    info(`✨ File Router Manager created`)
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
  get nodeTree(): ParsedNode[] {
    return this.#nodeTree
  }
  /**
   * 获取文件映射表
   *
   * 键为文件或目录路径，值为对应的节点对象
   */
  get fileMap(): Map<string, ParsedNode> {
    return this.#fileMap
  }

  /**
   * 构建路由数组
   *
   * @returns 扫描到的页面文件列表
   */
  protected scanPages(): ParsedNode[] {
    const pages: ParsedNode[] = []
    for (const page of this.config.pages) {
      if (!existsSync(page.dir)) {
        warn(`Directory ${page.dir} does not exist, please check your configuration.`)
        continue
      }
      if (page.group && page.prefix) {
        const route: ParsedNode = {
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
  private scanPageDir(page: ScanDirConfig, parent?: ParsedNode): Set<ParsedNode> {
    const entries = readdirSync(page.dir, { withFileTypes: true })
    // 直接子路由映射，键为文件名，不包含@视图命名，用于合并命名视图到同一个路由对象
    const pageMapping = new Map<string, ParsedNode>()
    const children: Set<ParsedNode> = new Set()
    for (const dirent of entries) {
      const filePath = normalizePathSeparator(nodePath.resolve(dirent.parentPath, dirent.name))
      let route: ParsedNode | null = null
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
    parent?: ParsedNode
  ): ParsedNode | null {
    const pathPrefix = parent ? '' : page.prefix
    const route: ParsedNode = {
      parent,
      filePath,
      path: this.applyPathStrategy(pathPrefix + fileName)
    }
    route.children = this.scanPageDir({ ...page, dir: filePath, prefix: '' }, route)
    return route.children.size > 0 ? route : null
  }
  /**
   * 处理文件
   * @param filePath - 文件路径
   * @param page - 页面配置
   * @param pageMapping - 子路由
   * @param parent - 父节点
   * @private
   */
  private processFile(
    filePath: string,
    page: ScanDirConfig,
    pageMapping: Map<string, ParsedNode>,
    parent?: ParsedNode
  ): ParsedNode | null {
    // 分离出路由 path 和视图命名
    const { routePath, viewName = 'default' } = parseRoutePath(filePath, this.config.pathParser)
    const fileType = this.getPageType(filePath, routePath, page)
    if (fileType === 'ignore') return null
    // 处理分组配置文件
    if (fileType === 'config') {
      if (!parent) return null
      const content = this.readFile(filePath)
      const pageOptions = parseDefinePage(content, filePath)
      if (pageOptions) {
        if (parent.options) {
          mergePageOptions([parent.options, pageOptions])
        } else {
          parent.options = pageOptions
        }
        parent.dirConfigFile = filePath
        this.fileMap.set(filePath, parent)
      }
      return null
    }
    // 处理分组布局文件
    if (fileType === 'layout') {
      if (!parent) return null
      const content = this.readFile(filePath)
      if (checkDefaultExport(content, filePath)) {
        parent.components ??= {}
        parent.components[viewName] = filePath
      }
      this.fileMap.set(filePath, parent)
      return null
    }
    // 读取文件内容
    const content = this.readFile(filePath)
    // 处理同名路由
    const sameRoute = pageMapping.get(routePath)
    if (sameRoute) {
      if (!checkDefaultExport(content, filePath)) return null
      // 添加命名组件
      sameRoute.components![viewName] = filePath
      // 更新文件映射表
      this.fileMap.set(filePath, sameRoute)
      return null
    }
    // 解析页面选项
    const pageOptions = parseDefinePage(content, filePath)
    // 忽略不具备默认导出，且无重定向配置的文件
    if (!pageOptions?.redirect && !checkDefaultExport(content, filePath)) return null
    // 最终 path
    const finalPath = this.applyPathStrategy(
      (parent ? '' : page.prefix) + (routePath === 'index' ? '' : routePath)
    )
    // 创建路由对象
    const route: ParsedNode = {
      parent,
      filePath,
      path: finalPath,
      components: {
        [viewName]: filePath
      }
    }
    // 添加页面选项
    if (pageOptions) route.options = pageOptions
    // 添加到子路由映射中
    pageMapping.set(routePath, route)
    return route
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
   * @param name - 文件名
   * @param pages - 页面配置，默认为 `config.pages`
   * @returns {string} - 文件类型，可选值有 `layout`、`config`、`page`、`ignore`
   */
  private getPageType(
    file: string,
    name: string,
    pages?: FilterOptions | readonly FilterOptions[]
  ): 'layout' | 'config' | 'page' | 'ignore' {
    if (name === this.config.layoutFileName) {
      return 'layout'
    }
    if (name === this.config.configFileName && (file.endsWith('.ts') || file.endsWith('.js'))) {
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
  public clearGenerateResult() {
    this.#generateResult = null
  }
  /**
   * 重新加载
   */
  public reload(): void {
    this.clearGenerateResult()
    this.#fileMap.clear()
    this.#nodeTree = this.scanPages()
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
  public removeDefinePage(code: string, filePath: string): GeneratorResult | null {
    return removeDefinePage(code, filePath)
  }
  /**
   * 添加页面文件
   *
   * @param filePath
   */
  public addPage(filePath: string): boolean {
    const page = isPageFileInDirs(filePath, this.config.pages) as PageDirConfig | false
    if (!page) return false
    // 分离出路由 path 和视图命名
    const { routePath, viewName } = parseRoutePath(filePath, this.config.pathParser)
    const dirPath = nodePath.dirname(filePath)
    const parent = this.fileMap.get(dirPath)
    const pageMapping = new Map<string, ParsedNode>()
    const prefix = parent ? '' : page.prefix
    // 如果是命名文件，则先查找是否存在同名路由，存在则添加到同名路由的 children 中
    if (viewName) {
      const pages = parent ? parent.children! : this.nodeTree
      const newRoutePath = this.applyPathStrategy(prefix + routePath)
      let sameRoute: ParsedNode | null = null
      for (const route of pages) {
        if (route.path === newRoutePath) {
          sameRoute = route
          break
        }
      }
      if (sameRoute) {
        pageMapping.set(routePath, sameRoute)
      }
    }

    const route = this.processFile(
      filePath,
      {
        dir: dirPath,
        include: page.include,
        exclude: page.exclude,
        prefix
      },
      pageMapping,
      parent
    )
    if (route) {
      this.fileMap.set(filePath, route)
      return true
    }
    return false
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
  public handleChange(
    eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
    path: string
  ): boolean {
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
