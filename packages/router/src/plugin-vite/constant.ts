/** 虚拟模块 ID，用于导入自动生成的路由配置 */
export const VIRTUAL_ROUTES_ID = 'virtual:vitarx-router:routes'

/**
 * 解析后的路由模块 ID
 *
 * Vite 要求虚拟模块的解析 ID 必须以 `\0` 开头，
 * 这样其他插件就不会尝试处理这个模块
 */
export const RESOLVED_ROUTES_ID = '\0' + VIRTUAL_ROUTES_ID
