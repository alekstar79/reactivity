// noinspection JSUnusedLocalSymbols

import { ref, shallowRef, reactive, isRef, isShallowRef, unref, isReactive, batch, effect, clearReactivityState } from '../src'

describe('Reactivity System', () => {
  beforeEach(clearReactivityState)

  describe('ref', () => {
    it('should create reactive value with initial value', () => {
      const count = ref(0)
      expect(count.value).toBe(0)
    })

    it('should track and trigger effects for ref changes', () => {
      const count = ref(0)
      let effectCallCount = 0

      const stop = effect(() => {
        effectCallCount++
        const value = count.value
      })

      count.value = 1
      count.value = 2

      expect(effectCallCount).toBe(3)
      stop()
    })

    it('should not trigger effect if value does not change', () => {
      const count = ref(0)
      let effectCallCount = 0

      const stop = effect(() => {
        effectCallCount++
        const value = count.value
      })

      count.value = 0
      count.value = 0

      expect(effectCallCount).toBe(1)
      stop()
    })
  })

  describe('shallowRef', () => {
    it('should create a shallow ref', () => {
      const value = { nested: { count: 0 } }
      const shallow = shallowRef(value)

      expect(shallow.value).toBe(value)
      expect(isShallowRef(shallow)).toBe(true)
    })

    it('should track and trigger effects on value replacement', () => {
      const shallow = shallowRef({ count: 0 })
      let effectCount = 0

      const stop = effect(() => {
        effectCount++
        const value = shallow.value
      })

      // Replace the entire value - should trigger effect
      shallow.value = { count: 1 }

      expect(effectCount).toBe(2)
      stop()
    })

    it('should NOT track nested property changes', () => {
      const shallow = shallowRef({ nested: { count: 0 } })
      let effectCount = 0

      const stop = effect(() => {
        effectCount++
        const value = shallow.value
      })

      // Modify nested property - should NOT trigger effect
      shallow.value.nested.count = 1

      expect(effectCount).toBe(1) // Only the initial run
      stop()
    })

    it('should work with primitive values like regular ref', () => {
      const shallow = shallowRef(0)
      let effectCount = 0

      const stop = effect(() => {
        effectCount++
        const value = shallow.value
      })

      shallow.value = 1
      shallow.value = 2

      expect(effectCount).toBe(3)
      expect(shallow.value).toBe(2)
      stop()
    })

    it('should work with arrays', () => {
      const shallow = shallowRef([1, 2, 3])
      let effectCount = 0

      const stop = effect(() => {
        effectCount++
        const value = shallow.value
      })

      // Replace entire array - should trigger
      shallow.value = [4, 5, 6]
      expect(effectCount).toBe(2)

      // Modify array content - should NOT trigger
      shallow.value.push(7)
      expect(effectCount).toBe(2)

      stop()
    })

    it('should differentiate from regular ref', () => {
      const regular = ref({ count: 0 })
      const shallow = shallowRef({ count: 0 })

      expect(isShallowRef(regular)).toBe(false)
      expect(isShallowRef(shallow)).toBe(true)
    })

    it('should handle null and undefined values', () => {
      const shallowNull = shallowRef(null)
      const shallowUndefined = shallowRef(undefined)

      expect(shallowNull.value).toBe(null)
      expect(shallowUndefined.value).toBe(undefined)

      shallowNull.value = { data: 'test' }
      shallowUndefined.value = { data: 'test' }

      expect(shallowNull.value.data).toBe('test')
      expect(shallowUndefined.value.data).toBe('test')
    })

    it('should work in batch operations', () => {
      const shallow = shallowRef({ count: 0 })
      let effectCount = 0

      const stop = effect(() => {
        effectCount++
        const value = shallow.value
      })

      batch(() => {
        shallow.value = { count: 1 }
        shallow.value = { count: 2 }
      })

      expect(effectCount).toBe(2) // Initial + batch
      stop()
    })
  })

  describe('reactive', () => {
    it('should create reactive object', () => {
      const obj = reactive({ count: 0, name: 'test' })
      expect(obj.count).toBe(0)
      expect(obj.name).toBe('test')
    })

    it('should trigger effects on property changes', () => {
      const obj = reactive({ count: 0 })
      let effectCallCount = 0

      const stop = effect(() => {
        effectCallCount++
        const value = obj.count
      })

      obj.count = 1
      obj.count = 2

      expect(effectCallCount).toBe(3)
      stop()
    })

    it('should handle nested reactive objects', () => {
      const obj = reactive({
        user: {
          name: 'Alice',
          profile: { age: 30 }
        }
      })

      let effectCallCount = 0
      const stop = effect(() => {
        effectCallCount++
        const name = obj.user.name
        const age = obj.user.profile.age
      })

      obj.user.name = 'Bob'
      obj.user.profile.age = 31

      expect(effectCallCount).toBe(3)
      stop()
    })

    it('should handle arrays reactively', () => {
      const arr = reactive([1, 2, 3])
      let effectCallCount = 0

      const stop = effect(() => {
        effectCallCount++
        const length = arr.length
      })

      arr.push(4)
      arr.pop()
      arr[0] = 10

      expect(effectCallCount).toBe(3)
      stop()
    })

    it('should handle array methods correctly', () => {
      const arr = reactive([1, 2, 3])
      let effectCallCount = 0

      const stop = effect(() => {
        effectCallCount++;
        const value = arr.join(',')
      })

      arr.push(4)
      arr.splice(1, 1)
      arr.reverse()

      expect(effectCallCount).toBeGreaterThanOrEqual(4)
      stop()
    })
  })

  describe('batch', () => {
    it('should batch multiple updates into single effect run', () => {
      const a = ref(0)
      const b = ref(0)
      let effectCallCount = 0

      const stop = effect(() => {
        effectCallCount++
        const sum = a.value + b.value
      })

      effectCallCount = 0
      batch(() => {
        a.value = 10
        b.value = 20
      })

      expect(effectCallCount).toBe(1)
      stop()
    })

    it('should handle nested batch calls', () => {
      const a = ref(0)
      const b = ref(0)
      let effectCallCount = 0

      const stop = effect(() => {
        effectCallCount++
        const sum = a.value + b.value
      })

      effectCallCount = 0
      batch(() => {
        a.value = 1
        batch(() => {
          b.value = 2
        })
      })

      expect(effectCallCount).toBe(1)
      stop()
    })
  })

  describe('utils', () => {
    it('isRef should correctly identify ref objects', () => {
      const count = ref(0)
      const obj = reactive({ count: 0 })
      const plain = 42
      const plainObj = { count: 0 }

      expect(isRef(count)).toBe(true)
      expect(isRef(obj)).toBe(false)
      expect(isRef(plain)).toBe(false)
      expect(isRef(plainObj)).toBe(false)
    })

    it('isReactive should correctly identify reactive objects', () => {
      const count = ref(0)
      const obj = reactive({ count: 0 })
      const plain = 42
      const plainObj = { count: 0 }

      expect(isReactive(count)).toBe(false)
      expect(isReactive(obj)).toBe(true)
      expect(isReactive(plain)).toBe(false)
      expect(isReactive(plainObj)).toBe(false)
    })

    it('unref should return value from ref or plain value', () => {
      const count = ref(42)
      const plain = 100

      expect(unref(count)).toBe(42)
      expect(unref(plain)).toBe(100)
    })
  })
})
