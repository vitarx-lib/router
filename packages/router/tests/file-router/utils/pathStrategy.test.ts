/**
 * @fileoverview 路径策略工具测试
 *
 * 测试路径策略转换功能，包括：
 * - kebab 路径策略
 * - lowercase 路径策略
 * - raw 路径策略
 */
import { describe, expect, it } from 'vitest'
import { applyPathStrategy } from '../../../src/file-router/utils/pathStrategy.js'

describe('utils/pathStrategy', () => {
  describe('applyPathStrategy', () => {
    describe('kebab 策略', () => {
      it('应该正确转换为 kebab-case', () => {
        expect(applyPathStrategy('/MainHome', 'kebab')).toBe('/main-home')
        expect(applyPathStrategy('/UserProfile', 'kebab')).toBe('/user-profile')
        expect(applyPathStrategy('/API', 'kebab')).toBe('/api')
        expect(applyPathStrategy('/XMLParser', 'kebab')).toBe('/xml-parser')
      })

      it('应该正确处理多段路径', () => {
        expect(applyPathStrategy('/API/UserProfile', 'kebab')).toBe('/api/user-profile')
        expect(applyPathStrategy('/Admin/UserManagement/Settings', 'kebab')).toBe(
          '/admin/user-management/settings'
        )
      })

      it('应该保留动态参数不变', () => {
        expect(applyPathStrategy('/User/[userName]', 'kebab')).toBe('/user/[user-name]')
        expect(applyPathStrategy('/posts/[postId]/comments/[commentId]', 'kebab')).toBe(
          '/posts/[post-id]/comments/[comment-id]'
        )
      })

      it('应该正确处理根路径', () => {
        expect(applyPathStrategy('/', 'kebab')).toBe('/')
      })

      it('应该正确处理空字符串', () => {
        expect(applyPathStrategy('', 'kebab')).toBe('')
      })

      it('应该正确处理已包含连字符的路径', () => {
        expect(applyPathStrategy('/user-profile-settings', 'kebab')).toBe('/user-profile-settings')
      })
    })

    describe('lowercase 策略', () => {
      it('应该正确转换为小写', () => {
        expect(applyPathStrategy('/MainHome', 'lowercase')).toBe('/mainhome')
        expect(applyPathStrategy('/UserProfile', 'lowercase')).toBe('/userprofile')
        expect(applyPathStrategy('/API', 'lowercase')).toBe('/api')
      })

      it('应该正确处理多段路径', () => {
        expect(applyPathStrategy('/API/UserProfile', 'lowercase')).toBe('/api/userprofile')
      })

      it('应该保留动态参数不变', () => {
        expect(applyPathStrategy('/User/[userName]', 'lowercase')).toBe('/user/[username]')
      })

      it('应该正确处理根路径', () => {
        expect(applyPathStrategy('/', 'lowercase')).toBe('/')
      })
    })

    describe('raw 策略', () => {
      it('应该保持原始命名', () => {
        expect(applyPathStrategy('/MainHome', 'raw')).toBe('/MainHome')
        expect(applyPathStrategy('/UserProfile', 'raw')).toBe('/UserProfile')
        expect(applyPathStrategy('/API/UserProfile', 'raw')).toBe('/API/UserProfile')
      })

      it('应该保留动态参数', () => {
        expect(applyPathStrategy('/User/[userName]', 'raw')).toBe('/User/[userName]')
      })

      it('应该正确处理根路径', () => {
        expect(applyPathStrategy('/', 'raw')).toBe('/')
      })
    })

    describe('边界情况', () => {
      it('应该正确处理连续斜杠', () => {
        expect(applyPathStrategy('//UserProfile', 'kebab')).toBe('//user-profile')
      })

      it('应该正确处理带数字的路径', () => {
        expect(applyPathStrategy('/User123', 'kebab')).toBe('/user123')
        expect(applyPathStrategy('/API2Parser', 'kebab')).toBe('/api2parser')
      })

      it('应该正确处理特殊字符', () => {
        expect(applyPathStrategy('/User_Profile', 'kebab')).toBe('/user_profile')
        expect(applyPathStrategy('/user-profile', 'kebab')).toBe('/user-profile')
      })
    })
  })
})
