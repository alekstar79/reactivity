// noinspection JSUnusedLocalSymbols

import { ref, computed, effect, batch, clearReactivityState } from '../src'

describe('Computed', () => {
  beforeEach(clearReactivityState)

  it('should compute values reactively', () => {
    const count = ref(2)
    const double = computed(() => count.value * 2)

    expect(double.value).toBe(4)

    count.value = 3
    expect(double.value).toBe(6)
  })

  it('should cache computed values between accesses', () => {
    const count = ref(1)
    let computeCallCount = 0

    const double = computed(() => {
      computeCallCount++
      return count.value * 2
    })

    double.value
    double.value
    double.value

    expect(computeCallCount).toBe(1)

    count.value = 2
    double.value
    expect(computeCallCount).toBe(2)
  })

  it('should trigger effects when computed value changes', () => {
    const count = ref(1)
    const double = computed(() => count.value * 2)
    let effectCallCount = 0

    const stop = effect(() => {
      effectCallCount++
      const value = double.value
    })

    count.value = 2
    count.value = 3

    expect(effectCallCount).toBe(3)
    stop()
  })

  it('should handle nested computed values', () => {
    const a = ref(2)
    const b = ref(3)

    const sum = computed(() => a.value + b.value)
    const product = computed(() => a.value * b.value)
    const combined = computed(() => sum.value + product.value)

    expect(combined.value).toBe(11)

    a.value = 3
    expect(combined.value).toBe(15)
  })

  it('should support settable computed with getter and setter', () => {
    const source = ref('hello')
    const computedRef = computed({
      get: () => source.value.toUpperCase(),
      set: (value) => { source.value = value.toLowerCase() }
    })

    expect(computedRef.value).toBe('HELLO')

    computedRef.value = 'WORLD'
    expect(source.value).toBe('world')
    expect(computedRef.value).toBe('WORLD')
  })

  it('should trigger effects when computed value is set', () => {
    const source = ref(0)
    const computedValue = computed({
      get: () => source.value * 2,
      set: (value: number) => { source.value = value / 2 }
    })

    let effectCount = 0
    const stop = effect(() => {
      effectCount++
      const value = computedValue.value
    })

    // Initial effect run
    expect(effectCount).toBe(1)
    expect(computedValue.value).toBe(0)

    computedValue.value = 10
    expect(source.value).toBe(5)
    expect(computedValue.value).toBe(10)

    // Может быть 2 или 3 запуска в зависимости от оптимизаций
    // Главное что эффект сработал после изменения
    expect(effectCount).toBeGreaterThan(1)
    expect(effectCount).toBeLessThan(4)

    stop()
  })

  it('should not allow setting computed value without setter', () => {
    const computedValue = computed(() => 'readonly')

    // Попытка установить значение без setter не должна изменить ничего
    const originalValue = computedValue.value
    computedValue.value = 'new value' as any

    expect(computedValue.value).toBe('readonly')
  })

  it('should work with complex objects in setter', () => {
    const user = ref({ firstName: 'John', lastName: 'Doe' })
    const fullName = computed({
      get: () => `${user.value.firstName} ${user.value.lastName}`,
      set: (name: string) => {
        const [firstName, ...lastNameParts] = name.split(' ')
        user.value.firstName = firstName || ''
        user.value.lastName = lastNameParts.join(' ') || ''
      }
    })

    expect(fullName.value).toBe('John Doe')

    fullName.value = 'Jane Ann Smith'
    expect(user.value.firstName).toBe('Jane')
    expect(user.value.lastName).toBe('Ann Smith')
    expect(fullName.value).toBe('Jane Ann Smith')
  })

  it('should work with batch updates', () => {
    const source = ref(1)
    const computedValue = computed({
      get: () => source.value * 2,
      set: (value: number) => { source.value = value / 2 }
    })

    let effectCount = 0
    const stop = effect(() => {
      effectCount++
      const value = computedValue.value
    })

    // Initial effect run
    expect(effectCount).toBe(1)

    batch(() => {
      computedValue.value = 10
      computedValue.value = 20
    })

    expect(source.value).toBe(10)         // 20 / 2
    expect(computedValue.value).toBe(20)

    // В batch должен быть один дополнительный запуск
    expect(effectCount).toBe(2)

    stop()
  })

  it('should maintain reactivity chain with setters', () => {
    const a = ref(1)
    const b = ref(2)

    const sum = computed({
      get: () => a.value + b.value,
      set: (value: number) => {
        // Распределяем значение поровну между a и b
        a.value = value / 2
        b.value = value / 2
      }
    })

    const doubleSum = computed(() => sum.value * 2)

    let sumEffectCount = 0
    let doubleSumEffectCount = 0

    const stop1 = effect(() => {
      sumEffectCount++
      const value = sum.value
    })

    const stop2 = effect(() => {
      doubleSumEffectCount++
      const value = doubleSum.value
    })

    // Initial effects run
    expect(sumEffectCount).toBe(1)
    expect(doubleSumEffectCount).toBe(1)

    sum.value = 10

    expect(a.value).toBe(5)
    expect(b.value).toBe(5)
    expect(sum.value).toBe(10)
    expect(doubleSum.value).toBe(20)

    // Эффекты должны сработать после изменения
    expect(sumEffectCount).toBeGreaterThan(1)
    expect(doubleSumEffectCount).toBeGreaterThan(1)

    stop1()
    stop2()
  })

  it('should update computed value immediately after setter', () => {
    const source = ref(1)
    const computedValue = computed({
      get: () => source.value * 2,
      set: (value: number) => { source.value = value / 2 }
    })

    expect(computedValue.value).toBe(2)

    computedValue.value = 8
    // После установки computed должен сразу возвращать новое значение
    expect(computedValue.value).toBe(8)
    expect(source.value).toBe(4)
  })

  it('should trigger source effects when computed value is set', () => {
    const source = ref(1)
    let sourceEffectCount = 0

    const sourceEffectStop = effect(() => {
      sourceEffectCount++
      const value = source.value
    })

    const computedValue = computed({
      get: () => source.value * 2,
      set: (value: number) => { source.value = value / 2 }
    })

    let computedEffectCount = 0
    const computedEffectStop = effect(() => {
      computedEffectCount++
      const value = computedValue.value
    })

    // Initial effects
    expect(sourceEffectCount).toBe(1)
    expect(computedEffectCount).toBe(1)

    computedValue.value = 10

    // Оба эффекта должны сработать
    expect(sourceEffectCount).toBeGreaterThan(1)
    expect(computedEffectCount).toBeGreaterThan(1)

    sourceEffectStop()
    computedEffectStop()
  })

  it('should handle complex computed dependencies', () => {
    const a = ref(1)
    const b = ref(2)
    const c = ref(3)

    const complex = computed(() => {
      return a.value * 2 + b.value * 3 + c.value * 4
    })

    expect(complex.value).toBe(1*2 + 2*3 + 3*4)
    a.value = 2
    expect(complex.value).toBe(2*2 + 2*3 + 3*4)
  })
})
