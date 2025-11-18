// noinspection JSUnusedLocalSymbols

import {
  ref,
  reactive,
  isRef,
  unref,
  effect,
  isReactive,
  setConfig,
  getConfig,
  enableDebug,
  getEffectStats,
  clearReactivityState
} from '../src'

describe('Utility Functions', () => {
  beforeEach(clearReactivityState)

  describe('Configuration Management', () => {
    it('should set and get configuration options', () => {
      const originalConfig = getConfig()

      setConfig({
        enableDebug: true,
        batchUpdates: false,
        cyclePrevention: false
      })

      const newConfig = getConfig()

      expect(newConfig.enableDebug).toBe(true)
      expect(newConfig.batchUpdates).toBe(false)
      expect(newConfig.cyclePrevention).toBe(false)

      setConfig(originalConfig)
    })

    it('should enable and disable debug mode', () => {
      enableDebug(true)
      let config = getConfig()
      expect(config.enableDebug).toBe(true)

      enableDebug(false)
      config = getConfig()
      expect(config.enableDebug).toBe(false)
    })

    it('should get effect statistics', () => {
      const stats = getEffectStats()

      expect(typeof stats.activeEffects).toBe('number')
      expect(typeof stats.queuedUpdates).toBe('number')
      expect(stats.activeEffects).toBeGreaterThanOrEqual(0)
      expect(stats.queuedUpdates).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Type Checking Utilities', () => {
    it('isRef should correctly identify ref instances', () => {
      const count = ref(0)
      const obj = reactive({ count: 0 })
      const plainValue = 42
      const plainObject = { count: 0 }
      const nullValue = null
      const undefinedValue = undefined

      expect(isRef(count)).toBe(true)
      expect(isRef(obj)).toBe(false)
      expect(isRef(plainValue)).toBe(false)
      expect(isRef(plainObject)).toBe(false)
      expect(isRef(nullValue)).toBe(false)
      expect(isRef(undefinedValue)).toBe(false)
    })

    it('isReactive should correctly identify reactive objects', () => {
      const count = ref(0)
      const obj = reactive({ count: 0 })
      const arr = reactive([1, 2, 3])
      const plainValue = 42
      const plainObject = { count: 0 }
      const plainArray = [1, 2, 3]

      expect(isReactive(count)).toBe(false)
      expect(isReactive(obj)).toBe(true)
      expect(isReactive(arr)).toBe(true)
      expect(isReactive(plainValue)).toBe(false)
      expect(isReactive(plainObject)).toBe(false)
      expect(isReactive(plainArray)).toBe(false)
    })

    it('unref should return value from ref or original value', () => {
      const count = ref(42)
      const obj = reactive({ value: 100 })
      const plainNumber = 200
      const plainString = 'test'
      const nullValue = null
      const undefinedValue = undefined

      expect(unref(count)).toBe(42)
      expect(unref(obj)).toBe(obj)
      expect(unref(plainNumber)).toBe(200)
      expect(unref(plainString)).toBe('test')
      expect(unref(nullValue)).toBe(null)
      expect(unref(undefinedValue)).toBe(undefined)
    })
  })

  describe('State Management', () => {
    it('clearReactivityState should reset all internal state', () => {
      const count = ref(0)
      const obj = reactive({ value: 1 })

      let effectCallCount = 0

      effect(() => {
        effectCallCount++
        const value = count.value
        const objValue = obj.value
      })

      count.value = 1
      obj.value = 2

      expect(effectCallCount).toBe(3)

      clearReactivityState()

      const stats = getEffectStats()
      expect(stats.activeEffects).toBe(0)
      expect(stats.queuedUpdates).toBe(0)
    })
  })
})
