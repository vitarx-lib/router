import type { Route } from '../router-types.js'

/**
 * 验证 widget 配置
 *
 * @param route
 * @private
 */
export default function validateWidget(route: Route): void {
  // 处理 widget 配置
  if (!('widget' in route)) {
    // 如果没有 widget 且没有子路由，则报错
    if (route.children!.length === 0) {
      throw new TypeError(
        `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 widget 属性缺失，它可以是函数式小部件、类小部件，亦或是一个惰性加载器。`
      )
    }
    route.widget = undefined
    return
  }

  if (typeof route.widget === 'function') {
    // 函数式小部件处理
    route.widget = { default: route.widget }
  } else if (typeof route.widget === 'object' && route.widget !== null) {
    // 对象类型的小部件
    if (Object.keys(route.widget).length === 0) {
      route.widget = undefined
    } else {
      for (const k in route.widget) {
        if (typeof route.widget[k] !== 'function') {
          throw new TypeError(
            `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 widget 命名视图 ${k} 类型有误，它可以是函数式小部件、类小部件，亦或是一个惰性加载器。`
          )
        }
      }
    }
  } else {
    throw new TypeError(
      `[Vitarx.Router][TYPE_ERROR]：${route.path} 路由线路配置的 widget 类型有误，它可以是函数式小部件、类小部件，亦或是一个惰性加载器。`
    )
  }
}
