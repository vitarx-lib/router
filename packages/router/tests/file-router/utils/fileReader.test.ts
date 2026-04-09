/**
 * @fileoverview 文件读取工具模块测试
 *
 * 测试文件读取功能，包括：
 * - 默认读取行为
 * - 自定义 transform 钩子
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFileContent } from '../../../src/file-router/utils/fileReader.js'
import { createTestHelpers } from '../testUtils.js'

const { tempDir, createTestDir, cleanupTestDir, createFile, resolvePath } =
  createTestHelpers('file-reader')

describe('utils/fileReader', () => {
  beforeEach(() => {
    createTestDir()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('readFileContent', () => {
    it('应该正确读取文件内容', () => {
      const filePath = createFile('test.tsx', 'export default function Home() {}')
      const content = readFileContent(filePath)
      expect(content).toBe('export default function Home() {}')
    })

    it('应该正确读取包含中文的文件内容', () => {
      const filePath = createFile('test.tsx', 'export default function 首页() {}')
      const content = readFileContent(filePath)
      expect(content).toBe('export default function 首页() {}')
    })

    it('应该正确读取空文件', () => {
      const filePath = createFile('empty.tsx', '')
      const content = readFileContent(filePath)
      expect(content).toBe('')
    })

    it('应该正确读取多行文件', () => {
      const code = `import { definePage } from 'vitarx-router/auto-routes'\n\ndefinePage({ name: 'home' })\n\nexport default function Home() {\n  return <div>Home</div>\n}`
      const filePath = createFile('multi.tsx', code)
      const content = readFileContent(filePath)
      expect(content).toBe(code)
    })

    it('应该使用 transform 钩子转换内容', () => {
      const filePath = createFile('test.tsx', 'original content')
      const transform = (content: string, _file: string) => content.toUpperCase()
      const result = readFileContent(filePath, transform)
      expect(result).toBe('ORIGINAL CONTENT')
    })

    it('应该将文件路径传递给 transform 钩子', () => {
      const filePath = createFile('test.tsx', 'content')
      let receivedPath = ''
      const transform = (content: string, file: string) => {
        receivedPath = file
        return content
      }
      readFileContent(filePath, transform)
      expect(receivedPath).toBe(filePath)
    })

    it('应该在文件不存在时抛出错误', () => {
      const nonExistentPath = resolvePath('nonexistent.tsx')
      expect(() => readFileContent(nonExistentPath)).toThrow()
    })
  })
})
