/**
 * 将 query 字符串转为对象
 *
 * @param {string} queryString - 查询字符串（如 ?key1=value1&key2=value2）
 * @return {Record<string, string>} - 转换后的对象
 */
export function parseQuery(queryString: string): Record<string, string> {
  queryString = decodeURIComponent(queryString)
  // 去除前导的 "?" 符号，分割为键值对
  const params = new URLSearchParams(
    queryString.startsWith('?') ? queryString.substring(1) : queryString
  )
  const obj: Record<string, string> = {}

  // 遍历每一对键值并添加到对象中
  params.forEach((value, key) => (obj[key] = value))

  return obj
}
/**
 * 将对象转换为 query 字符串
 *
 * @param {Record<string, string>} obj - 要转换的对象
 * @return {string} 转换后的查询字符串（如 ?key1=value1&key2=value2）
 */
export function stringifyQuery(obj: Record<string, string>): `?${string}` | '' {
  const queryString = new URLSearchParams(obj).toString()
  // 如果对象为空或没有任何有效查询参数，返回空字符串
  return queryString ? `?${queryString}` : ''
}

/**
 * 归一化path
 *
 * 去除所有空格、替换重复的斜杠、去除尾部的斜杠
 *
 * @example
 * formatPath('/  foo') // '/foo'
 * formatPath('/foo/') // '/foo'
 * formatPath('/foo/bar') // '/foo/bar'
 * formatPath('foo/') // '/foo'
 *
 * @param {string} path - 路径字符串
 * @param [hashMode = false] -  是否为hash模式，如果是则兼容`/#/`
 * @return {string} - 格式化后的路径字符串
 */
export function normalizePath(path: string, hashMode: boolean = false): `/${string}` {
  // 去除所有空格 处理重复//
  const formated = `/${path.trim()}`.replace(/\s+/g, '').replace(/\/+/g, '/')
  if (formated === '/' || (hashMode && formated === '/#/')) return formated

  return formated.replace(/\/$/, '') as `/${string}`
}
