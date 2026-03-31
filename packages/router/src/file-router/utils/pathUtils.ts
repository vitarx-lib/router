/**
 * @fileoverview 路径处理工具模块
 *
 * 提供路径规范化、分隔符转换等通用路径处理功能。
 * 消除代码中重复的路径处理逻辑。
 */

/**
 * 规范化路径分隔符
 *
 * 将 Windows 风格的反斜杠路径转换为 Unix 风格的正斜杠路径。
 * 这是跨平台路径处理的标准做法。
 *
 * @param path - 输入路径
 * @returns 使用正斜杠的规范化路径
 *
 * @example
 * ```typescript
 * normalizePathSeparator('src\\pages\\index.tsx')  // => 'src/pages/index.tsx'
 * normalizePathSeparator('src/pages/index.tsx')    // => 'src/pages/index.tsx'
 * ```
 */
export function normalizePathSeparator(path: string): string {
  return path.replace(/\\/g, '/')
}
