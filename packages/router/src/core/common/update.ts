// 字符串值的key
import { markRaw, shallowReactive } from 'vitarx'
import type { RouteLocation } from '../types/index.js'

/**
 * 差异化更新数组
 *
 * 改变原数组
 *
 * @param a
 * @param b
 */
function patchArray(a: any[], b: ReadonlyArray<any>): void {
  // 遍历 b 中的元素，差异化更新 a 中的元素
  for (let i = 0; i < b.length; i++) {
    if (a[i] !== b[i]) {
      // 如果 a[i] 不等于 b[i]，则更新 a[i]
      a[i] = b[i]
    }
  }
  // 如果 a 的长度大于 b，删除 a 中多余的元素
  if (a.length > b.length) {
    a.length = b.length
  }
}

/**
 * 辅助函数：对对象进行差异化打补丁
 * 保证引用不变，内容同步
 */
function patchObject<T extends Record<string, any>>(target: T, source: Partial<T>) {
  // 1. 删除 target 中有但 source 中没有的 key (处理参数被清空的情况)
  for (const key in target) {
    if (!(key in source)) {
      delete target[key]
    }
  }
  // 2. 更新/新增 source 中的 key
  for (const key in source) {
    target[key] = source[key] as any
  }
}

/**
 * 补丁更新路由对象
 *
 * @param current - 当前路由对象
 * @param newLocation - 新的路由对象
 */
export function updateRouteLocation(current: RouteLocation, newLocation: RouteLocation): void {
  // 如果缓存中存在该路由对象，则进行差异化更新
  current.href = newLocation.href
  current.path = newLocation.path
  current.hash = newLocation.hash

  // 处理路由记录的 params 初始化和更新
  for (const route of newLocation.matched) {
    // 使用类型断言，因为 newLocation 是只读的，但我们需要在运行时修改它
    const mutableRoute = route

    // 为没有 params 的路由记录创建响应式 params 对象
    if (!mutableRoute.params) {
      mutableRoute.params = shallowReactive({})
    }

    // 根据路由的 pattern 从 newLocation.params 中提取对应参数
    if (mutableRoute.pattern) {
      // 记录当前已有的参数键
      const existingKeys = new Set(Object.keys(mutableRoute.params))

      // 更新或添加参数
      for (const { name } of mutableRoute.pattern) {
        existingKeys.delete(name)
        if (name in newLocation.params) {
          mutableRoute.params[name] = newLocation.params[name]
        } else {
          // 移除不存在的参数
          delete mutableRoute.params[name]
        }
      }

      // 移除不在 pattern 中的参数
      for (const key of existingKeys) {
        delete mutableRoute.params[key]
      }
    } else {
      // 没有 pattern 的路由，清空 params
      for (const key in mutableRoute.params) {
        delete mutableRoute.params[key]
      }
    }
  }

  patchArray(current.matched, newLocation.matched)
  patchObject(current.params, newLocation.params)
  patchObject(current.query, newLocation.query)
  patchObject(current.meta, newLocation.meta)
  current.redirectFrom = newLocation.redirectFrom ? markRaw(newLocation.redirectFrom) : undefined
}
