/**
 * 导航结果
 *
 * 枚举值：
 * 0. success: 导航成功
 * 1. aborted: 导航被阻止
 * 2. cancelled: 导航被取消
 * 3. duplicated: 重复导航
 * 4. not_matched: 路由未匹配
 * 5. exception: 捕获到异常
 */
export enum NavigateStatus {
  /**
   * 导航成功
   */
  success,
  /**
   * 导航被阻止
   */
  aborted,
  /**
   * 导航被取消
   *
   * 正在等待中间件处理结果时又触发了新的导航请求
   */
  cancelled,
  /**
   * 重复导航
   */
  duplicated,
  /**
   * 路由未匹配
   */
  not_matched,
  /**
   * 捕获到异常
   */
  exception
}

export const ROUTER = Symbol.for('__v_router')
