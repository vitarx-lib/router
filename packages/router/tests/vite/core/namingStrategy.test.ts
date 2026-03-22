/**
 * @fileoverview namingStrategy 模块测试
 *
 * 测试命名策略转换功能
 */
import { describe, expect, it } from 'vitest'
import {
  applyNamingStrategy,
  applyNamingStrategyToName,
  applyNamingStrategyToPath
} from '../../../src/vite/core/namingStrategy.js'

describe('applyNamingStrategy', () => {
  describe('kebab 策略', () => {
    it('应该将简单驼峰转为 kebab-case', () => {
      expect(applyNamingStrategy('MainHome', 'kebab')).toBe('main-home')
    })

    it('应该处理连续大写字母', () => {
      expect(applyNamingStrategy('API', 'kebab')).toBe('api')
      expect(applyNamingStrategy('XMLParser', 'kebab')).toBe('xml-parser')
    })

    it('应该处理单个单词', () => {
      expect(applyNamingStrategy('Home', 'kebab')).toBe('home')
    })

    it('应该处理已经是 kebab-case 的字符串', () => {
      expect(applyNamingStrategy('main-home', 'kebab')).toBe('main-home')
    })
  })

  describe('lowercase 策略', () => {
    it('应该简单转为小写', () => {
      expect(applyNamingStrategy('MainHome', 'lowercase')).toBe('mainhome')
    })

    it('应该处理已经是小写的字符串', () => {
      expect(applyNamingStrategy('home', 'lowercase')).toBe('home')
    })
  })

  describe('none 策略', () => {
    it('应该保持原始命名', () => {
      expect(applyNamingStrategy('MainHome', 'none')).toBe('MainHome')
    })
  })
})

describe('applyNamingStrategyToPath', () => {
  describe('kebab 策略', () => {
    it('应该转换路径段名称', () => {
      expect(applyNamingStrategyToPath('/MainHome', 'kebab')).toBe('/main-home')
    })

    it('应该处理多段路径', () => {
      expect(applyNamingStrategyToPath('/User/MainHome', 'kebab')).toBe('/user/main-home')
    })

    it('不应该转换动态参数变量名', () => {
      expect(applyNamingStrategyToPath('/User/{userName}', 'kebab')).toBe('/user/{userName}')
    })

    it('应该处理包含动态参数的复杂路径', () => {
      expect(applyNamingStrategyToPath('/UserProfile/{userId}/Settings', 'kebab')).toBe(
        '/user-profile/{userId}/settings'
      )
    })

    it('应该处理根路径', () => {
      expect(applyNamingStrategyToPath('/', 'kebab')).toBe('/')
    })

    it('应该处理空路径段', () => {
      expect(applyNamingStrategyToPath('', 'kebab')).toBe('')
    })
  })

  describe('none 策略', () => {
    it('应该保持原始路径', () => {
      expect(applyNamingStrategyToPath('/MainHome', 'none')).toBe('/MainHome')
    })

    it('应该保持动态参数不变', () => {
      expect(applyNamingStrategyToPath('/User/{userName}', 'none')).toBe('/User/{userName}')
    })
  })
})

describe('applyNamingStrategyToName', () => {
  describe('kebab 策略', () => {
    it('应该转换路由名称', () => {
      expect(applyNamingStrategyToName('MainHome', 'kebab')).toBe('main-home')
    })

    it('应该处理带连字符的名称', () => {
      expect(applyNamingStrategyToName('user-MainHome', 'kebab')).toBe('user-main-home')
    })

    it('应该处理多段连字符名称', () => {
      expect(applyNamingStrategyToName('admin-user-Profile', 'kebab')).toBe('admin-user-profile')
    })
  })

  describe('none 策略', () => {
    it('应该保持原始名称', () => {
      expect(applyNamingStrategyToName('MainHome', 'none')).toBe('MainHome')
    })
  })
})
