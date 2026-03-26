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
 * 辅助函数：初始化并更新路由记录的参数对象
 *
 * @param target - 路由记录上的目标对象（params 或 query）
 * @param source - 新的路由参数对象
 */
function patchRouteRecordParams(target: Record<string, string>, source: Record<string, string>) {
  const existingKeys = new Set(Object.keys(target))
  for (const key in source) {
    existingKeys.delete(key)
    target[key] = source[key]
  }
  for (const key of existingKeys) {
    delete target[key]
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

  // 处理路由记录的 params 和 query 初始化和更新
  for (const route of newLocation.matched) {
    // 初始化 params
    if (!route.params) {
      route.params = shallowReactive({})
    }

    // 初始化 query
    if (!route.query) {
      route.query = shallowReactive({})
    }

    const filteredParams: Record<string, string> = {}
    if (route.pattern) {
      // 根据 pattern 过滤 params
      for (const { name } of route.pattern) {
        if (name in newLocation.params) {
          filteredParams[name] = newLocation.params[name]
        }
      }
    }
    // 更新 params
    patchRouteRecordParams(route.params, filteredParams)
    // 更新 query（全局共享）
    patchRouteRecordParams(route.query, newLocation.query)
  }

  patchArray(current.matched, newLocation.matched)
  patchObject(current.params, newLocation.params)
  patchObject(current.query, newLocation.query)
  patchObject(current.meta, newLocation.meta)
  current.redirectFrom = newLocation.redirectFrom ? markRaw(newLocation.redirectFrom) : undefined
}
