import { describe, expect, it } from 'vitest'
import { __ROUTER_KEY__, NavState } from '../../../src/core/common/constant.js'

describe('common/constant', () => {
  describe('NavState', () => {
    it('success 应该等于 1', () => {
      expect(NavState.success).toBe(1)
    })

    it('aborted 应该等于 2', () => {
      expect(NavState.aborted).toBe(2)
    })

    it('cancelled 应该等于 4', () => {
      expect(NavState.cancelled).toBe(4)
    })

    it('duplicated 应该等于 8', () => {
      expect(NavState.duplicated).toBe(8)
    })

    it('notfound 应该等于 16', () => {
      expect(NavState.notfound).toBe(16)
    })

    it('各状态值应该是 2 的幂次方', () => {
      expect(NavState.success).toBe(1 << 0)
      expect(NavState.aborted).toBe(1 << 1)
      expect(NavState.cancelled).toBe(1 << 2)
      expect(NavState.duplicated).toBe(1 << 3)
      expect(NavState.notfound).toBe(1 << 4)
    })

    it('各状态值应该可以使用位运算组合', () => {
      const combined = NavState.success | NavState.aborted
      expect(combined).toBe(3)
      expect(combined & NavState.success).toBe(NavState.success)
      expect(combined & NavState.aborted).toBe(NavState.aborted)
    })

    it('各状态值之间应该互不重叠', () => {
      const states = [
        NavState.success,
        NavState.aborted,
        NavState.cancelled,
        NavState.duplicated,
        NavState.notfound
      ]
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          expect(states[i] & states[j]).toBe(0)
        }
      }
    })

    it('可以使用位运算检查特定状态', () => {
      const state = NavState.aborted
      expect(state & NavState.aborted).toBeTruthy()
      expect(state & NavState.success).toBeFalsy()
    })
  })

  describe('__ROUTER_KEY__', () => {
    it('应该是一个 Symbol', () => {
      expect(typeof __ROUTER_KEY__).toBe('symbol')
    })

    it('应该使用 Symbol.for 创建', () => {
      expect(__ROUTER_KEY__).toBe(Symbol.for('__v_router_inject_key'))
    })

    it('多次访问应该返回相同的 Symbol', () => {
      const key1 = Symbol.for('__v_router_inject_key')
      const key2 = Symbol.for('__v_router_inject_key')
      expect(key1).toBe(key2)
      expect(key1).toBe(__ROUTER_KEY__)
    })
  })
})
