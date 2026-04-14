/**
 * @fileoverview 测试工具函数
 *
 * 提供测试所需的公共工具函数，减少代码重复
 */
import fs from 'node:fs'
import path from 'node:path'
import type { RouterPluginOptions } from '../../src/plugin-vite/plugin.js'
import VitarxRouter from '../../src/plugin-vite/plugin.js'

/**
 * 测试上下文接口
 */
export interface TestContext {
  tempDir: string
  createFile: (filePath: string, content?: string) => void
  resolvePath: (...segments: string[]) => string
  readFile: (filePath: string) => string
  fileExists: (filePath: string) => boolean
}

/**
 * 插件测试助手接口
 */
export interface PluginTestHelper {
  plugin: ReturnType<typeof VitarxRouter>
  config: (configObj?: any, envObj?: any) => void
  configResolved: () => Promise<void>
  load: (id: string) => Promise<string | null> | string | null
  resolveId: (id: string) => string | null
  transform: (code: string, id: string) => { code: string; map: null } | null
}

/**
 * 创建测试上下文
 */
export function createTestContext(testDirName: string): TestContext {
  const tempDir = path.resolve(process.cwd(), testDirName)

  const createFile = (filePath: string, content: string = '') => {
    const fullPath = path.join(tempDir, filePath)
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(fullPath, content, 'utf-8')
  }

  const resolvePath = (...segments: string[]) => path.join(tempDir, ...segments)

  const readFile = (filePath: string) => {
    const fullPath = path.join(tempDir, filePath)
    return fs.readFileSync(fullPath, 'utf-8')
  }

  const fileExists = (filePath: string) => {
    const fullPath = path.join(tempDir, filePath)
    return fs.existsSync(fullPath)
  }

  return {
    tempDir,
    createFile,
    resolvePath,
    readFile,
    fileExists
  }
}

/**
 * 创建测试目录
 */
export function createTestDir(tempDir: string) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
  fs.mkdirSync(tempDir, { recursive: true })
}

/**
 * 清理测试目录
 */
export function cleanupTestDir(tempDir: string) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

/**
 * 创建插件测试助手
 */
export function createPluginHelper(
  options: RouterPluginOptions = {},
  env: { isPreview?: boolean } = {}
): PluginTestHelper {
  const plugin = VitarxRouter(options)

  const config = (configObj: any = {}, envObj: any = {}) => {
    const configFn = plugin.config as (config: any, env: any) => void
    configFn(configObj, { isPreview: false, ...env, ...envObj })
  }

  const configResolved = async () => {
    const configResolvedFn = plugin.configResolved as () => Promise<void>
    await configResolvedFn()
  }

  const load = (id: string) => {
    const loadFn = plugin.load as (id: string) => Promise<string | null> | string | null
    return loadFn(id)
  }

  const resolveId = (id: string) => {
    const resolveIdFn = plugin.resolveId as (id: string) => string | null
    return resolveIdFn(id)
  }

  const transform = (code: string, id: string) => {
    const transformFn = plugin.transform as (
      code: string,
      id: string
    ) => { code: string; map: null } | null
    return transformFn(code, id)
  }

  // 自动初始化配置
  if (Object.keys(options).length > 0 || Object.keys(env).length > 0) {
    config({}, env)
  }

  return {
    plugin,
    config,
    configResolved,
    load,
    resolveId,
    transform
  }
}

/**
 * 初始化插件并加载路由
 */
export async function setupPluginAndLoadRoutes(
  options: RouterPluginOptions,
  env: { isPreview?: boolean } = {}
) {
  const helper = createPluginHelper(options, env)
  await helper.configResolved()
  return helper
}

/**
 * 创建页面文件并设置插件
 */
export async function createPageAndSetupPlugin(
  ctx: TestContext,
  filePath: string,
  content: string,
  options: RouterPluginOptions = {}
) {
  ctx.createFile(filePath, content)
  return await setupPluginAndLoadRoutes({
    root: ctx.tempDir,
    ...options
  })
}
