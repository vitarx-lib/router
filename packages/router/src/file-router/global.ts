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
   * 定义页面配置的函数
   *
   * 此函数在运行时无任何作用，仅用于自动化路由识别页面配置。
   * 在构建时会被 Vite 插件移除。
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
 * 实际类型声明通过 declare global 提供
 */
export {}
