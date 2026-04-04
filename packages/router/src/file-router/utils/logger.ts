/**
 * @fileoverview 日志工具模块
 *
 * 提供统一的日志输出格式，支持颜色和时间戳。
 * 可用于任何环境，不依赖特定构建工具。
 */

import chalk from 'chalk'

/**
 * 日志级别
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

/**
 * 全局日志上下文
 */
let globalLogPrefix: string = 'vitarx-router'

/**
 * 是否启用调试日志
 */
let debugEnabled: boolean = false

/**
 * 设置日志上下文
 *
 * @param prefix - 前缀字符串
 */
export function setLogPrefix(prefix: string): void {
  globalLogPrefix = prefix
}

/**
 * 启用/禁用调试日志
 *
 * @param enabled - 是否启用
 */
export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled
}

/**
 * 格式化时间戳
 * @returns 格式化的时间戳字符串
 */
function formatTimestamp(): string {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes}:${seconds} ${period}`
}

/**
 * 获取日志级别颜色
 * @param level 日志级别
 * @returns 颜色函数
 */
function getLevelColor(level: LogLevel): (text: string) => string {
  switch (level) {
    case 'info':
      return chalk.green
    case 'warn':
      return chalk.yellow
    case 'error':
      return chalk.red
    case 'debug':
      return chalk.gray
    default:
      return chalk.white
  }
}

/**
 * 基础日志函数
 * @param level 日志级别
 * @param message 日志消息
 * @param details 详细信息（可选）
 */
function log(level: LogLevel, message: string, details?: string): void {
  if (level === 'debug' && !debugEnabled) {
    return
  }

  const timestamp = formatTimestamp()
  const levelColor = getLevelColor(level)

  const prefix = `${chalk.gray(timestamp)} ${chalk.cyan(`[${globalLogPrefix}]`)}`
  const levelTag = chalk.gray(`(${level})`)
  const detailsPart = details ? `\n    ${chalk.gray(details)}` : ''

  console.log(`${prefix} ${levelTag} ${levelColor(message)}${detailsPart}`)
}

/**
 * 信息级日志
 *
 * 用于输出正常的操作信息。
 *
 * @param message 日志消息
 * @param details 详细信息（可选）
 */
export function info(message: string, details?: string): void {
  log('info', message, details)
}

/**
 * 警告级日志
 *
 * 用于输出警告信息，表示可能存在问题但不影响运行。
 *
 * @param message 日志消息
 * @param details 详细信息（可选）
 */
export function warn(message: string, details?: string): void {
  log('warn', message, details)
}

/**
 * 错误级日志
 *
 * 用于输出错误信息，表示出现了需要关注的问题。
 *
 * @param message 日志消息
 * @param details 详细信息（可选）
 */
export function error(message: string, details?: string): void {
  log('error', message, details)
}

/**
 * 调试级日志
 *
 * 用于输出调试信息，默认不显示，需要通过 setDebugEnabled(true) 启用。
 *
 * @param message 日志消息
 * @param details 详细信息（可选）
 */
export function debug(message: string, details?: string): void {
  log('debug', message, details)
}
