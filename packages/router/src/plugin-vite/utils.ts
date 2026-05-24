import type { ModuleNode, ViteDevServer } from 'vite'
import { FileRouter, type FileWatcherEvent } from '../file-router/index.js'

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
 * 设置文件监听器
 *
 * 为开发服务器配置文件监听，监听页面目录下的文件变化。
 * 当文件发生变化时，自动更新路由配置并触发 HMR。
 *
 * @param router - 文件路由管理器实例
 * @param server - Vite 开发服务器实例
 * @param handleFileChange - 文件变化处理函数
 * @param delay - 节流延迟时间（毫秒）
 * @returns 文件监听器处理函数，用于后续清理
 */
export function setupWatcher(
  router: FileRouter,
  server: ViteDevServer,
  handleFileChange: (event: FileWatcherEvent, file: string) => void,
  delay: number = 100
): (event: FileWatcherEvent, file: string) => void {
  const pagesDirs = router.config.pages

  for (const dirConfig of pagesDirs) {
    server.watcher.add(dirConfig.dir)
  }

  const handler = createBatchThrottledHandler(handleFileChange, delay)

  server.watcher.on('all', handler)

  return handler
}

/**
 * 递归收集模块的所有物理文件依赖者
 *
 * 从指定模块出发，沿着 importer 链向上递归遍历，
 * 收集所有物理文件模块（排除虚拟模块和带查询参数的模块）。
 * 用于 HMR 更新时找到所有需要接收更新通知的物理文件。
 *
 * 例如对于依赖链：`router/index.ts → auto-routes/index.ts → virtual:routes`
 * 从 `virtual:routes` 出发，会收集到 `auto-routes/index.ts` 和 `router/index.ts`
 *
 * @param mod - 起始模块节点
 * @param [visited] - 已访问模块集合，防止循环引用
 * @returns 物理文件模块节点数组
 */
export function collectPhysicalImporters(
  mod: ModuleNode,
  visited: Set<ModuleNode> = new Set()
): ModuleNode[] {
  const result: ModuleNode[] = []

  for (const importer of mod.importers) {
    if (visited.has(importer)) continue
    visited.add(importer)

    const isPhysical = !importer.url.startsWith('\0') && !importer.url.includes('?')
    if (isPhysical) {
      result.push(importer)
    }

    // 继续向上递归查找（无论当前是否为物理文件，都继续遍历）
    result.push(...collectPhysicalImporters(importer, visited))
  }

  return result
}
