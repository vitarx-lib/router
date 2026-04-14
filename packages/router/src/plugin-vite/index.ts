/**
 * @fileoverview Vite 插件入口模块
 *
 * 这是 vitarx-router 文件路由功能的 Vite 插件主入口。
 * 提供基于文件系统的自动路由生成能力，支持热更新和 TypeScript 类型生成。
 *
 * ## 核心功能
 * - **虚拟模块**: 通过 `virtual:vitarx-router:routes` 提供自动生成的路由配置
 * - **热更新**: 监听文件变化，自动更新路由配置
 * - **代码转换**: 移除页面文件中的 `definePage` 宏调用
 * - **类型生成**: 支持生成 TypeScript 类型定义文件
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
 * ## 插件生命周期
 * 1. `config` - 识别是否为预览模式
 * 2. `configResolved` - 创建 FileRouter 实例
 * 3. `resolveId` - 解析虚拟模块 ID
 * 4. `load` - 加载虚拟模块内容
 * 5. `transform` - 转换页面文件代码
 * 6. `configureServer` - 配置开发服务器文件监听
 * 7. `closeBundle` - 清理资源
 *
 * @module vite
 * @see {@link https://router.vitarx.cn 官方文档}
 */
import type { Plugin, ViteDevServer } from 'vite'

import { FileRouter, type FileRouterOptions, info, warn } from '../file-router/index.js'

/** 虚拟模块 ID，用于导入自动生成的路由配置 */
const VIRTUAL_ROUTES_ID = 'virtual:vitarx-router:routes'

/**
 * 解析后的路由模块 ID
 *
 * Vite 要求虚拟模块的解析 ID 必须以 `\0` 开头，
 * 这样其他插件就不会尝试处理这个模块
 */
const RESOLVED_ROUTES_ID = '\0' + VIRTUAL_ROUTES_ID

/** 插件名称，用于日志输出和调试 */
const PLUGIN_NAME = 'vite-plugin-vitarx-router'

/**
 * 文件变化事件节流延迟（毫秒）
 *
 * 在此时间窗口内的多次文件变化事件会被合并处理，
 * 避免频繁触发路由重新生成，提升开发体验
 */
const THROTTLE_DELAY_MS = 100

/**
 * 文件监听器事件类型
 *
 * 对应 chokidar 文件监听器的事件类型
 */
type FileWatcherEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'

/**
 * Vite 插件配置选项
 *
 * 继承自 FileRouterOptions，未添加额外的 Vite 特有配置项
 *
 * @see {@link FileRouterOptions} 文件路由配置选项
 */
export interface RouterPluginOptions extends FileRouterOptions {}

/**
 * 插件内部状态
 *
 * 用于管理插件在整个生命周期中的状态数据
 */
interface PluginState {
  /**
   * 文件路由管理器实例
   *
   * 在 configResolved 钩子中创建，负责路由的扫描、生成和更新
   */
  router: FileRouter | null

  /**
   * 是否为预览模式
   *
   * 预览模式下插件不执行任何操作，因为路由已在构建时生成
   */
  isPreview: boolean

  /**
   * 文件监听器处理函数
   *
   * 用于在 closeBundle 时清理监听器，防止内存泄漏
   */
  watcherHandler: ((event: FileWatcherEvent, file: string) => void) | null
}

/**
 * 创建插件初始状态
 *
 * 工厂函数，用于创建干净的插件状态对象
 *
 * @returns 初始化的插件状态对象
 */
function createInitialState(): PluginState {
  return {
    router: null,
    isPreview: false,
    watcherHandler: null
  }
}

/**
 * 创建批量节流处理函数
 *
 * 在指定时间窗口内收集所有变化事件，然后批量处理。
 * 同一文件的多次变更会被合并，只保留最后一次事件。
 * 这可以避免在短时间内多次触发路由重新生成，同时确保
 * 所有文件变化都被正确处理，不会丢失任何更新。
 *
 * @param callback - 需要节流的回调函数
 * @param delay - 节流延迟时间（毫秒）
 * @returns 节流后的处理函数
 *
 * @example
 * ```typescript
 * const batchHandler = createBatchThrottledHandler(
 *   (event, file) => console.log(event, file),
 *   100
 * )
 *
 * // 快速调用多次，同文件变更会被合并
 * batchHandler('change', 'a.ts')
 * batchHandler('change', 'b.ts')
 * batchHandler('unlink', 'a.ts')  // 覆盖之前的 a.ts change
 * // 100ms 后，只处理 a.ts unlink 和 b.ts change
 * ```
 */
function createBatchThrottledHandler(
  callback: (event: FileWatcherEvent, file: string) => void,
  delay: number
): (event: FileWatcherEvent, file: string) => void {
  let pending = false
  const pendingChanges: Map<string, FileWatcherEvent> = new Map()

  return (event: FileWatcherEvent, file: string): void => {
    pendingChanges.set(file, event)

    if (pending) return

    pending = true
    setTimeout(() => {
      pending = false
      const changes = new Map(pendingChanges)
      pendingChanges.clear()
      for (const [f, e] of changes) {
        callback(e, f)
      }
    }, delay)
  }
}

/**
 * 处理文件变化
 *
 * 当文件发生变化时，检查是否影响路由配置，并更新模块缓存。
 * 包含完整的错误处理，确保单个文件处理失败不会影响整体功能。
 *
 * @param router - 文件路由管理器实例
 * @param server - Vite 开发服务器实例
 * @param event - 文件变化事件类型
 * @param file - 发生变化的文件路径
 */
