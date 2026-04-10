/**
 * @fileoverview 配置验证模块测试
 *
 * 测试配置选项验证功能，包括：
 * - root 配置验证
 * - pages 配置验证
 * - pathStrategy 配置验证
 * - importMode 配置验证
 * - injectImports 配置验证
 * - dts 配置验证
 * - layoutFileName 配置验证
 * - configFileName 配置验证
 * - transform 配置验证
 * - extendRoute 配置验证
 */
import { describe, expect, it } from 'vitest'
import { validateOptions } from '../../../src/file-router/config/validate.js'

describe('config/validate', () => {
  describe('validateOptions - root 配置', () => {
    it('应该接受有效的 root 字符串', () => {
      expect(() => validateOptions({ root: '/project' })).not.toThrow()
    })

    it('应该在 root 为空字符串时抛出错误', () => {
      expect(() => validateOptions({ root: '' })).toThrow('options.root 不能为空字符串')
    })

    it('应该在 root 为非字符串时抛出错误', () => {
      expect(() => validateOptions({ root: 123 as any })).toThrow('options.root 必须是字符串')
    })

    it('应该在 root 未定义时通过验证', () => {
      expect(() => validateOptions({})).not.toThrow()
    })
  })

  describe('validateOptions - pages 配置', () => {
    it('应该接受有效的 pages 字符串', () => {
      expect(() => validateOptions({ pages: 'src/pages' })).not.toThrow()
    })

    it('应该在 pages 为空字符串时抛出错误', () => {
      expect(() => validateOptions({ pages: '' })).toThrow('options.pages 不能为空字符串')
    })

    it('应该在 pages 为空数组时抛出错误', () => {
      expect(() => validateOptions({ pages: [] })).toThrow('options.pages 数组不能为空')
    })

    it('应该接受有效的 pages 字符串数组', () => {
      expect(() => validateOptions({ pages: ['src/pages', 'src/admin'] })).not.toThrow()
    })

    it('应该在 pages 数组包含空字符串时抛出错误', () => {
      expect(() => validateOptions({ pages: ['src/pages', ''] })).toThrow(
        'options.pages[1] 不能为空字符串'
      )
    })

    it('应该接受有效的 pages 对象数组', () => {
      expect(() =>
        validateOptions({ pages: [{ dir: 'src/pages', include: ['**/*.tsx'] }] })
      ).not.toThrow()
    })

    it('应该在 pages 对象缺少 dir 时抛出错误', () => {
      expect(() => validateOptions({ pages: [{ include: ['**/*.tsx'] }] as any })).toThrow(
        'options.pages[0].dir 必须是非空字符串'
      )
    })

    it('应该在 pages 对象 dir 为空字符串时抛出错误', () => {
      expect(() => validateOptions({ pages: [{ dir: '' }] })).toThrow(
        'options.pages[0].dir 必须是非空字符串'
      )
    })

    it('应该在 pages 对象 include 非数组时抛出错误', () => {
      expect(() => validateOptions({ pages: [{ dir: 'src/pages', include: 'wrong' as any }] })).toThrow(
        'options.pages[0].include 必须是数组'
      )
    })

    it('应该在 pages 对象 exclude 非数组时抛出错误', () => {
      expect(() => validateOptions({ pages: [{ dir: 'src/pages', exclude: 'wrong' as any }] })).toThrow(
        'options.pages[0].exclude 必须是数组'
      )
    })

    it('应该在 pages 为无效类型时抛出错误', () => {
      expect(() => validateOptions({ pages: 123 as any })).toThrow(
        'options.pages 必须是字符串、字符串数组或对象数组'
      )
    })

    it('应该在 pages 数组项为无效类型时抛出错误', () => {
      expect(() => validateOptions({ pages: [123 as any] })).toThrow(
        'options.pages[0] 必须是字符串或对象'
      )
    })
  })

  describe('validateOptions - pathStrategy 配置', () => {
    it('应该接受有效的 pathStrategy 值', () => {
      expect(() => validateOptions({ pathStrategy: 'kebab' })).not.toThrow()
      expect(() => validateOptions({ pathStrategy: 'lowercase' })).not.toThrow()
      expect(() => validateOptions({ pathStrategy: 'raw' })).not.toThrow()
    })

    it('应该在 pathStrategy 无效时抛出错误', () => {
      expect(() => validateOptions({ pathStrategy: 'invalid' as any })).toThrow(
        "options.pathStrategy 必须是 'kebab'、'lowercase' 或 'raw'"
      )
    })
  })

  describe('validateOptions - importMode 配置', () => {
    it('应该接受有效的 importMode 值', () => {
      expect(() => validateOptions({ importMode: 'lazy' })).not.toThrow()
      expect(() => validateOptions({ importMode: 'sync' })).not.toThrow()
    })

    it('应该在 importMode 无效时抛出错误', () => {
      expect(() => validateOptions({ importMode: 'invalid' as any })).toThrow(
        "options.importMode 必须是 'lazy'、'sync' 或函数"
      )
    })
  })

  describe('validateOptions - injectImports 配置', () => {
    it('应该接受有效的 injectImports 数组', () => {
      expect(() =>
        validateOptions({ injectImports: ["import { lazy } from 'vitarx'"] })
      ).not.toThrow()
    })

    it('应该在 injectImports 非数组时抛出错误', () => {
      expect(() => validateOptions({ injectImports: 'wrong' as any })).toThrow(
        'options.injectImports 必须是数组'
      )
    })

    it('应该在 injectImports 包含非字符串项时抛出错误', () => {
      expect(() => validateOptions({ injectImports: [123 as any] })).toThrow(
        'options.injectImports[0] 必须是字符串'
      )
    })
  })

  describe('validateOptions - dts 配置', () => {
    it('应该接受 dts 为 boolean', () => {
      expect(() => validateOptions({ dts: true })).not.toThrow()
      expect(() => validateOptions({ dts: false })).not.toThrow()
    })

    it('应该接受 dts 为有效字符串', () => {
      expect(() => validateOptions({ dts: 'typed-router.d.ts' })).not.toThrow()
    })

    it('应该在 dts 为空字符串时抛出错误', () => {
      expect(() => validateOptions({ dts: '' })).toThrow('options.dts 为字符串时不能为空字符串')
    })

    it('应该在 dts 为无效类型时抛出错误', () => {
      expect(() => validateOptions({ dts: 123 as any })).toThrow(
        'options.dts 必须是 boolean 或 string'
      )
    })
  })

  describe('validateOptions - layoutFileName 配置', () => {
    it('应该接受有效的 layoutFileName', () => {
      expect(() => validateOptions({ layoutFileName: '_layout' })).not.toThrow()
    })

    it('应该在 layoutFileName 为空字符串时抛出错误', () => {
      expect(() => validateOptions({ layoutFileName: '' })).toThrow(
        'options.layoutFileName 不能为空字符串'
      )
    })

    it('应该在 layoutFileName 为非字符串时抛出错误', () => {
      expect(() => validateOptions({ layoutFileName: 123 as any })).toThrow(
        'options.layoutFileName 必须是字符串'
      )
    })
  })

  describe('validateOptions - configFileName 配置', () => {
    it('应该接受有效的 configFileName', () => {
      expect(() => validateOptions({ configFileName: '_config' })).not.toThrow()
    })

    it('应该在 configFileName 为空字符串时抛出错误', () => {
      expect(() => validateOptions({ configFileName: '' })).toThrow(
        'options.configFileName 不能为空字符串'
      )
    })

    it('应该在 configFileName 为非字符串时抛出错误', () => {
      expect(() => validateOptions({ configFileName: 123 as any })).toThrow(
        'options.configFileName 必须是字符串'
      )
    })
  })

  describe('validateOptions - transform 配置', () => {
    it('应该接受有效的 transform 函数', () => {
      expect(() => validateOptions({ transform: () => '' })).not.toThrow()
    })

    it('应该在 transform 为非函数时抛出错误', () => {
      expect(() => validateOptions({ transform: 'wrong' as any })).toThrow(
        'options.transform 必须是函数'
      )
    })
  })

  describe('validateOptions - extendRoute 配置', () => {
    it('应该接受有效的 extendRoute 函数', () => {
      expect(() => validateOptions({ extendRoute: () => {} })).not.toThrow()
    })

    it('应该在 extendRoute 为非函数时抛出错误', () => {
      expect(() => validateOptions({ extendRoute: 'wrong' as any })).toThrow(
        'options.extendRoute 必须是函数'
      )
    })
  })

  describe('validateOptions - 完整配置', () => {
    it('应该接受空配置', () => {
      expect(() => validateOptions({})).not.toThrow()
    })

    it('应该接受完整的有效配置', () => {
      expect(() =>
        validateOptions({
          root: '/project',
          pages: [{ dir: 'src/pages', include: ['**/*.tsx'], exclude: ['**/test/**'] }],
          pathStrategy: 'kebab',
          importMode: 'lazy',
          injectImports: ["import { lazy } from 'vitarx'"],
          dts: 'typed-router.d.ts',
          layoutFileName: '_layout',
          configFileName: '_config',
          transform: (content: string) => content,
          extendRoute: route => route
        })
      ).not.toThrow()
    })
  })
})
