export * from './widget/index.js'
export * from './router/index.js'

declare global {
  /**
   * 此全局类型用于，扩展路由索引类型，完善路由索引提示，提升开发体验。
   *
   * @example
   * ```ts
   * // 在项目中的全局类型声明文件中写入如下类型即可在使用push,replace方法时提示路由索引
   * type VitarxRouterRouteIndexTyped = 'home'|'page' // 添加自定义的路由
   * ```
   */
  type VitarxRouterRouteIndexTyped = string
}
