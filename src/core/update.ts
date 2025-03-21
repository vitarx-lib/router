import type { RouteLocation } from './router-types.js'

// 字符串值的key
const __stringValueKeys: (keyof RouteLocation)[] = ['path', 'hash', 'index', 'fullPath']

/**
 * 补丁更新路由对象
 *
 * @param location
 * @param newLocation
 */
export function patchUpdate(location: RouteLocation, newLocation: RouteLocation) {
  diffUpdateArrays(location['matched'], newLocation['matched'])
  diffUpdateObjects(location['params'], newLocation['params'])
  diffUpdateObjects(location['query'], newLocation['query'])
  diffUpdateObjects(location.meta, newLocation.meta)
  for (const key of __stringValueKeys) {
    if (location[key] !== newLocation[key]) {
      location[key] = newLocation[key] as any
    }
  }
}

/**
 * 差异化更新数组
 *
 * 改变原数组
 *
 * @param a
 * @param b
 */
function diffUpdateArrays(a: any[], b: any[]): void {
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
 * 差异化更新对象
 *
 * 改变原对象
 *
 * @param a
 * @param b
 */
function diffUpdateObjects(a: Record<string, any>, b: Record<string, any>): void {
  const aKeys = new Set(Object.keys(a))
  const bKeys = Object.keys(b)
  // 遍历 b 中的属性，将 b 的值赋给 a
  for (const key of bKeys) {
    a[key] = b[key]
    aKeys.delete(key)
  }
  // 遍历 a 中的属性，删除 a 中存在但 b 中不存在的属性
  for (const key of aKeys) {
    delete a[key]
  }
}

/**
 * 差异化更新属性
 *
 * @param oldProps
 * @param newProps
 * @internal
 */
export function diffUpdateProps(oldProps: Record<string, any>, newProps: Record<string, any>) {
  const removeKeys = new Set(Object.keys(oldProps))
  const bKeys = Object.keys(newProps)
  const changes = []
  // 遍历 b 中的属性，将 b 的值赋给 a
  for (const key of bKeys) {
    if (key === 'key') continue
    if (oldProps[key] !== newProps[key]) {
      oldProps[key] = newProps[key]
      changes.push(key)
    }
    removeKeys.delete(key)
  }
  changes.push(...removeKeys)
  // 遍历 a 中的属性，删除 a 中存在但 b 中不存在的属性
  for (const key of removeKeys) {
    delete oldProps[key]
  }
  return changes
}
