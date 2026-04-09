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
import type { Plugin } from 'vite'

import { FileRouter, type FileRouterOptions } from '../file-router/index.js'

/** 虚拟模块 ID：路由配置 */
const VIRTUAL_ROUTES_ID = 'virtual:vitarx-router:routes'

/** 解析后的路由模块 ID（Vite 内部使用） */
const RESOLVED_ROUTES_ID = '\0' + VIRTUAL_ROUTES_ID

/**
 * Vite 插件配置选项
 *
 * 扩展自 FileRouterOptions，添加 Vite 特有的配置项。
 */
export interface RouterPluginOptions extends FileRouterOptions {}
/**
 * 创建 Vitarx Router Vite 插件
 *
 * @param options - 插件配置选项
 * @returns Vite 插件实例
 */
export default function VitarxRouter(options: RouterPluginOptions = {}): Plugin {
  let router: FileRouter | null = null
  let isPreview: boolean = false
  return {
    name: 'vite-plugin-vitarx-router',
    enforce: 'pre',

    config(_, env) {
      isPreview = !!env.isPreview
    },
    async configResolved() {
      if (isPreview) return
      router = new FileRouter(options)
    },

    resolveId(id) {
      if (isPreview) return null
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_ROUTES_ID
      }
      return null
    },

    async load(id) {
      if (!router) return null
      if (id === RESOLVED_ROUTES_ID) {
        return router.generate().code
      }
      return null
    },

    transform(code, id) {
      if (!router) return null
      return router.removeDefinePage(code, id)
    },

    configureServer(server) {
      if (!router) return
      const currentRouter = router
      const absolutePagesDirs = router.config.pages
      for (const dirConfig of absolutePagesDirs) {
        server.watcher.add(dirConfig.dir)
      }
      // 监听所有变化事件 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
      server.watcher.on('all', (event, file) => {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ROUTES_ID)
        if (mod) {
          const result = currentRouter.handleChange(event, file)
          // 如果 handleChange 返回 true，则表示路由受到影响，需要更新模块
          if (result) server.moduleGraph.invalidateModule(mod)
        }
      })
    }
  }
}
