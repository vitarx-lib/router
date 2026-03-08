/**
 * @fileoverview 配置验证模块
 *
 * 提供 Vite 插件配置选项的验证功能。
 * 在插件初始化时验证用户输入的配置是否合法。
 */
import type { VitePluginRouterOptions } from './types.js'

/**
 * 验证插件配置选项
 *
 * 检查用户提供的配置是否符合要求，包括：
 * - pagesDir: 字符串、字符串数组或对象数组
 * - extensions: 文件扩展名数组
 * - include/exclude: glob 模式数组
 * - dts: 类型声明文件路径或 false
 *
 * @param opts - 用户提供的配置选项
 * @throws {Error} 当配置无效时抛出带有 [vitarx-router] 前缀的错误
 *
 * @example
 * ```typescript
 * // 有效配置
 * validateOptions({ pagesDir: 'src/pages' })
 *
 * // 无效配置会抛出错误
 * validateOptions({ pagesDir: '' }) // 抛出: [vitarx-router] pagesDir 不能为空字符串
 * ```
 */
export function validateOptions(opts: VitePluginRouterOptions): void {
  validatePagesDir(opts)
  validateExtensions(opts)
  validateInclude(opts)
  validateExclude(opts)
  validateDts(opts)
}

/**
 * 验证 pagesDir 配置
 */
function validatePagesDir(opts: VitePluginRouterOptions): void {
  if (opts.pagesDir === undefined) return

  if (typeof opts.pagesDir === 'string') {
    if (opts.pagesDir.trim() === '') {
      throw new Error('[vitarx-router] pagesDir 不能为空字符串')
    }
    return
  }

  if (Array.isArray(opts.pagesDir)) {
    if (opts.pagesDir.length === 0) {
      throw new Error('[vitarx-router] pagesDir 数组不能为空')
    }
    opts.pagesDir.forEach((item, i) => {
      validatePagesDirItem(item, i)
    })
    return
  }

  throw new Error('[vitarx-router] pagesDir 必须是字符串、字符串数组或对象数组')
}

/**
 * 验证单个 pagesDir 数组元素
 */
function validatePagesDirItem(item: unknown, index: number): void {
  if (typeof item === 'string') {
    if (item.trim() === '') {
      throw new Error(`[vitarx-router] pagesDir[${index}] 不能为空字符串`)
    }
    return
  }

  if (typeof item === 'object' && item !== null) {
    const config = item as { dir?: unknown; include?: unknown; exclude?: unknown }

    if (!config.dir || typeof config.dir !== 'string' || config.dir.trim() === '') {
      throw new Error(`[vitarx-router] pagesDir[${index}].dir 必须是非空字符串`)
    }

    if (config.include !== undefined && !Array.isArray(config.include)) {
      throw new Error(`[vitarx-router] pagesDir[${index}].include 必须是数组`)
    }

    if (config.exclude !== undefined && !Array.isArray(config.exclude)) {
      throw new Error(`[vitarx-router] pagesDir[${index}].exclude 必须是数组`)
    }
    return
  }

  throw new Error(`[vitarx-router] pagesDir[${index}] 必须是字符串或对象`)
}

/**
 * 验证 extensions 配置
 */
function validateExtensions(opts: VitePluginRouterOptions): void {
  if (opts.extensions === undefined) return

  if (!Array.isArray(opts.extensions)) {
    throw new Error('[vitarx-router] extensions 必须是数组')
  }

  if (opts.extensions.length === 0) {
    throw new Error('[vitarx-router] extensions 数组不能为空')
  }

  opts.extensions.forEach((ext, i) => {
    if (typeof ext !== 'string') {
      throw new Error(`[vitarx-router] extensions[${i}] 必须是字符串`)
    }
    if (!ext.startsWith('.')) {
      throw new Error(`[vitarx-router] extensions[${i}] "${ext}" 必须以 "." 开头`)
    }
  })
}

/**
 * 验证 include 配置
 */
function validateInclude(opts: VitePluginRouterOptions): void {
  if (opts.include === undefined) return

  if (!Array.isArray(opts.include)) {
    throw new Error('[vitarx-router] include 必须是数组')
  }

  opts.include.forEach((item, i) => {
    if (typeof item !== 'string') {
      throw new Error(`[vitarx-router] include[${i}] 必须是字符串`)
    }
  })
}

/**
 * 验证 exclude 配置
 */
function validateExclude(opts: VitePluginRouterOptions): void {
  if (opts.exclude === undefined) return

  if (!Array.isArray(opts.exclude)) {
    throw new Error('[vitarx-router] exclude 必须是数组')
  }

  opts.exclude.forEach((item, i) => {
    if (typeof item !== 'string') {
      throw new Error(`[vitarx-router] exclude[${i}] 必须是字符串`)
    }
  })
}

/**
 * 验证 dts 配置
 */
function validateDts(opts: VitePluginRouterOptions): void {
  if (opts.dts === undefined) return

  if (opts.dts !== false && typeof opts.dts !== 'string') {
    throw new Error('[vitarx-router] dts 必须是字符串或 false')
  }

  if (typeof opts.dts === 'string' && opts.dts.trim() === '') {
    throw new Error('[vitarx-router] dts 不能为空字符串')
  }
}
