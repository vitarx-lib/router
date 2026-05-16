/**
 * 导航状态
 *
 * 枚举值：
 * 1. success: 导航成功
 * 2. aborted: 导航被阻止
 * 4. cancelled: 导航被取消
 * 8. duplicated: 重复导航
 * 16. notfound: 路由未匹配
 * 32. external: 外部链接（不由路由器处理，useLink navigate 内使用）
 */
export enum NavState {
  success = 1 << 0, // 1  - 导航成功
  aborted = 1 << 1, // 2  - 导航被阻止
  cancelled = 1 << 2, // 4  - 导航被取消
  duplicated = 1 << 3, // 8  - 重复导航
  notfound = 1 << 4, // 16 - 路由未匹配
  external = 1 << 5 // 32 - 外部链接（不由路由器处理）
}

/**
 * 路由器注入键
 */
export const __ROUTER_KEY__ = Symbol.for('__v_router_inject_key')

/**
 * 路由器视图层级注入键
 */
export const __ROUTER_VIEW_DEPTH_KEY__ = Symbol.for('__v_router_view_depth_inject_key')
