import type { PageOptions } from './page.js'

export interface RouteNode extends PageOptions {
  /**
   * 当前 path（不含父级）
   */
  readonly path: string
  /**
   * 完整 path（含父级）
   */
  readonly fullPath: string
  /**
   * 子节点映射
   */
  children?: readonly RouteNode[]
  /**
   * 组件映射（命名视图）
   *
   * @example
   * ```js
   * {
   *   default: '/src/pages/Home.jsx', // 实际为系统绝对路径！
   *   sidebar: '/src/pages/Sidebar.jsx'
   * }
   * ```
   */
  component?: Record<string, string>
}
