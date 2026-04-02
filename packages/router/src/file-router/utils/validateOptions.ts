/**
 * @fileoverview 配置验证工具模块
 *
 * 提供文件路由配置选项的验证功能，确保用户提供的配置符合要求。
 * 当配置无效时抛出明确的错误信息，帮助用户快速定位问题。
 */
import type { FileRouterOptions, ImportMode, NamingStrategy } from '../types.js'

/**
 * 验证 pages 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
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

/**
 * 验证 pages 数组中的单个项目
 *
 * @param item - 数组项
 * @param index - 数组索引
 * @throws {Error} 当配置无效时抛出错误
 */
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

/**
 * 验证 extensions 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
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

/**
 * 验证 include 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
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

/**
 * 验证 exclude 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
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
 * 验证 root 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateRoot(opts: FileRouterOptions): void {
  if (opts.root === undefined) return

  if (typeof opts.root !== 'string') {
    throw new Error('options.root 必须是字符串')
  }

  if (opts.root.trim() === '') {
    throw new Error('options.root 不能为空字符串')
  }
}

/**
 * 验证 prefix 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validatePrefix(opts: FileRouterOptions): void {
  if (opts.prefix === undefined) return

  if (typeof opts.prefix !== 'string') {
    throw new Error('options.prefix 必须是字符串')
  }
}

/**
 * 验证 importMode 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateImportMode(opts: FileRouterOptions): void {
  if (opts.importMode === undefined) return

  const validModes: ImportMode[] = ['lazy', 'file']
  if (!validModes.includes(opts.importMode)) {
    throw new Error(`options.importMode 必须是 'lazy' 或 'file'`)
  }
}

/**
 * 验证 extendRoute 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateExtendRoute(opts: FileRouterOptions): void {
  if (opts.extendRoute === undefined) return

  if (typeof opts.extendRoute !== 'function') {
    throw new Error('options.extendRoute 必须是函数')
  }
}

/**
 * 验证 injectImports 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateInjectImports(opts: FileRouterOptions): void {
  if (opts.injectImports === undefined) return

  if (!Array.isArray(opts.injectImports)) {
    throw new Error('options.injectImports 必须是数组')
  }

  opts.injectImports.forEach((imp, i) => {
    if (typeof imp !== 'string') {
      throw new Error(`options.injectImports[${i}] 必须是字符串`)
    }
  })
}

/**
 * 验证 namingStrategy 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateNamingStrategy(opts: FileRouterOptions): void {
  if (opts.namingStrategy === undefined) return

  const validStrategies: NamingStrategy[] = ['kebab', 'lowercase', 'none']
  if (!validStrategies.includes(opts.namingStrategy)) {
    throw new Error(`options.namingStrategy 必须是 'kebab'、'lowercase' 或 'none'`)
  }
}

/**
 * 验证插件配置选项
 *
 * 验证顺序：
 * 1. root 配置
 * 2. prefix 配置
 * 3. pages 配置
 * 4. extensions 配置
 * 5. include 配置
 * 6. exclude 配置
 * 7. importMode 配置
 * 8. extendRoute 配置
 * 9. injectImports 配置
 * 10. namingStrategy 配置
 *
 * @param opts - 用户提供的配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
export function validateOptions(opts: FileRouterOptions): void {
  validateRoot(opts)
  validatePrefix(opts)
  validatePagesDir(opts)
  validateExtensions(opts)
  validateInclude(opts)
  validateExclude(opts)
  validateImportMode(opts)
  validateExtendRoute(opts)
  validateInjectImports(opts)
  validateNamingStrategy(opts)
}
