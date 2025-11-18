// noinspection JSUnusedLocalSymbols

import { ref, effect, createEffectScope, clearReactivityState } from '../src'

describe('Effect System', () => {
  beforeEach(clearReactivityState)

  it('should run effect immediately upon creation', () => {
    let runCount = 0
    const stop = effect(() => {
      runCount++
    })

    expect(runCount).toBe(1)
    stop()
  })

  it('should stop effect from running on dependency changes', () => {
    const count = ref(0)
    let runCount = 0

    const stop = effect(() => {
      runCount++
      const value = count.value
    })

    count.value = 1
    stop()
    count.value = 2

    expect(runCount).toBe(2)
  })

  it('should execute cleanup function when effect is stopped', () => {
    let cleanupCallCount = 0
    let effectCallCount = 0

    const stop = effect(() => {
      effectCallCount++
      return () => {
        cleanupCallCount++
      }
    })

    stop()

    expect(effectCallCount).toBe(1)
    expect(cleanupCallCount).toBe(1)
  })

  it('should execute cleanup function before each re-run', () => {
    const count = ref(0)
    let cleanupCallCount = 0
    let effectCallCount = 0

    const stop = effect(() => {
      effectCallCount++
      const value = count.value
      return () => {
        cleanupCallCount++
      }
    })

    count.value = 1
    count.value = 2

    expect(effectCallCount).toBe(3)
    expect(cleanupCallCount).toBe(2)
    stop()
  })

  describe('EffectScope', () => {
    it('should create effect scope and stop all effects within it', () => {
      const scope = createEffectScope()
      const count = ref(0)
      let effectCallCount = 0

      scope.run(() => {
        effect(() => {
          effectCallCount++
          const value = count.value
        })
      })

      count.value = 1

      expect(effectCallCount).toBe(2)

      scope.stop()
      count.value = 2

      expect(effectCallCount).toBe(2)
    })

    it('should handle multiple effects within single scope', () => {
      const scope = createEffectScope()
      const count = ref(0)
      const name = ref('A')

      let countEffectCallCount = 0
      let nameEffectCallCount = 0

      scope.run(() => {
        effect(() => {
          countEffectCallCount++
          const value = count.value
        })

        effect(() => {
          nameEffectCallCount++
          const value = name.value
        })
      })

      count.value = 1
      name.value = 'B'

      expect(countEffectCallCount).toBe(2)
      expect(nameEffectCallCount).toBe(2)

      scope.stop()
    })

    it('should handle nested scopes independently', () => {
      const parentScope = createEffectScope()
      const childScope = createEffectScope()
      const count = ref(0)

      let parentEffectCallCount = 0
      let childEffectCallCount = 0

      parentScope.run(() => {
        effect(() => {
          parentEffectCallCount++
          const value = count.value
        })
      })

      childScope.run(() => {
        effect(() => {
          childEffectCallCount++
          const value = count.value
        })
      })

      count.value = 1
      expect(parentEffectCallCount).toBe(2)
      expect(childEffectCallCount).toBe(2)

      childScope.stop()
      count.value = 2
      expect(parentEffectCallCount).toBe(3)
      expect(childEffectCallCount).toBe(2)

      parentScope.stop()
    })
  })

  describe('Scheduler', () => {
    it('should use custom scheduler for effect execution', () => {
      const count = ref(0)
      let effectCallCount = 0
      let schedulerCallCount = 0

      const stop = effect(
        () => {
          effectCallCount++
          const value = count.value
        },
        {
          scheduler: (job) => {
            schedulerCallCount++
            job()
          }
        }
      )

      count.value = 1
      count.value = 2

      expect(effectCallCount).toBe(3)
      expect(schedulerCallCount).toBe(2)
      stop()
    })

    it('should allow deferred execution with scheduler', (done) => {
      const count = ref(0)
      let effectCallCount = 0

      const stop = effect(
        () => {
          effectCallCount++
          const value = count.value
        },
        {
          scheduler: (job) => {
            setTimeout(job, 10)
          }
        }
      )

      count.value = 1
      expect(effectCallCount).toBe(1)

      setTimeout(() => {
        expect(effectCallCount).toBe(2)
        stop()
        done()
      }, 20)
    })
  })
})
