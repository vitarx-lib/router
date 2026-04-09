/**
 * @fileoverview 文件读取工具模块
 *
 * 提供文件读取的默认实现和自定义读取函数的调用封装。
 */
import { readFileSync } from 'node:fs'
import type { CodeTransformHook } from '../types/index.js'

/**
 * 读取文件内容
 *
 * 根据是否提供自定义读取函数，选择相应的读取方式。
 *
 * @param filePath - 文件绝对路径
 * @param transform - 代码转换钩子
 * @returns 文件内容
 */
export function readFileContent(filePath: string, transform?: CodeTransformHook): string {
  const content = readFileSync(filePath, 'utf-8')
  if (transform) {
    return transform(content, filePath)
  }
  return content
}
