/**
 * @fileoverview 文件路由模块入口
 *
 * 统一导出文件路由系统的公共 API。
 * 核心实现位于 manager/ 目录，按职责拆分为：
 * - file-classifier: 文件分类（页面/布局/配置/忽略）
 * - file-processor: 文件处理（配置解析、布局注册、页面路由创建）
 * - scanner: 目录扫描（递归扫描文件系统，构建路由树）
 * - route-updater: 增量更新（添加/移除/更新路由，支持 HMR）
 * - manager/index.ts: 编排层（FileRouter 类，组合上述模块）
 */
export { resolvePageConfigs } from './config/resolve.js'
export * from './generator/index.js'
export { mergePageOptions } from './macros/definePage.js'
export { FileRouter, type FileWatcherEvent } from './manager/index.js'
export type * from './types/index.js'
export { findRoute } from './utils/findRoute.js'
export * from './utils/logger.js'
