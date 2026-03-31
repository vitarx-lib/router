/**
 * @fileoverview 全局类型声明
 *
 * 为 definePage 全局宏函数提供 TypeScript 类型支持。
 * 开发者需要在 tsconfig.json 中显式配置 types 才能使用这些全局类型。
 *
 * @example
 * ```json
 * {
 *   "compilerOptions": {
 *     "types": ["vitarx-router/global"]
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 或者在 TypeScript 文件顶部添加三斜杠指令
 * /// <reference types="vitarx-router/global" />
 * ```
 */
import type { PageOptions } from './types.js'

declare global {
  /**
   * 文件路由全局宏函数
   *
   * 此函数专门用于文件路由的配置，运行时会自动移除。
   *
   * 支持的配置项包括：
   * - `name`：页面名称
   * - `meta`：页面元信息
   * - `pattern`：页面参数模式
   * - `redirect`：页面重定向
   * - `alias`：页面别名
   *
   *
   * @param options - 页面配置选项
   *
   * @example
   * ```tsx
   * definePage({
   *   name: 'user-detail',
   *   meta: { title: '用户详情', requiresAuth: true },
   *   pattern: { id: /^\d+$/ }
   * })
   *
   * export default function UserDetail() {
   *   return <div>User Detail</div>
   * }
   * ```
   */
  function definePage(options: PageOptions): void
}

/**
 * 导出空对象以保持模块结构
 */
export {}
