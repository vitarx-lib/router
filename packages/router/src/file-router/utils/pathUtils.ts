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
  return path.trim().replace(/\\/g, '/').replace(/\/+/g, '/')
}
/**
 * 归一化path
 *
 * 去除所有空格、替换重复的斜杠、去除尾部的斜杠
 *
 * @example
 * normalizePath('/  foo') // '/foo'
 * normalizePath('/foo/') // '/foo'
 * normalizePath('/foo/bar') // '/foo/bar'
 * normalizePath('foo/') // '/foo'
 *
 * @param {string} path - 路径字符串
 * @return {string} - 格式化后的路径字符串
 */
export function normalizeRoutePath(path: string): string {
  // 去除所有空格 处理重复//
  const formated = `/${path.trim()}`.replace(/\s+/g, '').replace(/\/+/g, '/')
  if (formated === '/') return formated
  return formated.replace(/\/$/, '')
}

/** 动态参数匹配正则，如 [id]、[slug]、[param?] */
const DYNAMIC_PARAM_REGEX = /\{([^?}]+)(\?)?}|\[([^\]]+)]/g

/**
 * 解析文件名
 *
 * 提取文件名中的路由信息和动态参数。
 *
 * @param path - path
 * @returns 解析结果
 */
export function resolvePathVariable(path: string): string {
  if (!path.includes('[')) return path
  // 使用 replace 遍历所有匹配项，避免只有第一个参数被替换的问题
  return path.replace(DYNAMIC_PARAM_REGEX, (_match, braceName, isOptional, bracketName): string => {
    // 获取参数名：如果有 braceName 就用 braceName，否则用 bracketName
    const paramName = braceName || bracketName
    // 处理可选标识：如果有 isOptional(即问号) 就加上 '?'
    const optionalMark = isOptional ? '?' : ''
    return `{${paramName}${optionalMark}}`
  })
}

/**
 * 检查路径是否包含动态参数
 *
 * @param path - 路由路径
 * @returns {boolean} 是否包含动态参数
 */
export function hasDynamicPath(path: string): boolean {
  return path.includes('{')
}
