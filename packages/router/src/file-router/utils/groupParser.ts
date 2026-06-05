/**
 * @fileoverview 分组目录解析工具
 *
 * 提供 groupParser 的调用封装，将目录名解析为路由路径和选项。
 * 供扫描器和路径计算等模块共同使用。
 */
import type { PageOptions } from '../types/index.js'

/**
 * 解析分组目录的自定义路径和选项
 *
 * 通过 groupParser 解析目录名，支持两种返回格式：
 * 1. 字符串：仅自定义路径
 * 2. 对象：自定义路径 + 路由选项（如 meta、name 等）
 *
 * 未配置 groupParser 时，直接使用原始目录名作为路径。
 *
 * @param fileName - 目录名
 * @param filePath - 目录完整路径
 * @param groupParser - 分组解析器，可选
 * @returns 解析后的路径和选项
 */
export function parseGroupResult(
  fileName: string,
  filePath: string,
  groupParser?: (
    dirName: string,
    dirPath: string
  ) => string | { path: string; options?: PageOptions }
): { routePath: string; options?: PageOptions } {
  if (!groupParser) {
    return { routePath: fileName }
  }
  const result = groupParser(fileName, filePath)
  if (typeof result === 'string') {
    return { routePath: result }
  }
  return { routePath: result.path, options: result.options }
}
