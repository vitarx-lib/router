/**
 * @fileoverview 页面解析模块
 *
 * 负责解析页面文件路径，提取路由信息，包括：
 * - 路由路径转换
 * - 动态参数识别
 * - 路由名称生成
 *
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */
import path from 'node:path'
import type { FileReader, NamingStrategy, ParsedPage } from '../types.js'
import { parseDefinePage } from '../macros/index.js'
import { warn } from '../utils/logger.js'
import { applyNamingStrategyToName, applyNamingStrategyToPath } from '../utils/namingStrategy.js'
import { normalizePathSeparator } from '../utils/pathUtils.js'
import { checkDefaultExport, shouldCheckExport } from './exportChecker.js'

/** 动态参数匹配正则，如 [id]、[slug]、[param?] */
const DYNAMIC_PARAM_REGEX = /^\[(.+?)(\?)?]$/

/**
 * 解析文件名
 *
 * 提取文件名中的路由信息和动态参数。
 *
 * @param fileName - 文件名（不含扩展名）
 * @returns 解析结果
 */
function parseFileName(fileName: string): {
  name: string
  params: string[]
  isDynamic: boolean
} {
  const params: string[] = []
  let isDynamic = false

  const dynamicMatch = fileName.match(DYNAMIC_PARAM_REGEX)

  if (dynamicMatch) {
    isDynamic = true
    const paramName = dynamicMatch[1]
    const isOptional = !!dynamicMatch[2]
    params.push(paramName)
    return { name: `{${paramName}${isOptional ? '?' : ''}}`, params, isDynamic }
  }

  return { name: fileName, params, isDynamic }
}

/**
 * 生成路由名称
 *
 * @param relativePath - 相对于页面目录的路径
 * @param baseName - 文件基础名
 * @param pathPrefix - 路径前缀
 * @returns 路由名称
 */
function generateRouteName(
  relativePath: string,
  baseName: string,
  pathPrefix: string = ''
): string {
  const dirPath = path.dirname(relativePath)
  const segments: string[] = []

  if (pathPrefix) {
    const prefixName = pathPrefix
      .trim()
      .replace(/^\/+/, '')
      .replace(/[-\/]+$/, '')
      .trim()
    if (prefixName) {
      segments.push(prefixName)
    }
  }

  if (dirPath !== '.') {
    segments.push(...normalizePathSeparator(dirPath).split('/'))
  }

  if (baseName !== 'index' || dirPath === '.') {
    if (baseName === 'index' && dirPath === '.' && !pathPrefix) {
      segments.push('index')
    } else if (baseName !== 'index') {
      const dynamicMatch = baseName.match(DYNAMIC_PARAM_REGEX)
      if (dynamicMatch) {
        segments.push(dynamicMatch[1])
      } else {
        segments.push(baseName)
      }
    }
  }

  return segments.join('-')
}

/**
 * 构建路由路径
 *
 * @param isIndex - 是否为索引页面
 * @param dirPath - 目录路径
 * @param routeName - 路由名称
 * @param pathPrefix - 路径前缀
 * @returns 完整的路由路径
 */
function buildRoutePath(
  isIndex: boolean,
  dirPath: string,
  routeName: string,
  pathPrefix: string
): string {
  let routePath: string

  if (isIndex) {
    if (dirPath === '.') {
      routePath = '/'
    } else {
      routePath = '/' + normalizePathSeparator(dirPath)
    }
  } else {
    if (dirPath === '.') {
      routePath = '/' + routeName
    } else {
      routePath = '/' + normalizePathSeparator(dirPath) + '/' + routeName
    }
  }

  pathPrefix = pathPrefix.trim() === '/' ? '' : pathPrefix.trim()
  if (pathPrefix) {
    const normalizedPrefix = pathPrefix.startsWith('/') ? pathPrefix : `/${pathPrefix}`
    if (routePath === '/') {
      routePath = normalizedPrefix.replace(/\/+$/, '')
    } else {
      routePath = normalizedPrefix + routePath.slice(1)
    }
  }

  return routePath
}

/**
 * 解析视图名称
 *
 * 从文件名中提取命名视图名称。
 *
 * @param baseName - 文件基础名
 * @returns 视图名称和去除视图名的基础名
 */
function parseViewName(baseName: string): { viewName: string | null; baseWithoutView: string } {
  const viewSeparatorIndex = baseName.indexOf('@')
  if (viewSeparatorIndex > -1) {
    return {
      baseWithoutView: baseName.slice(0, viewSeparatorIndex),
      viewName: baseName.slice(viewSeparatorIndex + 1)
    }
  }
  return { viewName: null, baseWithoutView: baseName }
}

/**
 * 解析页面文件
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录绝对路径
 * @param parentPath - 父级路径（用于嵌套路由）
 * @param namingStrategy - 命名策略，默认为 'kebab'
 * @param pathPrefix - 路由路径前缀，默认为 ''
 * @param isLayout - 是否为布局文件，默认为 false
 * @param fileReader - 可选的自定义文件读取函数
 * @returns 解析后的页面信息，解析失败或无有效导出返回 null
 */
export async function parsePageFile(
  filePath: string,
  pagesDir: string,
  parentPath: string,
  namingStrategy: NamingStrategy = 'kebab',
  pathPrefix: string = '',
  isLayout: boolean = false,
  fileReader?: FileReader
): Promise<ParsedPage | null> {
  const fileName = path.basename(filePath)
  const ext = path.extname(fileName)
  const baseName = fileName.slice(0, -ext.length)

  const { viewName, baseWithoutView } = parseViewName(baseName)

  if (shouldCheckExport(ext)) {
    const exportCheck = await checkDefaultExport(filePath, pagesDir, fileReader)

    if (exportCheck.warning) {
      const pageOptions = await parseDefinePage(filePath, pagesDir, fileReader)
      if (!exportCheck.hasDefaultExport || !exportCheck.isFunctionOrClass) {
        if (!pageOptions?.redirect) {
          warn('页面文件缺少有效导出且未定义 redirect', `${filePath}\n    ${exportCheck.warning}`)
          return null
        }
      }
    }
  }

  const relativePath = path.relative(pagesDir, filePath)
  const dirPath = path.dirname(relativePath)

  const isIndex = isLayout ? false : baseWithoutView === 'index'

  const { name: routeName, params, isDynamic } = parseFileName(baseWithoutView)

  const routePath = buildRoutePath(isIndex, dirPath, routeName, pathPrefix)

  const pageOptions = await parseDefinePage(filePath, pagesDir, fileReader)

  const finalPath = applyNamingStrategyToPath(routePath, namingStrategy)
  const finalName =
    pageOptions?.name ||
    applyNamingStrategyToName(
      generateRouteName(relativePath, isLayout ? 'layout' : baseWithoutView, pathPrefix),
      namingStrategy
    )

  return {
    path: finalPath,
    filePath,
    name: finalName,
    params,
    isIndex,
    isDynamic,
    children: [],
    meta: pageOptions?.meta,
    pattern: pageOptions?.pattern,
    customName: pageOptions?.name,
    parentPath,
    redirect: pageOptions?.redirect,
    alias: pageOptions?.alias,
    viewName
  }
}
