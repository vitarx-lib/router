/**
 * @fileoverview 文件读取工具模块
 *
 * 提供文件读取的默认实现和自定义读取函数的调用封装。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import type { FileReadContext, FileReader } from '../types.js'

/**
 * 创建默认文件读取函数
 *
 * @param filePath - 文件路径
 * @returns 读取文件内容的异步函数
 */
export function createDefaultReader(filePath: string): () => Promise<string> {
  return async () => {
    return fs.readFile(filePath, 'utf-8')
  }
}

/**
 * 创建文件读取上下文
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录路径
 * @returns 文件读取上下文
 */
export function createFileReadContext(
  filePath: string,
  pagesDir: string
): FileReadContext {
  const extension = path.extname(filePath)
  const relativePath = path.relative(pagesDir, filePath)

  return {
    filePath,
    extension,
    relativePath,
    pagesDir
  }
}

/**
 * 读取文件内容
 *
 * 根据是否提供自定义读取函数，选择相应的读取方式。
 *
 * @param filePath - 文件绝对路径
 * @param pagesDir - 页面目录路径
 * @param fileReader - 可选的自定义读取函数
 * @returns 文件内容
 */
export async function readFileContent(
  filePath: string,
  pagesDir: string,
  fileReader?: FileReader
): Promise<string> {
  const context = createFileReadContext(filePath, pagesDir)
  const defaultRead = createDefaultReader(filePath)

  if (fileReader) {
    return fileReader(context, defaultRead)
  }

  return defaultRead()
}
