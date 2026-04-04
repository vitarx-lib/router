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
import type { Plugin, ViteDevServer } from 'vite'

import { FileRouter, info } from '../file-router/index.js'
import type { FileRouterOptions } from '../file-router/types.js'

/** 默认的类型声明文件路径 */
export const DEFAULT_DTS_FILE = 'typed-router.d.ts'

/** 虚拟模块 ID：路由配置 */
const VIRTUAL_ROUTES_ID = 'virtual:vitarx-router:routes'

/** 解析后的路由模块 ID（Vite 内部使用） */
const RESOLVED_ROUTES_ID = '\0' + VIRTUAL_ROUTES_ID

/**
 * Vite 插件配置选项
 *
 * 扩展自 FileRouterOptions，添加 Vite 特有的配置项。
 */
export interface RouterPluginOptions extends FileRouterOptions {
  /**
   * 类型声明文件路径，设为 false 可禁用生成
   *
   * @default 'typed-router.d.ts'
   */
  dts?: string | false
}

/**
 * 创建 Vitarx Router Vite 插件
 *
 * @param options - 插件配置选项
 * @returns Vite 插件实例
 */
export default function VitarxRouter(options: RouterPluginOptions = {}): Plugin {
  const dts = options.dts ?? DEFAULT_DTS_FILE
  const router = new FileRouter(options)
  let isPreview: boolean = false
  return {
    name: 'vite-plugin-vitarx-router',
    enforce: 'pre',

    config(_, env) {
      isPreview = !!env.isPreview
    },
    configResolved() {
      if (isPreview) return
      router.scan()
      if (dts) {
        const result = router.writeDts(dts)
        info(`✨ generate type definitions:\n${chalk.yellow(result.path)}`)
      }
    },

    resolveId(id) {
      if (isPreview) return null
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_ROUTES_ID
      }
      return null
    },

    async load(id) {
      if (isPreview) return null
      if (id === RESOLVED_ROUTES_ID) {
        const { code } = await router.generateRoutes()
        return code
      }
      return null
    },

    transform(code, id) {
      if (isPreview) return null
      return router.removeDefinePage(code, id)
    },

    configureServer(server) {
      if (isPreview) return
      const absolutePagesDirs = router.config.pages
      for (const dirConfig of absolutePagesDirs) {
        server.watcher.add(dirConfig.dir)
      }

      const handlePageFileChange = (file: string, server: ViteDevServer): void => {
        if (router.isPageFile(file)) {
          router.scan()
          if (dts) {
            router.writeDts(dts)
          }
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
