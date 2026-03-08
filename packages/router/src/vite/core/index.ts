/**
 * @fileoverview 文件路由核心模块入口
 *
 * 该模块是 vitarx-router 文件路由功能的核心实现，提供基于文件系统的自动路由生成能力。
 *
 * ## 功能概述
 * - **目录扫描**：递归扫描指定目录下的页面文件
 * - **路径解析**：将文件路径转换为路由配置
 * - **动态路由**：支持 `[id].tsx` 格式的动态参数
 * - **嵌套路由**：自动识别目录结构生成嵌套路由
 * - **类型生成**：自动生成 TypeScript 类型定义
 *
 * ## 使用示例
 * ```typescript
 * import VitarxRouter from 'vitarx-router/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     VitarxRouter({
 *       pagesDir: 'src/pages',
 *       extensions: ['.tsx', '.ts'],
 *       dts: 'src/auto-router.d.ts'
 *     })
 *   ]
 * })
 * ```
 *
 * ## 文件命名约定
 * - `index.tsx` → 索引路由（路径为目录路径）
 * - `[id].tsx` → 动态路由（路径包含参数 `{id}`）
 * - `about.tsx` → 静态路由（路径为 `/about`）
 *
 * @module vite/core
 */

// 类型定义
export * from './types.js'

// 常量配置
export * from './constants.js'

// 页面扫描与路由树构建
export * from './scanPages.js'

// 页面文件解析
export * from './parsePage.js'

// 路由代码生成
export * from './generateRoutes.js'

// TypeScript 类型生成
export * from './generateTypes.js'
