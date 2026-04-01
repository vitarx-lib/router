/**
 * @fileoverview 文件路由测试共享工具
 *
 * 提供测试用例的公共辅助函数，避免代码重复。
 */
import fs from 'node:fs'
import path from 'node:path'

/**
 * 创建测试辅助工具
 *
 * @param testName - 测试名称，用于生成唯一的临时目录
 * @returns 测试辅助工具对象
 */
export function createTestHelpers(testName: string) {
  const tempDir = path.resolve(process.cwd(), `test-temp-${testName}`)

  function createTestDir() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    fs.mkdirSync(tempDir, { recursive: true })
  }

  function cleanupTestDir() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }

  function createFile(filePath: string, content: string = ''): string {
    const fullPath = path.join(tempDir, filePath)
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(fullPath, content, 'utf-8')
    return fullPath
  }

  function resolvePath(...paths: string[]) {
    return path.join(tempDir, ...paths)
  }

  return {
    tempDir,
    createTestDir,
    cleanupTestDir,
    createFile,
    resolvePath
  }
}
