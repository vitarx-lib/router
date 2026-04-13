import { isComponent, isFunction } from 'vitarx'
import { RouteManager } from './manager.js'
import type { RouterOptions, URLMode } from '../types/index.js'

/**
 * 检查路由器配置选项的合法性
 *
 * 在开发环境下对用户传入的 RouterOptions 进行校验，
 * 确保必填字段存在、类型正确、值合法。
 *
 * @param options - 用户传入的路由器配置对象
 * @throws {Error} 当选项不合法时抛出错误
 */
export const checkRouterOptions = (options: RouterOptions): void => {
  // 1. 检查 options 是否为对象
  if (typeof options !== 'object' || options === null) {
    throw new Error('[Router] Router options must be an object.')
  }

  // 2. 检查 routes 是否存在且为有效类型
  if (!('routes' in options) || options.routes === undefined) {
    throw new Error('[Router] "routes" is a required option.')
  }

  if (!Array.isArray(options.routes) && !(options.routes instanceof RouteManager)) {
    throw new Error('[Router] "routes" must be an array or a RouteManager instance.')
  }

  // 3. 检查 mode 的值是否合法
  if ('mode' in options && options.mode !== undefined) {
    const validModes: URLMode[] = ['hash', 'path']
    if (!validModes.includes(options.mode)) {
      throw new Error(
        `[Router] "mode" must be one of: ${validModes.join(', ')}. Received "${options.mode}".`
      )
    }
  }

  // 4. 检查 base 的格式
  if ('base' in options && options.base !== undefined) {
    if (typeof options.base !== 'string') {
      throw new Error('[Router] "base" must be a string.')
    }
    if (!options.base.startsWith('/')) {
      throw new Error('[Router] "base" must start with a slash (/).')
    }
  }

  // 5. 检查 suffix 的格式
  if ('suffix' in options && options.suffix !== undefined) {
    if (typeof options.suffix !== 'string') {
      throw new Error('[Router] "suffix" must be a string.')
    }
    if (!options.suffix.startsWith('.')) {
      throw new Error('[Router] "suffix" must start with a dot (.).')
    }
    if (options.suffix === '.') {
      throw new Error(
        '[Router] "suffix" cannot be just a dot, please provide a valid extension like ".html".'
      )
    }
  }

  // 6. 检查 props 的类型
  if ('props' in options && options.props !== undefined) {
    if (typeof options.props !== 'boolean' && !isFunction(options.props)) {
      throw new Error('[Router] "props" must be a boolean or function.')
    }
  }

  // 7. 检查 scrollBehavior 的类型
  if ('scrollBehavior' in options && options.scrollBehavior !== undefined) {
    if (!isFunction(options.scrollBehavior)) {
      throw new Error('[Router] "scrollBehavior" must be a function.')
    }
  }

  // 8. 检查钩子函数的类型
  if ('beforeEach' in options && options.beforeEach !== undefined) {
    if (!isFunction(options.beforeEach) && !Array.isArray(options.beforeEach)) {
      throw new Error('[Router] "beforeEach" must be a function or an array of functions.')
    }
    if (Array.isArray(options.beforeEach)) {
      options.beforeEach.forEach((hook, index) => {
        if (!isFunction(hook)) {
          throw new Error(
            `[Router] "beforeEach" must be a function or an array of functions. Index: ${index}`
          )
        }
      })
    }
  }
  if ('afterEach' in options && options.afterEach !== undefined) {
    if (!isFunction(options.afterEach) && !Array.isArray(options.afterEach)) {
      throw new Error('[Router] "afterEach" must be a function or an array of functions.')
    }
    if (Array.isArray(options.afterEach)) {
      options.afterEach.forEach((hook, index) => {
        if (!isFunction(hook)) {
          throw new Error(
            `[Router] "afterEach" must be a function or an array of functions. Index: ${index}`
          )
        }
      })
    }
  }
  if ('onNotFound' in options && options.onNotFound !== undefined) {
    if (!isFunction(options.onNotFound) && !Array.isArray(options.onNotFound)) {
      throw new Error('[Router] "onNotFound" must be a function or an array of functions.')
    }
    if (Array.isArray(options.onNotFound)) {
      options.onNotFound.forEach((hook, index) => {
        if (!isFunction(hook)) {
          throw new Error(
            `[Router] "onNotFound" must be a function or an array of functions. Index: ${index}`
          )
        }
      })
    }
  }
  if ('onError' in options && options.onError !== undefined) {
    if (!isFunction(options.onError) && !Array.isArray(options.onError)) {
      throw new Error('[Router] "onError" must be a function or an array of functions.')
    }
    if (Array.isArray(options.onError)) {
      options.onError.forEach((hook, index) => {
        if (!isFunction(hook)) {
          throw new Error(
            `[Router] "onError" must be a function or an array of functions. Index: ${index}`
          )
        }
      })
    }
  }
  // 9. 检查 missing 组件的类型
  if ('missing' in options && options.missing !== undefined) {
    if (!isComponent(options.missing)) {
      throw new Error('[Router] "missing" must be a valid component.')
    }
  }
}
