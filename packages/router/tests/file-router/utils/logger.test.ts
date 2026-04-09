/**
 * @fileoverview 日志工具模块测试
 *
 * 测试统一日志输出功能，包括：
 * - setLogPrefix 日志前缀设置
 * - setDebugEnabled 调试日志开关
 * - info/warn/error/debug 日志输出
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  debug,
  error,
  info,
  setDebugEnabled,
  setLogPrefix,
  warn
} from '../../../src/file-router/utils/logger.js'

describe('utils/logger', () => {
  afterEach(() => {
    setLogPrefix('vitarx-router')
    setDebugEnabled(false)
    vi.restoreAllMocks()
  })

  describe('setLogPrefix', () => {
    it('应该更新日志前缀', () => {
      setLogPrefix('custom-prefix')
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      info('test message')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[custom-prefix]')
      )
    })
  })

  describe('setDebugEnabled', () => {
    it('应该在禁用时不输出 debug 日志', () => {
      setDebugEnabled(false)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      debug('debug message')
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('应该在启用时输出 debug 日志', () => {
      setDebugEnabled(true)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      debug('debug message')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug message')
      )
    })
  })

  describe('info', () => {
    it('应该输出信息级日志', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      info('info message')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('info message')
      )
    })

    it('应该包含日志前缀', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      info('test')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[vitarx-router]')
      )
    })

    it('应该包含 (info) 级别标签', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      info('test')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('(info)')
      )
    })

    it('应该包含详细信息', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      info('main message', 'detail info')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('detail info')
      )
    })
  })

  describe('warn', () => {
    it('应该输出警告级日志', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      warn('warn message')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('warn message')
      )
    })

    it('应该包含 (warn) 级别标签', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      warn('test')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('(warn)')
      )
    })
  })

  describe('error', () => {
    it('应该输出错误级日志', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      error('error message')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('error message')
      )
    })

    it('应该包含 (error) 级别标签', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      error('test')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('(error)')
      )
    })
  })

  describe('debug', () => {
    it('应该在禁用时静默', () => {
      setDebugEnabled(false)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      debug('debug message')
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('应该在启用时输出调试级日志', () => {
      setDebugEnabled(true)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      debug('debug message')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug message')
      )
    })

    it('应该包含 (debug) 级别标签', () => {
      setDebugEnabled(true)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      debug('test')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('(debug)')
      )
    })
  })
})
