import type { WidgetType } from 'vitarx'
import { type LAZY_LOADER_SYMBOL } from './utils.js'
import type Router from './router.js'

/**
 * 延迟加载/惰性加载
 */
export interface LazyLoad<T> {
  [LAZY_LOADER_SYMBOL]: boolean

  (): Promise<{ default: T }>
}

/**
 * hash字符串类型
 */
export type HashStr = `#${string}` | ''
/**
 * 路由参数注入
 */
export type InjectProps =
  | boolean
  | Record<string, any>
  | ((route: RouteLocation) => Record<string, any>)

/**
 * 命名的props
 */
export type InjectNamedProps<k extends string = string> = Record<k, InjectProps>

/**
 * 路由元数据
 */
export interface RouteMeta {
  [key: string]: any
}

/**
 * 路由视图小部件
 */
type RouteWidget = WidgetType | LazyLoad<WidgetType>
/**
 * 命名的路由视图小部件
 */
type NamedRouteWidget<K extends string = string> = Record<K, RouteWidget>
/**
 * 允许的路由小部件联合类型
 */
type AllowedRouteWidget = RouteWidget | NamedRouteWidget

/**
 * 路由路线配置
 *
 * @template WIDGET 允许的路由小部件类型，用于类型重载
 */
export interface Route<WIDGET extends AllowedRouteWidget = AllowedRouteWidget> {
  /**
   * 路由路径
   *
   * 支持动态路由参数
   *
   * example:
   * `/user` // 静态路径
   * `/user/{id}` // 必填参数
   * `/user/{id?}` // 可选参数
   * `/user/{id?}/{name}` // 错误的用例，可选参数后面不能再有其他参数
   */
  path: RoutePath
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
   *  4. Record<string, WidgetType | LazyLoad<WidgetType>>: 命名的小部件，同级的`RouterView`会根据name属性展示对应的小部件。
   */
  widget?: WIDGET
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
   * 如果是命名视图，则必须定义给每个命名视图定义`props`配置
   *
   * @default true
   */
  injectProps?:
    | (WIDGET extends NamedRouteWidget<infer k> ? InjectNamedProps<k> : InjectProps)
    | boolean
}

/**
 * 规范化过后的路由线路配置
 */
export interface RouteNormalized extends MakeRequired<Route, 'meta' | 'pattern'> {
  children: RouteNormalized[]
  widget: undefined | Record<string, RouteWidget>
  injectProps: undefined | InjectNamedProps
}

/**
 * 路由匹配的详情数据
 *
 * 所有和url相关的数据都已`decodeURIComponent`解码
 */
