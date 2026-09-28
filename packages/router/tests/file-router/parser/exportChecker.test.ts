/**
 * @fileoverview checkDefaultExport 函数测试
 *
 * 测试默认导出函数组件检测，重点覆盖「导入组件转发」场景：
 * `_layout.tsx` 与页面文件使用 `export default SomeImportedComponent`
 * 转发写法时，应被判定为有效的函数组件默认导出（历史上曾因
 * variableDeclarations 不收集 import 声明而被静默判定为无效）。
 */
import { describe, expect, it } from 'vitest'
import { checkDefaultExport } from '../../../src/file-router/parser/exportChecker.js'

describe('parser/exportChecker', () => {
  describe('快速通道', () => {
    it('不含 export default 的文件：无效', () => {
      expect(checkDefaultExport('export const a = 1', 'a.tsx')).toBe(false)
    })
  })

  describe('直接默认导出函数', () => {
    it('函数声明：有效', () => {
      const code = 'export default function Entry() { return null }'
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })

    it('箭头函数：有效', () => {
      const code = 'export default (() => null)'
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })

    it('函数表达式：有效', () => {
      const code = 'export default (function Entry() { return null })'
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })

    it('调用表达式（高阶组件包装）：有效', () => {
      const code = 'export default memo(Entry)'
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })
  })

  describe('本文件声明的标识符转发', () => {
    it('转发箭头函数变量：有效', () => {
      const code = 'const Entry = () => null\nexport default Entry'
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })

    it('转发函数声明：有效', () => {
      const code = 'function Entry() { return null }\nexport { Entry as default }'
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })
  })

  describe('导入组件转发', () => {
    it('导入默认导出转发：有效', () => {
      const code = "import AdminLayout from './AdminLayout'\nexport default AdminLayout"
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })

    it('导入命名成员转发：有效', () => {
      const code = "import { Layout } from './Layout'\nexport default Layout"
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })

    it('命名导出转发导入成员（export { X as default }）：有效', () => {
      const code = "import AdminLayout from './AdminLayout'\nexport { AdminLayout as default }"
      expect(checkDefaultExport(code, 'a.tsx')).toBe(true)
    })
  })

  describe('无效场景', () => {
    it('默认导出对象字面量：无效', () => {
      const code = 'export default { a: 1 }'
      expect(checkDefaultExport(code, 'a.tsx')).toBe(false)
    })

    it('默认导出原始值：无效', () => {
      const code = "const config = 'text'\nexport default config"
      expect(checkDefaultExport(code, 'a.tsx')).toBe(false)
    })

    it('仅命名导出非 default 成员：无效', () => {
      const code = "import AdminLayout from './AdminLayout'\nexport { AdminLayout }"
      expect(checkDefaultExport(code, 'a.tsx')).toBe(false)
    })
  })
})
