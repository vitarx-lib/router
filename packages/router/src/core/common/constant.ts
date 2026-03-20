/**
 * 导航状态
 *
 * 枚举值：
 * 0. success: 导航成功
 * 1. aborted: 导航被阻止
 * 2. cancelled: 导航被取消
 * 3. duplicated: 重复导航
 * 4. notfound: 路由未匹配
 * 5. exception: 捕获到异常
 */
export enum NavState {
  /**
   * 导航成功 (二进制: 0001)
   */
  success = 1 << 0, // 1
  /**
   * 导航被阻止 (二进制: 0010)
   */
  aborted = 1 << 1, // 2
  /**
   * 导航被取消 (二进制: 0100)
   */
  cancelled = 1 << 2, // 4
  /**
   * 重复导航 (二进制: 1000)
   */
  duplicated = 1 << 3, // 8
  /**
   * 路由未匹配 (二进制: 10000)
   */
  notfound = 1 << 4 // 16
}

export const __ROUTER_KEY__ = Symbol.for('__v_router_inject_key')
