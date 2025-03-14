export * from './widgets/index.js'
export * from './core/index.js'

declare global {
  /**
   * 此全局类型用于，扩展路由索引类型，完善路由索引提示，提升开发体验。
   *
   * @example
   * ```ts
   * // 在项目中的全局类型声明文件中写入如下类型即可在使用push,replace方法时提示路由索引
   * type RouterRouteIndexTyped = '/home'|'home'
   * ```
   */
  type RouterRouteIndexTyped = string

  /**
   * 此全局类型用于，扩展路由元数据类型，完善路由元数据提示，提升开发体验。
   *
   * @example
   * ```ts
   * // 在项目中的全局类型声明文件中写入如下类型即可在使用路由元数据时提示
   * interface RouteMetaData {
   *   title: string
   *   icon: string
   * }
   * ```
   */
  interface RouteMetaData {
    [key: string]: any
  }
}
