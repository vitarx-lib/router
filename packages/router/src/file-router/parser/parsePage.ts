/**
 * @fileoverview 页面解析模块
 *
 * 负责解析页面文件路径，提取路由信息，包括：
 * - 路由路径转换
 *
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */
import path from 'node:path'
import type { PageParser, PageParseResult } from '../types/index.js'

/**
 * 路径解析错误类
 *
 * 提供详细的错误上下文信息，包括文件路径、错误类型和原始值。
 */
export class PageParseError extends TypeError {
  /** 文件路径上下文 */
  readonly filePath?: string
  /** 错误字段名称 */
  readonly field?: string
  /** 原始值 */
  readonly originalValue?: unknown

  constructor(
    message: string,
    options?: {
      filePath?: string
      field?: string
      originalValue?: unknown
      cause?: Error
    }
  ) {
    super(message, { cause: options?.cause })
    this.name = 'PathParseError'
    this.filePath = options?.filePath
    this.field = options?.field
    this.originalValue = options?.originalValue

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PageParseError)
    }
  }

  /**
   * 生成详细的错误信息
   */
  override toString(): string {
    let details = `${this.name}: ${this.message}`
    if (this.filePath) {
      details += `\n  File: ${this.filePath}`
    }
    if (this.field) {
      details += `\n  Field: ${this.field}`
    }
    if (this.originalValue !== undefined) {
      details += `\n  Value: ${String(this.originalValue)}`
    }
    return details
  }
}

/**
 * 解析路由路径和视图名称
 *
 * 从文件名中提取路由路径和命名视图名称。
 *
 * @param filePath - 文件路径
 * @param [parser] - 自定义解析器
 * @param [precomputed] - 预计算的文件信息，避免重复解析文件路径
 * @returns 路径解析结果
 * @throws {PageParseError} 当路径解析失败时抛出
 */
export function parsePageFile(
  filePath: string,
  parser?: PageParser,
  precomputed?: FileInfo
): PageParseResult {
  const info = precomputed ?? extractFileInfo(filePath)

  if (!parser) {
    return defaultPageParser(info.rawName, info.viewName)
  }

  const result = parser(info.basename, filePath)
  return parseCustomResult(result, filePath)
}

/**
 * 文件信息
 *
 * 从文件路径中提取的结构化信息，作为文件名解析的唯一来源。
 */
export interface FileInfo {
  /** 文件名（不含扩展名），如 home@sidebar → home@sidebar */
  basename: string
  /** 路由名（@之前的部分），如 home@sidebar → home */
  rawName: string
  /** 视图名称（@之后的部分），如 home@sidebar → sidebar */
  viewName: string | undefined
}

/**
 * 提取文件信息
 *
 * 从文件路径中提取文件名、路由名和视图名称。
 * 这是文件名解析的唯一入口，其他模块应复用此函数而非重复实现。
 *
 * @param filePath - 文件路径
 * @returns 文件信息
 */
export function extractFileInfo(filePath: string): FileInfo {
  const ext = path.extname(filePath)
  const basename = path.basename(filePath, ext)
  const [rawName, viewName] = basename.split('@', 2)
  return { basename, rawName, viewName }
}

/**
 * 解析默认路由路径（无自定义解析器）
 *
 * @param rawName - 路由名（@之前的部分）
 * @param viewName - 视图名称（@之后的部分）
 * @returns 解析结果
 */
function defaultPageParser(rawName: string, viewName?: string): PageParseResult {
  const routePath = normalizeRoutePath(rawName)
  if (!routePath) {
    throw new PageParseError('PageParser returned empty path', {
      filePath: rawName,
      originalValue: rawName,
      field: 'path'
    })
  }
  return {
    path: routePath,
    viewName
  }
}

/**
 * 解析自定义解析器结果
 *
 * @param result - 解析器返回的结果
 * @param filePath - 文件路径（用于错误上下文）
 * @returns 解析结果
 * @throws {PageParseError} 当结果无效时抛出
 */
function parseCustomResult(result: string | PageParseResult, filePath: string): PageParseResult {
  if (typeof result === 'string') {
    const [rawName, viewName] = result.split('@', 2)
    return defaultPageParser(rawName, viewName)
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return parseObjectResult(result, filePath)
  }

  throw new PageParseError('PageParser returned invalid result type', {
    filePath,
    originalValue: result
  })
}

/**
 * 解析对象类型的结果
 *
 * @param result - 对象结果
 * @param filePath - 文件路径
 * @returns 解析结果
 * @throws {PageParseError} 当结果无效时抛出
 */
function parseObjectResult(result: PageParseResult, filePath: string): PageParseResult {
  const { path: rawRoutePath, viewName, options } = result
  validateRoutePathType(rawRoutePath, filePath)
  const routePath = normalizeRoutePath(rawRoutePath)
  if (!routePath) {
    throw new PageParseError('PageParser returned empty path after normalization', {
      filePath,
      originalValue: rawRoutePath,
      field: 'path'
    })
  }
  validateViewName(viewName, filePath)
  validateOptions(options, filePath)
  return {
    ...result,
    path: routePath
  }
}

/**
 * 验证路由路径类型
 *
 * @param routePath - 路由路径
 * @param filePath - 文件路径（用于错误上下文）
 * @throws {PageParseError} 当类型无效时抛出
 */
function validateRoutePathType(routePath: unknown, filePath: string): asserts routePath is string {
  if (typeof routePath !== 'string') {
    throw new PageParseError('PageParser returned non-string path', {
      filePath,
      originalValue: routePath,
      field: 'path'
    })
  }

  if (!routePath.trim()) {
    throw new PageParseError('PageParser returned empty or whitespace-only path', {
      filePath,
      originalValue: routePath,
      field: 'path'
    })
  }
}

/**
 * 验证视图名称
 *
 * @param viewName - 视图名称
 * @param filePath - 文件路径（用于错误上下文）
 * @throws {PageParseError} 当视图名称无效时抛出
 */
function validateViewName(viewName: unknown, filePath: string): void {
  if (viewName !== undefined && typeof viewName !== 'string') {
    throw new PageParseError('PageParser returned non-string viewName', {
      filePath,
      originalValue: viewName,
      field: 'viewName'
    })
  }
}

/**
 * 验证选项
 *
 * @param options - 选项
 * @param filePath - 文件路径
 */
function validateOptions(options: unknown, filePath: string) {
  if (options !== undefined && Object.prototype.toString.call(options) !== '[object Object]') {
    throw new PageParseError('PageParser returned invalid options type', {
      filePath,
      originalValue: options,
      field: 'options'
    })
  }
}
/**
 * 标准化路由路径
 *
 * 去除路径首尾空白和首尾的斜杠，将 . # 等不利于 URL 的字符替换为 -。
 *
 * @param routePath - 原始路由路径
 * @returns 标准化后的路由路径
 */
function normalizeRoutePath(routePath: string): string {
  return routePath
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[.#]/g, '-')
}
