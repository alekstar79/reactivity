import { ref, reactive, watch, batch, clearReactivityState } from '../src'

describe('Watch', () => {
  beforeEach(clearReactivityState)

  it('should watch ref changes and call callback with new and old values', () => {
    const count = ref(0)
    let watchCallCount = 0
    let lastNewValue: number | undefined
    let lastOldValue: number | undefined

    const stop = watch(count, (newVal, oldVal) => {
      watchCallCount++
      lastNewValue = newVal
      lastOldValue = oldVal
    })

    count.value = 1
    count.value = 2

    expect(watchCallCount).toBe(2)
    expect(lastNewValue).toBe(2)
    expect(lastOldValue).toBe(1)

    stop()
  })

  it('should call callback immediately when immediate option is true', () => {
    const count = ref(0)
    let watchCallCount = 0

    const stop = watch(
      count,
      () => { watchCallCount++ },
      { immediate: true }
    )

    expect(watchCallCount).toBe(1)
    count.value = 1
    expect(watchCallCount).toBe(2)

    stop()
  })

  it('should watch reactive objects deeply when deep option is true', () => {
    const obj = reactive({ user: { name: 'Alice', age: 30 } })
    let watchCallCount = 0

    const stop = watch(
      obj,
      () => {
        watchCallCount++
      },
      { deep: true }
    )

    obj.user.name = 'Bob'
    obj.user.age = 31

    expect(watchCallCount).toBe(2)
    stop()
  })

  it('should watch getter function results', () => {
    const count = ref(0)
    const double = ref(0)
    let watchCallCount = 0

    const stop = watch(
      () => count.value * 2,
      (newVal) => {
        watchCallCount++
        double.value = newVal
      }
    )

    count.value = 1
    count.value = 2

    expect(watchCallCount).toBe(2)
    expect(double.value).toBe(4)

    stop()
  })

  it('should watch multiple sources as array', () => {
    const a = ref(0)
    const b = ref(0)
    let watchCallCount = 0
    let lastValues: [number, number] = [0, 0]
    let lastOldValues: [number, number] = [0, 0]

    const stop = watch(
      [a, b],
      ([newA, newB], [oldA, oldB]) => {
        watchCallCount++
        lastValues = [newA, newB]
        lastOldValues = [oldA, oldB]
      }
    )

    a.value = 1  // new: [1,0], old: [0,0]
    b.value = 1  // new: [1,1], old: [1,0]

    expect(watchCallCount).toBe(2)
    expect(lastValues).toEqual([1, 1])
    // ИСПРАВЛЕНИЕ: Ожидаем [1,0] - последние старые значения перед вторым вызовом
    expect(lastOldValues).toEqual([1, 0])

    stop()
  })

  it('should batch multiple changes when using batch', () => {
    const a = ref(0)
    const b = ref(0)
    let watchCallCount = 0

    const stop = watch(
      [a, b],
      () => {
        watchCallCount++
      }
    )

    batch(() => {
      a.value = 1
      b.value = 1
    })

    expect(watchCallCount).toBe(1)
    stop()
  })

  it('should execute cleanup function before each callback execution', () => {
    const count = ref(0)
    let cleanupCallCount = 0
    let watchCallCount = 0

    const stop = watch(count, (newVal, oldVal, cleanup) => {
      watchCallCount++
      cleanup(() => {
        cleanupCallCount++
      })
    })

    count.value = 1
    count.value = 2

    expect(watchCallCount).toBe(2)
    expect(cleanupCallCount).toBe(1)

    stop()
  })

  it('should handle cleanup on watch stop', () => {
    const count = ref(0)
    let cleanupCallCount = 0

    const stop = watch(count, (newVal, oldVal, cleanup) => {
      cleanup(() => { cleanupCallCount++ })
    })

    count.value = 1
    stop()
    count.value = 2

    expect(cleanupCallCount).toBe(1)
  })
})
