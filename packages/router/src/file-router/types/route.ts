/**
 * 页面可配置路由选项（definePage）
 */
import type { RouteMetaData } from '../../core/index.js'

export interface RedirectConfig {
  /**
   * 路由索引，支持path或name
   */
  index: string
  /**
   * 查询参数
   */
  query?: Record<string, string>
  /**
   * URL动态参数
   */
  params?: Record<string, string>
}

export interface PageOptions {
  /**
   * 路由名称
   */
  name?: string
  /**
   * 路由元数据
   */
  meta?: RouteMetaData
  /**
   * 动态参数匹配模式
   */
  pattern?: Record<string, RegExp>
  /**
   * 重定向配置
   */
  redirect?: string | RedirectConfig
  /**
   * 路由别名
   */
  alias?: string | string[]
}

/**
 * 扫描的节点 - 核心 IR 节点
 */
export interface ScanNode {
  /**
   * 目录配置文件
   */
  dirConfigFile?: string
  /**
   * 是否为分组
   */
  readonly isGroup: boolean
  /**
   * 文件绝对路径
   */
  readonly filePath: string
  /**
   * 当前 path（不含父级）
   */
  readonly path: string
  /**
   * 父节点
   */
  parent?: ScanNode
  /**
   * 子节点映射
   */
  children?: Set<ScanNode>
  /**
   * 组件映射（命名视图）
   */
  components?: Record<string, string>
  /**
   * 页面配置选项
   */
  options?: PageOptions
}

/**
 * 路由节点 - 解析后的路由节点
 */
export interface RouteNode extends PageOptions {
  /**
   * 文件绝对路径
   */
  filePath: string
  /**
   * 当前 path（不含父级）
   */
  path: string
  /**
   * 完整 path（含父级）
   */
  fullPath: string
  /**
   * 子节点
   */
  children?: RouteNode[]
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
