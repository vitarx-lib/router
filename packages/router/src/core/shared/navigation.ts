import { NavState } from '../common/constant.js'
import type { NavigateResult } from '../types/index.js'

/**
 * 检查导航结果是否包含指定的状态
 * 支持 "按位或" 操作符进行多状态检查
 *
 * @param result - 导航结果
 * @param status - 要检查的状态
 * @returns {boolean} - 如果导航结果包含指定状态则返回true，否则返回false
 */
export function hasState(result: NavigateResult, status: NavState): boolean {
  return (result.state & status) === result.state
}

/**
 * 检查导航结果是否成功
 *
 * @param result - 导航结果
 * @returns {boolean} - 如果导航结果成功则返回true，否则返回false
 */
export function hasSuccess(result: NavigateResult): boolean {
  return result.state === NavState.success
}
