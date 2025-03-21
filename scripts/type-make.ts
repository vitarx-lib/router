import * as fs from 'node:fs'

/**
 * 路由路线配置
 */
declare interface Route {
  path: string
  name?: string
  children?: Route[]
  widget?: any
}

/**
 * 格式化path
 *
 * @param {string} path - 路径字符串
 * @return {string} - 格式化后的路径字符串
 */
function formatPath(path: string): string {
  // 去除所有空格 处理重复//
  path = `/${path}`.replace(/\s+/g, '').replace(/\/+/g, '/')
  if (!path.length) return '/'
  if (path === '/' || path === '/#/') return path
  return path.replace(/\/$/, '')
}

/**
 * 根据路由表生成路由索引
 *
 * @param {Route[]} routes - 路由表
 * @return {{ paths: string[], names: string[] }} - 路由索引对象，包含所有路由路径和名称
 */
function buildRouteIndex(routes: Route[]): { paths: string[]; names: string[] } {
  const paths: string[] = []
  const names: string[] = []

  // 递归遍历路由，拼接路径
  function traverse(route: Route, parentPath = '') {
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

/**
 * 生成路由索引类型声明
 *
 * @param {Route[]} routes - 路由表
 * @param {string[]} custom - 自定义的名称或路径，例如['/home', 'home']
 * @param {string} [writePath] - 要写入的路径，绝对路径！例如'/Users/Vitarx/vitarx/route.type.d.ts'，默认为当前工作目录下的route.type.d.ts
 * @return {void}
 */
export default function makeTypeRoute(
  routes: Route[],
  custom: string[] = [],
  writePath: string = ''
): void {
  const { paths, names } = buildRouteIndex(routes)
  const all = [...paths, ...names, ...custom]
  // 构造类型声明字符串
  const typeDeclaration = `type VitarxRouterRouteIndexTyped = ${all.map(route => `'${route}'`).join(' | ')};`
  if (!writePath) writePath = `${process.cwd()}/route.type.d.ts`
  fs.writeFileSync(writePath, typeDeclaration, { encoding: 'utf-8' })
}
