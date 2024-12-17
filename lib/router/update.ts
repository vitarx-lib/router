import type { RouteLocation } from './type.js'

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
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  // 遍历 b 中的属性，将 b 的值赋给 a
  for (const key of bKeys) {
    if (b.hasOwnProperty(key)) {
      a[key] = b[key]
    }
  }
  // 遍历 a 中的属性，删除 a 中存在但 b 中不存在的属性
  for (const key in aKeys) {
    if (!(key in b)) delete a[key]
  }
}
