/**
 * @fileoverview 页面解析模块
 *
 * 负责解析页面文件路径，提取路由信息，包括：
 * - 路由路径转换
 *
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */

type PathParseResult = {
  viewName: string
  routePath: string
}

/**
 * 解析视图名称
 *
 * 从文件名中提取命名视图名称。
 *
 * @param baseName - 文件基础名，不包含后缀
 * @param defaultName - 默认视图名称
 * @returns 视图名称和去除视图名的基础名
 */
export function parseRoutePath(baseName: string, defaultName: string = 'default'): PathParseResult {
  let [routePath, viewName] = baseName.split('@')
  return { viewName: viewName || defaultName, routePath }
}
