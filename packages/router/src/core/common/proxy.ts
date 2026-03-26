import { type DeepReadonly } from 'vitarx'
import type { RouteLocation, RouteRecord } from '../types/index.js'

const routeProxyCache = new WeakMap<RouteRecord, DeepReadonly<RouteLocation>>()

/**
 * 创建一个路由代理对象，用于拦截和修改路由对象的访问行为
 * @param route - 深度只读的路由位置对象
 * @param record - 路由记录对象
 * @returns - 返回一个深度只读的路由位置代理对象
 */
export function createRouteProxy(
  route: DeepReadonly<RouteLocation>,
  record: RouteRecord
): DeepReadonly<RouteLocation> {
  let proxy = routeProxyCache.get(record)
  if (proxy) return proxy
  proxy = new Proxy(route, {
    get(target, prop) {
      if (prop === 'params') {
        return record.params ?? target.params
      }
      if (prop === 'query') {
        return record.query ?? target.query
      }
      return Reflect.get(target, prop)
    }
  }) as DeepReadonly<RouteLocation>
  routeProxyCache.set(record, proxy)
  return proxy
}
