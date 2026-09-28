/**
 * @fileoverview 导出检测模块测试
 *
 * 测试文件默认导出函数组件的检测功能，包括：
 * - export default function 声明
 * - export default 箭头函数
 * - export default 函数表达式
 * - export default 标识符引用（本文件声明 / 导入转发）
 * - export { X as default } 形式（本文件声明 / 导入转发）
 * - 无默认导出的文件
 * - 非函数默认导出
 *
 * 注：`export { X as default }` 与「导入组件转发」曾因快速通道字面量
 * 检测与 variableDeclarations 不收集 import 声明而被判无效（静默跳过
 * 布局注册），现已支持，相关用例断言为 true。
 */
import { describe, expect, it } from 'vitest'
import { checkDefaultExport } from '../../../src/file-router/parser/index.js'

describe('parser/exportChecker', () => {
  describe('checkDefaultExport - 有效默认导出', () => {
    it.each([
      [
        'export default call() 声明',
        'import {builder} from "vitarx"\nexport default builder(()=><div/>)'
      ],
      ['export default function 声明', 'export default function Home() { return <div>Home</div> }'],
      ['export default 箭头函数', 'export default () => <div>Home</div>'],
      ['export default 函数表达式', 'export default function() { return <div>Home</div> }'],
      [
        'export default 引用函数声明',
        `function Home() { return <div>Home</div> }\nexport default Home`
      ],
      ['export default 引用箭头函数', `const Home = () => <div>Home</div>\nexport default Home`],
      [
        'export default 转发导入的默认导出',
        `import AdminLayout from './AdminLayout'\nexport default AdminLayout`
      ],
      [
        'export default 转发导入的命名成员',
        `import { Layout } from './Layout'\nexport default Layout`
      ],
      [
        'export { X as default } 转发函数声明',
        `function Home() { return <div>Home</div> }\nexport { Home as default }`
      ],
      [
        'export { X as default } 转发箭头函数',
        `const Home = () => <div>Home</div>\nexport { Home as default }`
      ],
      [
        'export { X as default } 转发导入的组件',
        `import AdminLayout from './AdminLayout'\nexport { AdminLayout as default }`
      ],
      [
        '包含 definePage 宏的文件',
        `definePage({ name: 'home' })\nexport default function Home() { return <div>Home</div> }`
      ],
      [
        '包含 TypeScript 类型的文件',
        `interface Props { title: string }\nexport default function Home(props: Props) { return <div>{props.title}</div> }`
      ],
      [
        '包含 JSX 的文件',
        `export default function Home() {\n  return (\n    <div>\n      <h1>Hello</h1>\n    </div>\n  )\n}`
      ]
    ] as const)('应该检测 %s', (_, code) => {
      expect(checkDefaultExport(code, 'Home.tsx')).toBe(true)
    })
  })

  describe('checkDefaultExport - 无效默认导出', () => {
    it.each([
      ['无 export default', 'const Home = () => <div>Home</div>'],
      ['默认导出对象', "export default { name: 'Home' }"],
      ['默认导出字符串', "export default 'Home'"],
      ['默认导出数字', 'export default 42'],
      [
        'export { X as default } 中 X 为非函数',
        "const config = { name: 'Home' }\nexport { config as default }"
      ],
      ['默认导出标识符引用非函数变量', "const config = { name: 'Home' }\nexport default config"],
      ['export default class（非函数）', 'export default class MyClass {}'],
      ['仅命名导出非 default 成员', "import Home from './Home'\nexport { Home }"]
    ] as const)('应该在 %s 时返回 false', (_, code) => {
      expect(checkDefaultExport(code, 'Home.tsx')).toBe(false)
    })

    it('应该在内容不包含 export default 字符串时快速返回 false', () => {
      expect(checkDefaultExport('const x = 1', 'test.ts')).toBe(false)
    })
  })
})
