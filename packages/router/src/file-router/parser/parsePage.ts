/**
 * @fileoverview 页面解析模块
 *
 * 负责解析页面文件路径，提取路由信息，包括：
 * - 路由路径转换
 *
 * 与构建工具无关，可在任何 Node.js 环境中使用。
 */
import path from 'node:path'
import type { PathParser, PathParseResult } from '../types/index.js'

/**
 * 路径解析错误类
 *
 * 提供详细的错误上下文信息，包括文件路径、错误类型和原始值。
 */
export class PathParseError extends TypeError {
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
      Error.captureStackTrace(this, PathParseError)
    }
  }

  /**
   * 生成详细的错误信息
   */
  toString(): string {
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
 * 解析结果接口
 */
interface ParseResult {
  routePath: string
  viewName: string
}

/**
 * 解析路由路径和视图名称
 *
 * 从文件名中提取路由路径和命名视图名称。
 *
 * @param filePath - 文件路径
 * @param [parser] - 路径解析器
 * @returns 路由路径和视图名称
 * @throws {PathParseError} 当路径解析失败时抛出
 */
export function parseRoutePath(filePath: string, parser?: PathParser): ParseResult {
  const { basename } = extractFileInfo(filePath)

  if (!parser) {
    return defaultPathParser(basename)
  }

  const result = parser(basename, filePath)
  return parseCustomResult(result, filePath)
}

/**
 * 提取文件信息
 *
 * @param filePath - 文件路径
 * @returns 文件基本信息
 */
function extractFileInfo(filePath: string): { basename: string; ext: string } {
  const ext = path.extname(filePath)
  const basename = path.basename(filePath, ext)
  return { basename, ext }
}

/**
 * 解析默认路由路径（无自定义解析器）
 *
 * @param basename - 文件基本名称
 * @returns 解析结果
 */
function defaultPathParser(basename: string): ParseResult {
  const [rawPath, viewName] = basename.split('@', 2)
  const routePath = normalizeRoutePath(rawPath)
  if (!routePath) {
    throw new PathParseError('pathParser returned empty routePath', {
      filePath: basename,
      originalValue: rawPath,
      field: 'routePath'
    })
  }
  return {
    routePath,
    viewName: viewName || 'default'
  }
}

/**
 * 解析自定义解析器结果
 *
 * @param result - 解析器返回的结果
 * @param filePath - 文件路径（用于错误上下文）
 * @returns 解析结果
 * @throws {PathParseError} 当结果无效时抛出
 */
function parseCustomResult(result: PathParseResult, filePath: string): ParseResult {
  if (typeof result === 'string') {
    return defaultPathParser(result)
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return parseObjectResult(result, filePath)
  }

  throw new PathParseError('pathParser returned invalid result type', {
    filePath,
    originalValue: result,
    field: 'result'
  })
}

/**
 * 解析对象类型的结果
 *
 * @param result - 对象结果
 * @param filePath - 文件路径
 * @returns 解析结果
 * @throws {PathParseError} 当结果无效时抛出
 */
function parseObjectResult(
  result: { routePath: unknown; viewName?: unknown },
  filePath: string
): ParseResult {
  const { routePath: rawRoutePath, viewName } = result

  validateRoutePathType(rawRoutePath, filePath)

  const routePath = normalizeRoutePath(rawRoutePath)

  if (!routePath) {
    throw new PathParseError('pathParser returned empty routePath after normalization', {
      filePath,
      originalValue: rawRoutePath,
      field: 'routePath'
    })
  }

  validateViewName(viewName, filePath)

  return {
    routePath,
    viewName: (viewName as string) || 'default'
  }
}

/**
 * 验证路由路径类型
 *
 * @param routePath - 路由路径
 * @param filePath - 文件路径（用于错误上下文）
 * @throws {PathParseError} 当类型无效时抛出
 */
function validateRoutePathType(routePath: unknown, filePath: string): asserts routePath is string {
  if (typeof routePath !== 'string') {
    throw new PathParseError('pathParser returned non-string routePath', {
      filePath,
      originalValue: routePath,
      field: 'routePath'
    })
  }

  if (!routePath.trim()) {
    throw new PathParseError('pathParser returned empty or whitespace-only routePath', {
      filePath,
      originalValue: routePath,
      field: 'routePath'
    })
  }
}

/**
 * 验证视图名称
 *
 * @param viewName - 视图名称
 * @param filePath - 文件路径（用于错误上下文）
 * @throws {PathParseError} 当视图名称无效时抛出
 */
function validateViewName(viewName: unknown, filePath: string): void {
  if (viewName !== undefined && typeof viewName !== 'string') {
    throw new PathParseError('pathParser returned non-string viewName', {
      filePath,
      originalValue: viewName,
      field: 'viewName'
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
