/**
 * @fileoverview 命名策略工具测试
 *
 * 测试命名策略转换功能，包括：
 * - kebab 命名策略
 * - lowercase 命名策略
 * - none 命名策略
 */
import { describe, expect, it } from 'vitest'
import {
  applyNamingStrategy,
  applyNamingStrategyToPath,
  applyNamingStrategyToName
} from '../../../src/file-router/utils/namingStrategy.js'

describe('utils/namingStrategy', () => {
  describe('applyNamingStrategy', () => {
    it('应该正确转换为 kebab-case', () => {
      expect(applyNamingStrategy('MainHome', 'kebab')).toBe('main-home')
      expect(applyNamingStrategy('UserProfile', 'kebab')).toBe('user-profile')
      expect(applyNamingStrategy('API', 'kebab')).toBe('api')
      expect(applyNamingStrategy('XMLParser', 'kebab')).toBe('xml-parser')
    })

    it('应该正确转换为 lowercase', () => {
      expect(applyNamingStrategy('MainHome', 'lowercase')).toBe('mainhome')
      expect(applyNamingStrategy('UserProfile', 'lowercase')).toBe('userprofile')
    })

    it('应该保持原始命名 (none)', () => {
      expect(applyNamingStrategy('MainHome', 'none')).toBe('MainHome')
      expect(applyNamingStrategy('UserProfile', 'none')).toBe('UserProfile')
    })
  })

  describe('applyNamingStrategyToPath', () => {
    it('应该正确处理路径中的命名', () => {
      expect(applyNamingStrategyToPath('/MainHome', 'kebab')).toBe('/main-home')
      expect(applyNamingStrategyToPath('/UserProfile', 'kebab')).toBe('/user-profile')
    })

    it('应该正确处理多段路径', () => {
      expect(applyNamingStrategyToPath('/API/UserProfile', 'kebab')).toBe('/api/user-profile')
    })

    it('应该保留动态参数不变', () => {
      expect(applyNamingStrategyToPath('/User/{userName}', 'kebab')).toBe('/user/{userName}')
      expect(applyNamingStrategyToPath('/posts/{postId}/comments/{commentId}', 'kebab')).toBe(
        '/posts/{postId}/comments/{commentId}'
      )
    })

    it('应该正确处理根路径', () => {
      expect(applyNamingStrategyToPath('/', 'kebab')).toBe('/')
    })
  })

  describe('applyNamingStrategyToName', () => {
    it('应该正确处理路由名称', () => {
      expect(applyNamingStrategyToName('MainHome', 'kebab')).toBe('main-home')
      expect(applyNamingStrategyToName('user-MainHome', 'kebab')).toBe('user-main-home')
    })

    it('应该正确处理带连字符的名称', () => {
      expect(applyNamingStrategyToName('user-profile-settings', 'kebab')).toBe('user-profile-settings')
    })
  })
})