export interface RouteLocation {
  /**
   * 路由索引，调用`push`|`replace`时传入的index
   */
  index: RouteIndex
  /**
   * 完整的path，包含了query和hash
   *
   * 1. path|memory模式：`${base}${path}${query}${hash}`
   * 2. hash模式：`${base}/#${path}${query}${hash}`
   */
  fullPath: string
  /**
   * pathname
   *
   * 如果是`hash`模式，pathname和`window.location.pathname`获取的值是不一致的，因为它是从`window.location.hash`中提取出来的
   */
  path: `/${string}`
  /**
   * hash
   *
   * 带有#前缀，空字符串代表没有hash。
   *
   * @default ''
   */
  hash: HashStr
  /**
   * 动态路由path匹配的参数，包括调用`push`|`replace`时传入的params
   *
   * > 注意：必须是能够被序列化的参数，否则会导致异常。
   *
   * @default {}
   */
  params: Record<string, any>
  /**
   * search参数
   *
   * @default {}
   */
  query: Record<string, string>
  /**
   * 路由线路配置的元数据
   *
   * 如果没有配置元数据，那它将会是空对象，未匹配到任何路由也会是空对象。
   *
   * @default {}
   */
  meta: RouteMeta
  /**
   * 匹配的路由对象
   *
   * > 注意：如果数组中存在多个`RouteNormalized`对象，则说明是嵌套路由，第一个则是最顶层的父路由，最后一个是精确匹配到的路由。
   *
   * 未匹配到路由时，它会是空数组。
   *
   * @default []
   */
  matched: RouteNormalized[]
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
 * 全局路由前置钩子
 *
 * 此时路由导航还未正式开始，此钩子常用于鉴权，如果不符合条件，可以返回false阻止路由，亦可以返回重定向目标。
 *
 * @this {Router} - 路由器实例
 * @param {DeepReadonly<RouteLocation>} to - 要跳转的目标路由
 * @param {DeepReadonly<RouteLocation>} from - 从哪个路由跳转过来
 * @returns {boolean | RouteTarget | void} - 返回false表示阻止路由跳转，返回{@link RouteTarget}重定向目标
 */
export type BeforeEachCallback = (
  this: Router,
  to: DeepReadonly<RouteLocation>,
  from: DeepReadonly<RouteLocation>
) => BeforeEachCallbackResult

/**
 * 全局路由后置钩子
 *
 * 此时视图已经渲染完成，可以做一些操作，如：修改页面标题等。
 *
 * @this {Router} - 路由器实例
 * @param {DeepReadonly<RouteLocation>} to - 当前路由数据
 * @param {DeepReadonly<RouteLocation>} from - 从哪个路由跳转过来
 */
type AfterEachCallback = (
  this: Router,
  to: DeepReadonly<RouteLocation>,
  from: DeepReadonly<RouteLocation>
) => void

/**
 * 路由模式
 */
export type HistoryMode = 'hash' | 'path' | 'memory'
/**
 * 滚动行为
 *
 * 1. auto: 默认值，浏览器会自动决定滚动行为
 * 2. instant: 立即滚动到目标位置，不考虑动画效果
 * 3. smooth: 平滑滚动到目标位置，考虑动画效果
 */
export type _ScrollBehavior = 'auto' | 'instant' | 'smooth'

/**
 * 滚动配置
 *
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Window/scrollTo
 */
export interface _ScrollToOptions {
  /**
   * 滚动到目标位置的X坐标
   */
  left?: number
  /**
   * 滚动到目标位置的Y坐标
   */
  top?: number
  /**
   * 滚动行为
   *
   * @see _ScrollBehavior
   */
  behavior?: _ScrollBehavior
}

/**
 * 滚动到视图配置
 *
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollIntoView
 */
export interface _ScrollIntoViewOptions extends ScrollIntoViewOptions {
  el: Element | `#${string}` | string
}

/**
 * 滚动目标
 */
export type ScrollTarget = _ScrollToOptions | _ScrollIntoViewOptions

/**
 * 滚动结果
 *
 * false表示不滚动，否则内部会根据`ScrollTarget`滚动到指定的位置
 */
type ScrollResult = ScrollTarget | false
/**
 * 滚动行为处理器
 *
 * 仅浏览器环境有效。
 *
 * @param {RouteLocation} to - 要跳转的目标路由
 * @param {RouteLocation} from - 从哪个路由跳转过来
 * @param {_ScrollToOptions|undefined} savedPosition - 保存滚动位置，仅`history`模式前进或后退时有效
 * @returns {ScrollResult} - 返回滚动结果，由内部程序完成滚动
 */
export type ScrollBehaviorHandler = (
  to: RouteTarget,
  from: RouteTarget,
  savedPosition: _ScrollToOptions | undefined
) => ScrollResult | Promise<ScrollResult>

/**
 * 路由器配置
 */
export interface RouterOptions<T_MODE extends HistoryMode = HistoryMode> {
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
  mode?: T_MODE
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
  /**
   * 全局路由后置钩子
   *
   * @see AfterEachCallback
   */
  afterEach?: AfterEachCallback
  /**
   * 滚动行为
   *
   * 可以传入`ScrollBehavior`或`ScrollBehaviorHandler`函数自定义滚动行为。
   *
   * @default 'smooth'
   */
  scrollBehavior?: _ScrollBehavior | ScrollBehaviorHandler
  /**
   * 支持的后缀名，如：.html、.md等。
   *
   * 可选值类型：
   * 1. 通配符：`*`：支持所有后缀名，如：`/page.html`、`/page.md`等。
   * 2. 字符串类型：`html`：支持html后缀名
   * 3. 数组：`['html','md']`：同时支持html和md后缀名，注意不要以`.`开头
   * 4. false：不做任何处理，硬性匹配。
   * @default false
   */
  suffix?: '*' | string | string[] | false
  /**
   * 默认path变量匹配模式
   *
   * @default '/[\w.]+/'
   */
  pattern?: RegExp
}

/**
 * 已初始化的路由配置
 */
export type InitializedRouterOptions = MakeRequired<
  RouterOptions,
  Exclude<keyof RouterOptions, 'beforeEach' | 'afterEach'>
>
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
  hash?: HashStr
  /**
   * 路由query参数
   */
  query?: Record<string, string>
  /**
   * 路由参数
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
  route: RouteNormalized
}

/**
 * 导航结果
 */
export interface NavigateResult {
  /**
   * 状态
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
   * 它和守卫钩子`to`参数一致。
   */
  to: Readonly<RouteLocation>
  /**
   * 导航完成前的路由数据
   *
   * 它和守卫钩子`from`参数一致。
   */
  from: Readonly<RouteLocation>
  /**
   * 如果在守卫过程中被重定向，则redirectFrom为最初的路由目标，否则为undefined。
   */
  redirectFrom: RouteTarget | undefined
  /**
   * 捕获到的异常
   */
  error?: unknown
}

/**
 * 路由匹配结果
 */
export type MatchResult =
  | {
      /**
       * 匹配的路由对象
       */
      route: RouteNormalized
      /**
       * path参数
       *
       * 非动态路由path，值固定为undefined
       */
      params: Record<string, string> | undefined
    }
  | undefined

/**
 * 导航结果
 *
 * 枚举值：
 * 0. success: 导航成功
 * 1. aborted: 导航被阻止
 * 2. cancelled: 导航被取消
 * 3. duplicated: 重复导航
 * 4. not_matched: 路由未匹配
 * 5. exception: 捕获到异常
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
