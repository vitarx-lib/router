import type { WidgetType } from 'vitarx'
import { formatPath, type LAZY_LOADER_SYMBOL } from './utils.js'
import type Router from './router.js'

/**
 * 延迟加载/惰性加载
 */
export interface LazyLoad<T> {
  [LAZY_LOADER_SYMBOL]: boolean

  (): Promise<{ default: T }>
}

/**
 * 路由参数注入
 */
export type InjectProps =
  | boolean
  | Record<string, any>
  | ((params: Record<string, any> | null) => Record<string, any>)

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
   *  2. LazyLoad: `() => import('./YourWidget')` 代码分块，懒加载，它会自动被LazyWidget包裹。
   *  3. undefined: 自身不展示任何ui，仅做为父路由，使children继承父路由的`path`和`pattern`。
   */
  widget?: WidgetType | LazyLoad<WidgetType>
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
 * 导航数据
 *
 * 所有和url相关的数据都已`decodeURIComponent`解码
 */
export interface NavigateData {
  /**
   * 路由索引，调用`push`|`replace`时传入的index
   */
  index: RouteIndex
  /**
   * 完整的path，包含了query和hash
   *
   * `${path}${query}${hash}`
   */
  fullPath: string
  /**
   * pathname
   */
  path: string
  /**
   * hash
   *
   * 带有#前缀，空字符串代表没有hash。
   */
  hash: string
  /**
   * search参数
   */
  query: Record<string, string>
  /**
   * 动态路由path匹配的参数，包括调用`push`|`replace`时传入的params
   */
  params: Record<string, string>
  /**
   * 匹配的路由对象
   *
   * 如果没有匹配到路由，matched为null
   */
  matched: Route | null
}

/**
 * 路由前置钩子返回值
 *
 * 1. 返回false表示阻止路由跳转，true表示继续路由跳转
 * 2. 返回{@link RouteTarget}重定向目标
 * 3. 返回void表示继续路由跳转
 * @note 如果返回promise，则promise resolve的值会被作为返回值
 */
export type BeforeEachCallbackResult =
  | boolean
  | RouteTarget
  | void
  | Promise<boolean | RouteTarget | void>
/**
 * 路由前置钩子
 *
 * > 注意：`from`参数受守卫过程中重定向影响，假设你在守卫过程中返回了新的`RouteTarget`，
 * 从新进入守卫时`from`参数则是上一次的`to`。
 *
 * @this {Router} - 路由器实例
 * @param {NavigateData} to - 要跳转的目标路由
 * @param {NavigateData} from - 从哪个路由跳转过来
 * @returns {boolean | RouteTarget | void} - 返回false表示阻止路由跳转，返回{@link RouteTarget}重定向目标
 */
export type BeforeEachCallback = (
  this: Router,
  to: NavigateData,
  from: NavigateData
) => BeforeEachCallbackResult

/**
 * 路由模式
 */
export type HistoryMode = 'hash' | 'path' | 'memory'

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
  base?: `/${string}`
  /**
   * 历史记录模式
   *
   * 可选值如下：
   * 1. path模式：使用path值作为路由标识，如：`/page1`
   * 2. hash模式：使用hash值作为路由标识，如：`/#/page1`
   * 3. memory模式：内存模式，用于非浏览器端，或不需要使用浏览器回退和前进功能时使用。
   *
   * @note 使用memory模式需在路由器实例化完成后使用replace替换掉初始的伪路由，另外两种模式是浏览器端使用的，会自动完成这个操作！
   * @default 'path' 默认视为是浏览器端
   */
  mode?: HistoryMode
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
  /**
   * 全局路由前置钩子
   *
   * @see BeforeEachCallback
   */
  beforeEach?: BeforeEachCallback
}

/**
 * 已初始化的路由配置
 */
export type InitializedRouterOptions = Readonly<Required<RouterOptions>>
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
 * 路由目标
 */
export interface RouteTarget {
  /**
   * 索引，/开头为路径，否则为名称
   */
  index: RouteIndex
  /**
   * hash
   */
  hash?: string
  /**
   * 路由query参数
   */
  query?: Record<string, any>
  /**
   * 路由参数，对应path中的动态路由
   */
  params?: Record<string, any>
  /**
   * 是否替换当前路由
   */
  isReplace?: boolean
}

/**
 * 动态路由记录
 */
export interface DynamicRouteRecord {
  regex: RegExp
  route: Route
}

/**
 * 导航结果
 */
export interface NavigateResult {
  /**
   * 状态
   *
   * 枚举值：
   * 0. success: 导航成功
   * 1. aborted: 导航被阻止
   * 2. cancelled: 导航被取消
   * 3. duplicated: 重复导航
   * 4. not_matched: 路由未匹配
   * 5. exception: 捕获到异常
   *
   * @see NavigateStatus
   */
  status: NavigateStatus
  /**
   * 状态描述
   */
  message: string
  /**
   * 最终的导航数据
   *
   * 它和守卫钩子`to`参数一致，常用于判断是否在守卫过程中被重定向。
   */
  data: Readonly<NavigateData>
  /**
   * 捕获到的异常
   */
  error?: unknown
}

/**
 * 导航结果
 */
export enum NavigateStatus {
  /**
   * 导航成功
   */
  success,
  /**
   * 导航被阻止
   */
  aborted,
  /**
   * 导航被取消
   *
   * 正在等待中间件处理结果时又触发了新的导航请求
   */
  cancelled,
  /**
   * 重复导航
   */
  duplicated,
  /**
   * 路由未匹配
   */
  not_matched,
  /**
   * 捕获到异常
   */
  exception
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
