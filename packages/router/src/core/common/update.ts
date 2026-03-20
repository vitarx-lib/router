// 字符串值的key
import { markRaw, shallowReactive } from 'vitarx'
import type { RouteLocation, RouteLocationRaw } from '../types/index.js'

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
 * @param location
 * @param newLocation
 */
export function updateRouteLocation(location: RouteLocationRaw, newLocation: RouteLocation): void {
  // 1. 更新基础属性
  location.path = newLocation.path
  location.href = newLocation.href
  location.hash = newLocation.hash

  // 2. 判断路由线路是否变化
  const isSwitchRoute =
    location.matched.length !== newLocation.matched.length ||
    location.matched.at(-1) !== newLocation.matched.at(-1)

  // 3. 更新 matched 和 params , query
  if (isSwitchRoute) {
    // 【切换策略】：替换 params，切断旧监听
    patchArray(location.matched, newLocation.matched)
    // 确保 params 永远是对象，防止 undefined 导致 shallowReactive 报错
    location.params = shallowReactive(newLocation.params || {})
    location.query = shallowReactive(newLocation.query || {})
  } else {
    // 【复用策略】：补丁更新 params,query，保持引用
    patchObject(location.params, newLocation.params || {})
    patchObject(location.query, newLocation.query || {})
  }

  // 4. 更新 meta (始终补丁)
  patchObject(location.meta, newLocation.meta)

  // 5. 更新 redirectFrom
  if (newLocation.redirectFrom) {
    location.redirectFrom = markRaw(newLocation.redirectFrom)
  } else {
    delete location.redirectFrom
  }
}
