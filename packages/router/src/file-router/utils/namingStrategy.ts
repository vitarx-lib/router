/**
 * @fileoverview 命名策略工具模块
 *
 * 提供路由名称和路径的命名转换功能，支持三种策略：
 * - kebab: 将驼峰命名转换为 kebab-case（默认）
 * - lowercase: 简单转换为小写
 * - none: 保持原始命名
 *
 * 注意：只处理路径段名称，不处理动态参数变量名。
 */
import type { NamingStrategy } from '../types.js'

/**
 * 将驼峰命名转换为 kebab-case
 *
 * @param str - 输入字符串
 * @returns kebab-case 格式的字符串
 *
 * @example
 * ```typescript
 * toKebabCase('MainHome')     // => 'main-home'
 * toKebabCase('UserProfile')  // => 'user-profile'
 * toKebabCase('API')          // => 'api'
 * toKebabCase('XMLParser')    // => 'xml-parser'
 * ```
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/**
 * 应用命名策略转换字符串
 *
 * @param str - 输入字符串
 * @param strategy - 命名策略
 * @returns 转换后的字符串
 *
 * @example
 * ```typescript
 * applyNamingStrategy('MainHome', 'kebab')     // => 'main-home'
 * applyNamingStrategy('MainHome', 'lowercase') // => 'mainhome'
 * applyNamingStrategy('MainHome', 'none')      // => 'MainHome'
 * ```
 */
export function applyNamingStrategy(str: string, strategy: NamingStrategy): string {
  switch (strategy) {
    case 'kebab':
      return toKebabCase(str)
    case 'lowercase':
      return str.toLowerCase()
    case 'none':
    default:
      return str
  }
}

/**
 * 动态参数正则表达式
 * 匹配 {paramName} 或 {paramName?} 格式
 */
const DYNAMIC_PARAM_REGEX = /\{([^}]+)}/g

/**
 * 应用命名策略转换路由路径
 *
 * 只处理路径段名称，不处理动态参数变量名。
 *
 * @param path - 路由路径
 * @param strategy - 命名策略
 * @returns 转换后的路径
 *
 * @example
 * ```typescript
 * applyNamingStrategyToPath('/MainHome', 'kebab')     // => '/main-home'
 * applyNamingStrategyToPath('/User/{userName}', 'kebab')  // => '/user/{userName}'
 * applyNamingStrategyToPath('/API/UserProfile', 'kebab')  // => '/api/user-profile'
 * ```
 */
export function applyNamingStrategyToPath(path: string, strategy: NamingStrategy): string {
  if (strategy === 'none') {
    return path
  }

  const segments = path.split('/')
  const result: string[] = []

  for (const segment of segments) {
    if (segment === '') {
      result.push(segment)
      continue
    }

    if (DYNAMIC_PARAM_REGEX.test(segment)) {
      result.push(segment)
      DYNAMIC_PARAM_REGEX.lastIndex = 0
      continue
    }

    result.push(applyNamingStrategy(segment, strategy))
  }

  return result.join('/')
}

/**
 * 应用命名策略转换路由名称
 *
 * @param name - 路由名称
 * @param strategy - 命名策略
 * @returns 转换后的名称
 *
 * @example
 * ```typescript
 * applyNamingStrategyToName('MainHome', 'kebab')     // => 'main-home'
 * applyNamingStrategyToName('user-MainHome', 'kebab')  // => 'user-main-home'
 * ```
 */
export function applyNamingStrategyToName(name: string, strategy: NamingStrategy): string {
  if (strategy === 'none') {
    return name
  }

  const parts = name.split('-')
  return parts.map(part => applyNamingStrategy(part, strategy)).join('-')
}
