/**
 * @fileoverview 配置验证工具模块
 *
 * 提供文件路由配置选项的验证功能，确保用户提供的配置符合要求。
 * 当配置无效时抛出明确的错误信息，帮助用户快速定位问题。
 */

import type { FileRouterOptions, ImportMode, PathStrategy } from '../types/index.js'

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
      throw new Error('options.pages 不能为空字符串')
    }
    return
  }

  if (Array.isArray(opts.pages)) {
    if (opts.pages.length === 0) {
      throw new Error('options.pages 数组不能为空')
    }
    opts.pages.forEach((item, i) => {
      validatePagesDirItem(item, i)
    })
    return
  }

  throw new Error('options.pages 必须是字符串、字符串数组或对象数组')
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
      throw new Error(`options.pages[${index}] 不能为空字符串`)
    }
    return
  }

  if (typeof item === 'object' && item !== null) {
    const config = item as {
      dir?: unknown
      include?: unknown
      exclude?: unknown
      prefix?: unknown
      group?: unknown
    }

    if (!config.dir || typeof config.dir !== 'string' || config.dir.trim() === '') {
      throw new Error(`options.pages[${index}].dir 必须是非空字符串`)
    }

    if (config.include !== undefined && !Array.isArray(config.include)) {
      throw new Error(`options.pages[${index}].include 必须是数组`)
    }

    if (config.exclude !== undefined && !Array.isArray(config.exclude)) {
      throw new Error(`options.pages[${index}].exclude 必须是数组`)
    }

    if (
      config.group === true &&
      config.prefix !== undefined &&
      typeof config.prefix === 'string' &&
      config.prefix !== '/' &&
      config.prefix.endsWith('/')
    ) {
      throw new Error(
        `options.pages[${index}].prefix 当 group 为 true 时不能以 '/' 结尾，请使用 '${config.prefix.slice(0, -1)}'`
      )
    }

    return
  }

  throw new Error(`options.pages[${index}] 必须是字符串或对象`)
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
 * 验证 importMode 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateImportMode(opts: FileRouterOptions): void {
  if (opts.importMode === undefined) return

  if (typeof opts.importMode === 'function') return

  const validModes: ImportMode[] = ['lazy', 'sync']
  if (!validModes.includes(opts.importMode as 'lazy' | 'sync')) {
    throw new Error(`options.importMode 必须是 'lazy'、'sync' 或函数`)
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
function validatePathStrategy(opts: FileRouterOptions): void {
  if (opts.pathStrategy === undefined) return

  const validStrategies: PathStrategy[] = ['kebab', 'lowercase', 'raw']
  if (!validStrategies.includes(opts.pathStrategy)) {
    throw new Error(`options.pathStrategy 必须是 'kebab'、'lowercase' 或 'raw'`)
  }
}

/**
 * 验证 dts 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateDts(opts: FileRouterOptions): void {
  if (opts.dts === undefined) return

  if (typeof opts.dts === 'boolean') return

  if (typeof opts.dts === 'string') {
    if (opts.dts.trim() === '') {
      throw new Error('options.dts 为字符串时不能为空字符串')
    }
    return
  }

  throw new Error('options.dts 必须是 boolean 或 string')
}

/**
 * 验证 layoutFileName 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateLayoutFileName(opts: FileRouterOptions): void {
  if (opts.layoutFileName === undefined) return

  if (typeof opts.layoutFileName !== 'string') {
    throw new Error('options.layoutFileName 必须是字符串')
  }

  if (opts.layoutFileName.trim() === '') {
    throw new Error('options.layoutFileName 不能为空字符串')
  }
}

/**
 * 验证 configFileName 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateConfigFileName(opts: FileRouterOptions): void {
  if (opts.configFileName === undefined) return

  if (typeof opts.configFileName !== 'string') {
    throw new Error('options.configFileName 必须是字符串')
  }

  if (opts.configFileName.trim() === '') {
    throw new Error('options.configFileName 不能为空字符串')
  }
}

/**
 * 验证 transform 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validateTransform(opts: FileRouterOptions): void {
  if (opts.transform === undefined) return

  if (typeof opts.transform !== 'function') {
    throw new Error('options.transform 必须是函数')
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
 * 验证 pathParser 配置
 *
 * @param opts - 配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
function validatePathParser(opts: FileRouterOptions): void {
  if (opts.pathParser === undefined) return

  if (typeof opts.pathParser !== 'function') {
    throw new Error('options.pathParser 必须是函数')
  }
}

/**
 * 验证插件配置选项
 *
 * 验证顺序：
 * 1. root 配置
 * 2. pages 配置
 * 3. pathStrategy 配置
 * 4. importMode 配置
 * 5. injectImports 配置
 * 6. dts 配置
 * 7. layoutFileName 配置
 * 8. configFileName 配置
 * 9. transform 配置
 * 10. extendRoute 配置
 * 11. pathParser 配置
 *
 * @param opts - 用户提供的配置选项
 * @throws {Error} 当配置无效时抛出错误
 */
export function validateOptions(opts: FileRouterOptions): void {
  validateRoot(opts)
  validatePagesDir(opts)
  validatePathStrategy(opts)
  validateImportMode(opts)
  validateInjectImports(opts)
  validateDts(opts)
  validateLayoutFileName(opts)
  validateConfigFileName(opts)
  validateTransform(opts)
  validateExtendRoute(opts)
  validatePathParser(opts)
}
