import { type DeepReadonly, inject } from 'vitarx'
import { __ROUTER_VIEW_DEPTH_KEY__ } from '../common/constant.js'
import type { RouteLocation, RouteRecord } from '../types/index.js'
import { useRouter } from './inject.js'

const routeProxyCache = new WeakMap<RouteRecord, DeepReadonly<RouteLocation>>()

/**
 * 创建一个路由代理对象，用于拦截和修改路由对象的访问行为
 * @param route - 深度只读的路由位置对象
 * @param record - 路由记录对象
 * @returns - 返回一个深度只读的路由位置代理对象
 */
function createRouteProxy(
  route: DeepReadonly<RouteLocation>,
  record: RouteRecord
): DeepReadonly<RouteLocation> {
  // 返回类型为深度只读的路由位置对象
  // 从缓存中获取已存在的路由代理对象
  let proxy = routeProxyCache.get(record)
  // 如果缓存中已存在代理对象，则直接返回
  if (proxy) return proxy
  // 创建一个新的路由代理对象
  proxy = new Proxy(route, {
    // 拦截对象的属性访问
    get(target, prop) {
      // 当访问params属性时，返回路由记录中的params，如果不存在则返回空对象
      if (prop === 'params') {
        return record.params ?? target.params
      }
      // 当访问query属性时，返回路由记录中的query，如果不存在则返回空对象
      if (prop === 'query') {
        return record.query ?? target.query
      }
      // 对于其他属性，直接返回目标对象的属性值
      return Reflect.get(target, prop)
    }
  }) as DeepReadonly<RouteLocation> // 将代理对象断言为深度只读的路由位置对象
  // 将创建的代理对象存入缓存
  routeProxyCache.set(record, proxy)
  // 返回创建的代理对象
  return proxy
}

/**
 * 获取当前`RouteLocation`对象
 *
 * 简单示例：
 * ```jsx
 * import { useRoute,watch } from 'vitarx-router'
 *
 * // 监听路由参数变化示例
 * export default function App() {
 *  const route = useRoute()
 *  watch(()=>route.params.id, (newId, oldId) => {
 *   console.log(`监听到id参数变化, 旧值：${oldId}, 新值：${newId}`)
 *  })
 *  return <div>当前路由参数ID：{route.params.id}</div>
 * }
 * ```
 *
 * @return {RouteLocation} - 只读的`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例或路由没有就绪，则会抛出异常
 */
export function useRoute(): DeepReadonly<RouteLocation>

/**
 * 获取当前`RouteLocation`对象
 *
 * @param {boolean} global - 是否返回全局路由对象
 * @return {RouteLocation} - 只读的`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例或路由没有就绪，则会抛出异常
 */
export function useRoute(global: false): DeepReadonly<RouteLocation>

/**
 * 获取全局`RouteLocation`对象
 *
 * @param {boolean} global - 是否返回全局路由对象
 * @return {RouteLocation} - 只读的全局`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例或路由没有就绪，则会抛出异常
 */
export function useRoute(global: true): DeepReadonly<RouteLocation>

/**
 * 获取当前`RouteLocation`对象
 *
 * @param {boolean} global - 是否返回全局路由对象，默认为 false
 * @return {RouteLocation} - 只读的`RouteLocation`对象
 * @throws {Error} - 如果未获取到路由器实例或路由没有就绪，则会抛出异常
 */
export function useRoute(global: boolean = false): DeepReadonly<RouteLocation> {
  const router = useRouter()
  const route = router.route

  if (global) {
    return route
  }

  const depth = inject(__ROUTER_VIEW_DEPTH_KEY__, -1) + 1

  if (depth === 0 || depth >= route.matched.length) {
    return route
  }

  const record = route.matched[depth]
  if (!record) {
    return route
  }

  return createRouteProxy(route, record)
}
