// examples/effect-scope-demo.ts
import { ref, effect, createEffectScope } from '../src'

console.log('=== EffectScope Demo ===')

// Создаем область видимости
const scope = createEffectScope()

const count = ref(0)
const name = ref('Alice')

// Запускаем эффекты в области видимости
scope.run(() => {
  effect(() => {
    console.log(`Scope effect: count = ${count.value}`)
  })
})

scope.run(() => {
  effect(() => {
    console.log(`Scope effect: name = ${name.value}`)
  })
})

// Эффект вне области видимости
effect(() => {
  console.log(`Global effect: ${name.value} has ${count.value} points`)
})

console.log('--- Changing values ---')
count.value = 1
name.value = 'Bob'

console.log('--- Stopping scope ---')
scope.stop()

console.log('--- Changes after scope stopped ---')
count.value = 2  // Только глобальный эффект сработает
name.value = 'Charlie'

console.log()

// Пример с кастомным scheduler
console.log('=== Scheduler Demo ===')

const scheduledCount = ref(0)
let timeoutId: NodeJS.Timeout | null = null

effect(
  () => {
    console.log(`Scheduled effect executed: count = ${scheduledCount.value}`)
  },
  {
    scheduler: (job) => {
      console.log('Scheduling effect...')

      // Отменяем предыдущий таймаут
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Создаем новый таймаут
      timeoutId = setTimeout(() => {
        console.log('Executing scheduled job...')
        job()
        timeoutId = null
      }, 100)
    }
  }
)

console.log('--- Changing scheduled value ---')
scheduledCount.value = 1
scheduledCount.value = 2
scheduledCount.value = 3

console.log('--- Waiting for scheduled execution ---')
setTimeout(() => {
  console.log('=== Demo completed ===')
}, 500)
