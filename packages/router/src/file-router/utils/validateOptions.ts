import type { FileRouterOptions } from '../types.js'

function validatePagesDir(opts: FileRouterOptions): void {
  if (opts.pages === undefined) return

  if (typeof opts.pages === 'string') {
    if (opts.pages.trim() === '') {
      throw new Error('options.pagesDir 不能为空字符串')
    }
    return
  }

  if (Array.isArray(opts.pages)) {
    if (opts.pages.length === 0) {
      throw new Error('options.pagesDir 数组不能为空')
    }
    opts.pages.forEach((item, i) => {
      validatePagesDirItem(item, i)
    })
    return
  }

  throw new Error('options.pagesDir 必须是字符串、字符串数组或对象数组')
}

function validatePagesDirItem(item: unknown, index: number): void {
  if (typeof item === 'string') {
    if (item.trim() === '') {
      throw new Error(`options.pagesDir[${index}] 不能为空字符串`)
    }
    return
  }

  if (typeof item === 'object' && item !== null) {
    const config = item as { dir?: unknown; include?: unknown; exclude?: unknown }

    if (!config.dir || typeof config.dir !== 'string' || config.dir.trim() === '') {
      throw new Error(`options.pagesDir[${index}].dir 必须是非空字符串`)
    }

    if (config.include !== undefined && !Array.isArray(config.include)) {
      throw new Error(`options.pagesDir[${index}].include 必须是数组`)
    }

    if (config.exclude !== undefined && !Array.isArray(config.exclude)) {
      throw new Error(`options.pagesDir[${index}].exclude 必须是数组`)
    }
    return
  }

  throw new Error(`options.pagesDir[${index}] 必须是字符串或对象`)
}

function validateExtensions(opts: FileRouterOptions): void {
  if (opts.extensions === undefined) return

  if (!Array.isArray(opts.extensions)) {
    throw new Error('options.extensions 必须是数组')
  }

  if (opts.extensions.length === 0) {
    throw new Error('options.extensions 数组不能为空')
  }

  opts.extensions.forEach((ext, i) => {
    if (typeof ext !== 'string') {
      throw new Error(`options.extensions[${i}] 必须是字符串`)
    }
    if (!ext.startsWith('.')) {
      throw new Error(`options.extensions[${i}] "${ext}" 必须以 "." 开头`)
    }
  })
}

function validateInclude(opts: FileRouterOptions): void {
  if (opts.include === undefined) return

  if (!Array.isArray(opts.include)) {
    throw new Error('options.include 必须是数组')
  }

  opts.include.forEach((item, i) => {
    if (typeof item !== 'string') {
      throw new Error(`options.include[${i}] 必须是字符串`)
    }
  })
}

function validateExclude(opts: FileRouterOptions): void {
  if (opts.exclude === undefined) return

  if (!Array.isArray(opts.exclude)) {
    throw new Error('options.exclude 必须是数组')
  }

  opts.exclude.forEach((item, i) => {
    if (typeof item !== 'string') {
      throw new Error(`options.exclude[${i}] 必须是字符串`)
    }
  })
}

/**
 * 验证插件配置选项
 *
 * @param opts - 用户提供的配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
export function validateOptions(opts: FileRouterOptions): void {
  validatePagesDir(opts)
  validateExtensions(opts)
  validateInclude(opts)
  validateExclude(opts)
}