function handleFileChange(
  router: FileRouter,
  server: ViteDevServer,
  event: FileWatcherEvent,
  file: string
): void {
  try {
    const mod = server.moduleGraph.getModuleById(RESOLVED_ROUTES_ID)
    if (!mod) return

    const isRouteAffected = router.handleChange(event, file)
    if (isRouteAffected) {
      server.moduleGraph.invalidateModule(mod)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    warn(`Failed to handle file change for ${file}: ${errorMessage}`)
  }
}

/**
 * 设置文件监听器
 *
 * 为开发服务器配置文件监听，监听页面目录下的文件变化。
 * 当文件发生变化时，自动更新路由配置并触发 HMR。
 *
 * @param router - 文件路由管理器实例
 * @param server - Vite 开发服务器实例
 * @returns 文件监听器处理函数，用于后续清理
 */
function setupWatcher(
  router: FileRouter,
  server: ViteDevServer
): (event: FileWatcherEvent, file: string) => void {
  const pagesDirs = router.config.pages

  for (const dirConfig of pagesDirs) {
    server.watcher.add(dirConfig.dir)
  }

  const handler = createBatchThrottledHandler(
    (event, file) => handleFileChange(router, server, event, file),
    THROTTLE_DELAY_MS
  )

  server.watcher.on('all', handler)

  return handler
}

/**
 * 创建 Vitarx Router Vite 插件
 *
 * 这是插件的主入口函数，返回一个标准的 Vite 插件对象。
 * 插件通过虚拟模块提供自动生成的路由配置，支持热更新和代码转换。
 *
 * ## 功能特性
 * - 自动扫描页面目录生成路由配置
 * - 支持热模块替换（HMR）
 * - 自动移除 `definePage` 宏调用
 * - 支持 TypeScript 类型定义生成
 * - 支持预览模式（不执行任何操作）
 *
 * @param options - 插件配置选项
 * @returns Vite 插件实例
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import VitarxRouter from 'vitarx-router/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     VitarxRouter({
 *       pages: 'src/pages',
 *       pathStrategy: 'kebab',
 *       dts: 'typed-router.d.ts'
 *     })
 *   ]
 * })
 * ```
 */
export default function VitarxRouter(options: RouterPluginOptions = {}): Plugin {
  const state: PluginState = createInitialState()

  return {
    name: PLUGIN_NAME,

    /**
     * 配置钩子
     *
     * 在 Vite 解析配置前调用，用于识别是否为预览模式。
     * 预览模式下插件不执行任何操作，因为路由已在构建时生成。
     *
     * @param _config - Vite 配置对象（未使用）
     * @param env - 环境配置，包含命令模式和模式名称
     */
    config(_config, env) {
      state.isPreview = !!env.isPreview
    },

    /**
     * 配置解析完成钩子
     *
     * 在 Vite 配置解析完成后调用，此时可以访问完整的配置。
     * 用于创建 FileRouter 实例，初始化路由扫描。
     *
     * @throws 当 FileRouter 创建失败时抛出错误
     */
    async configResolved() {
      if (state.isPreview) return

      try {
        state.router = new FileRouter(options)
        info(`✨ File Router Manager created`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        warn(`Failed to create FileRouter: ${errorMessage}`)
        throw error
      }
    },

    /**
     * 模块 ID 解析钩子
     *
     * 用于解析虚拟模块 ID，将 `virtual:vitarx-router:routes`
     * 转换为内部使用的 `\0virtual:vitarx-router:routes`。
     *
     * @param id - 模块 ID
     * @returns 解析后的模块 ID，不匹配则返回 null
     */
    resolveId(id) {
      if (state.isPreview) return null
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_ROUTES_ID
      }
      return null
    },

    /**
     * 模块加载钩子
     *
     * 加载虚拟模块内容，生成路由配置代码。
     * 返回的代码会被 Vite 作为模块内容使用。
     *
     * @param id - 模块 ID
     * @returns 模块内容，不匹配则返回 null
     * @throws 当路由生成失败时抛出错误
     */
    async load(id) {
      if (!state.router) return null
      if (id !== RESOLVED_ROUTES_ID) return null

      try {
        return state.router.generate().code
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        warn(`Failed to generate routes: ${errorMessage}`)
        throw error
      }
    },

    /**
     * 代码转换钩子
     *
     * 转换页面文件代码，移除 `definePage` 宏调用。
     * `definePage` 作为全局宏使用，无需导入，构建时需要移除。
     *
     * @param code - 源代码
     * @param id - 文件路径
     * @returns 转换后的代码，无需转换则返回 null
     */
    transform(code, id) {
      if (!state.router) return null

      try {
        return state.router.removeDefinePage(code, id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        warn(`Failed to transform ${id}: ${errorMessage}`)
        return null
      }
    },

    /**
     * 配置开发服务器钩子
     *
     * 配置开发服务器的文件监听，实现热更新功能。
     * 当页面文件发生变化时，自动更新路由配置并触发 HMR。
     *
     * @param server - Vite 开发服务器实例
     */
    configureServer(server) {
      if (!state.router) return

      state.watcherHandler = setupWatcher(state.router, server)
    },

    /**
     * 构建结束钩子
     *
     * 在构建结束时清理资源，防止内存泄漏。
     * 清理文件监听器引用和路由管理器实例。
     */
    closeBundle() {
      if (state.watcherHandler) {
        state.watcherHandler = null
      }
      state.router = null
    }
  }
}
