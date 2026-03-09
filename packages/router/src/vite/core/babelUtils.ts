import generate, { type GeneratorResult } from '@babel/generator'
import traverse from '@babel/traverse'

/**
 * 导出一个babel生成函数，该函数根据generate的类型决定如何调用它
 * @param params - 传递给generate函数的参数，使用Parameters<typeof generate>获取generate函数的参数类型
 * @returns {GeneratorResult} 返回GeneratorResult类型的结果
 */
export function babelGenerate(...params: Parameters<typeof generate>): GeneratorResult {
  // 根据generate的类型决定使用哪个函数
  // 如果generate是对象类型，则使用其default属性（处理ES模块默认导出的情况）
  // 否则直接使用generate（处理CommonJS导出的情况）
  const fn: typeof generate = typeof generate === 'object' ? (generate as any).default : generate
  // 调用处理后的函数并返回结果
  return fn(...params)
}

/**
 * babelTraverse函数 - 封装了babel的traverse函数，处理模块导出兼容性问题
 * 该函数解决了在不同环境下traverse模块可能作为默认导出或命名导出的问题
 *
 * @param params - 接收与traverse函数相同的参数
 * @returns {void} - 不返回任何值
 */
export function babelTraverse(...params: Parameters<typeof traverse>): void {
  // 根据traverse的类型判断是使用默认导出还是直接使用traverse
  const fn: typeof traverse = typeof traverse === 'object' ? (traverse as any).default : traverse
  // 调用处理后的traverse函数并传入参数
  return fn(...params)
}
