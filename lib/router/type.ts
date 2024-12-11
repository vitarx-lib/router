import type { LazyLoader, WidgetType } from 'vitarx'
import { formatPath } from './utils.js'

/**
 * 路由参数注入
 */
export type InjectProps =
  | boolean
  | Record<string, any>
  | ((request: RouteRequest) => Record<string, any>)

/**
 * 路由元数据
 */
export interface RouteMeta {
  [key: string]: any
}

/**
 * 路由路线配置
 */
export interface Route {
  path: string
  /**
   * 动态路由参数匹配规则
   *
   * @example
   * path:`/user/[id]`
   * pattern:{id:'\d+'}
   */
  pattern?: Record<string, RegExp>
  /**
   * 路由名称
   *
   * 必须全局保持唯一！
   */
  name?: string
  /**
   * 要展示的Widget
   *
   * 支持两种类型：
   *  1. WidgetType: `YourWidget` 可以是函数式小部件，也可以是类小部件
   *  2. undefined: 自身不展示任何ui，仅做为父路由，使children继承父路由的`path`和`pattern`。
   *  3. LazyLoader: `() => import('./YourWidget')` 代码分块，懒加载，它会自动被LazyWidget包裹。
   */
  widget?: WidgetType | LazyLoader<WidgetType>
  /**
   * 子路由
   *
   * 子路由path不要以父路由path开头，内部会自动拼接。
   */
  children?: Route[]
  /**
   * 路由元数据
   *
   * 存储一些自定义的数据，不会影响路由匹配
   */
  meta?: RouteMeta
  /**
   * 将路由参数注入到小部件实例的props中
   *
   * @default true
   */
  injectProps?: InjectProps
}

/**
 * 分组路由
 */
export type RouteGroup = MakeRequired<Route, 'children'>

/**
 * 路由请求对象
 */
export interface RouteRequest {
  /**
   * 路由路径
   */
  path: string
  /**
   * 路由hash
   */
  hash: string
  /**
   * 路由名称
   */
  name: string
  /**
   * 路由search参数
   */
  search: Record<string, any>
  /**
   * 路由参数
   */
  params: Record<string, any>
  /**
   * 路由完整路径
   */
  fullPath: string
}

/**
 * 路由器配置
 */
export interface RouterOptions {
  /**
   * 根路径
   *
   * 假设你的项目在`/sub-path`目录下运行，那么你需要设置该值为`/sub-path`，它与`vite.base`配置值应保持一致。
   *
   * @default '/'
   */
  base?: string
  /**
   * 是否严格匹配路由
   *
   * 严格匹配指：区分大小写
   *
   * @default false
   */
  strict?: boolean
  /**
   * 路由表
   *
   * @note 注意：路由表传入过后，不应该在外部进行修改，如需修改需使用`Router.removeRoute`或`Router.addRoute`方法。
   */
  routes: Route[]
}

/**
 * 路由路径
 */
export type RoutePath = `/${string}`

/**
 * 命名路由
 */
export type RouteName = string

/**
 * 路由索引
 */
export type RouteIndex = RoutePath | RouteName

/**
 * 路由跳转目标
 */
export interface RouteTarget {
  /**
   * 索引，/开头为路径，否则为名称
   */
  index: RouteIndex
  /**
   * 路由search参数
   */
  search?: Record<string, any>
  /**
   * 路由参数，对应path中的动态路由
   */
  params?: Record<string, any>
}

/**
 * 动态路由记录
 */
export interface DynamicRouteRecord {
  regex: RegExp
  route: Route
}

/**
 * 根据路由表生成路由索引
 *
 * 该函数提供给node脚本使用，生成对应的`RoutePath`和`RouteName`类型，优化类型推断
 *
 * @param {Route[]} routes - 路由表
 * @return {{ paths: string[], names: string[] }} - 路由索引对象，包含所有路由路径和名称
 */
export function generateRouteIndex(routes: Route[]): { paths: string[]; names: string[] } {
  const paths: string[] = []
  const names: string[] = []

  // 递归遍历路由，拼接路径
  function traverse(route: Route, parentPath: string = '') {
    // 如果是路由组，拼接路径并继续遍历子路由
    const fullPath = formatPath(parentPath ? `${parentPath}/${route.path}` : route.path)

    // 如果有widget，记录路径
    if (route.widget) {
      paths.push(fullPath)
    }
    // 如果有name，记录name
    if (route.name) {
      names.push(route.name)
    }
    // 如果有子路由，递归遍历
    if (route.children && route.children.length > 0) {
      route.children.forEach(childRoute => traverse(childRoute, fullPath))
    }
  }

  // 遍历所有的根路由
  routes.forEach(route => traverse(route))
  return {
    paths,
    names
  }
}
