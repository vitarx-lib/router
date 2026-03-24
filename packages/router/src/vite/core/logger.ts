/**
 * @fileoverview 日志工具模块
 *
 * 提供与 Vite 一致的日志输出格式，支持颜色和时间戳。
 */

import chalk from 'chalk'

/**
 * 日志级别
 */
type LogLevel = 'info' | 'warn' | 'error'

/**
 * 格式化时间戳（与 Vite 格式一致）
 * @returns 格式化的时间戳字符串， */
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
 * 基础日志函数
 * @param level 日志级别
 * @param message 日志消息
 * @param context 上下文信息
 */
function log(level: LogLevel, message: string, context?: string): void {
  const timestamp = formatTimestamp()
  let levelColor: (text: string) => string

  switch (level) {
    case 'info':
      levelColor = chalk.green
      break
    case 'warn':
      levelColor = chalk.yellow
      break
    case 'error':
      levelColor = chalk.red
      break
    default:
      levelColor = chalk.white
  }

  const prefix = `${chalk.gray(timestamp)} ${chalk.cyan(`[router]`)}`
  const contextPart = context ? ` ${chalk.gray(`(${context})`)}` : ''

  console.log(`${prefix}${contextPart} ${levelColor(message)}`)
}

/**
 * 信息级日志
 * @param message 日志消息
 * @param context 上下文信息
 */
export function info(message: string, context?: string): void {
  log('info', message, context)
}

/**
 * 警告级日志
 * @param message 日志消息
 * @param context 上下文信息
 */
export function warn(message: string, context?: string): void {
  log('warn', message, context)
}

/**
 * 错误级日志
 * @param message 日志消息
 * @param context 上下文信息
 */
export function error(message: string, context?: string): void {
  log('error', message, context)
}
