/**
 * Продвинутые примеры использования реактивной системы.
 * Демонстрируют сложные сценарии, оптимизацию и best practices
 */

import {
  ref,
  reactive,
  computed,
  effect,
  watch,
  batch,
  getEffectStats,
  enableDebug,
  setConfig,
  // watchReactive,
  type Ref,
} from '../src'

console.log('='.repeat(60))
console.log('ПРОДВИНУТЫЕ ПРИМЕРЫ РЕАКТИВНОЙ СИСТЕМЫ')
console.log('='.repeat(60))

// ============================================================================
// ПРИМЕР 1: Управление жизненным циклом компонента
// ============================================================================
console.log('\n[Пример 1] Управление жизненным циклом')
console.log('-'.repeat(60))

class Component {
  private data = reactive({ value: 0 })
  private stopWatch: (() => void) | null = null
  private stopEffect: (() => void) | null = null

  constructor() {
    console.log('  Component: монтирование')
  }

  mount() {
    console.log('  Component: mounted')

    // Создать эффект при монтировании
    this.stopEffect = effect(() => {
      console.log(`    mounted effect: value = ${this.data.value}`)
    })

    // Создать watch
    this.stopWatch = watch(
      () => this.data.value,
      (newVal: any) => {
        console.log(`    mounted watch: value изменилось на ${newVal}`)
      }
    )
  }

  unmount() {
    console.log('  Component: unmounted')
    // Очистить подписки при размонтировании
    this.stopEffect?.()
    this.stopWatch?.()
  }

  updateValue(newValue: number) {
    this.data.value = newValue
  }
}

const component = new Component()
component.mount()
component.updateValue(5)
component.updateValue(10)
component.unmount()
console.log('  После unmount:')
component.updateValue(15) // Не должно выводить

// ============================================================================
// ПРИМЕР 2: Сложная система с зависимостями
// ============================================================================
console.log('\n[Пример 2] Система с множественными зависимостями')
console.log('-'.repeat(60))

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

const cart = reactive<{ items: CartItem[] }>({
  items: [
    { id: 1, name: 'Книга', price: 20, quantity: 2 },
    { id: 2, name: 'Ручка', price: 1, quantity: 5 },
  ],
})

const discount: Ref<number> = ref(0.1) // 10% скидка

const subtotal = computed(() => {
  console.log('  [Computed] Пересчет subtotal')
  return cart.items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
})

const tax = computed(() => {
  console.log('  [Computed] Пересчет tax')
  return subtotal.value * 0.1
})

const total = computed(() => {
  console.log('  [Computed] Пересчет total')
  const discountAmount = subtotal.value * discount.value
  return subtotal.value - discountAmount + tax.value
})

effect(() => {
  console.log(`  Total: $${total.value.toFixed(2)}`)
})

console.log('  Изменение количества товара:')
cart.items[0].quantity = 3

console.log('  Изменение скидки:')
discount.value = 0.2

// ============================================================================
// ПРИМЕР 3: Кэширование с watch
// ============================================================================
console.log('\n[Пример 3] Кэширование результатов')
console.log('-'.repeat(60))

const apiUrl: Ref<string> = ref('https://api.example.com')
const query: Ref<string> = ref('initial')

const cachedResults = new Map<string, any>()

watch([apiUrl, query], ([url, q]: [string, string]) => {
  const cacheKey = `${url}:${q}`

  if (cachedResults.has(cacheKey)) {
    console.log(`  Cache HIT: ${cacheKey}`)
    return
  }

  console.log(`  Cache MISS: ${cacheKey}, запрос к API`)
  // Имитация API запроса
  cachedResults.set(cacheKey, { url, q, timestamp: Date.now() })
})

query.value = 'search1'
query.value = 'search2'
query.value = 'search1' // Cache hit
apiUrl.value = 'https://new-api.example.com'
query.value = 'search1' // Cache miss (новый URL)

// ============================================================================
// ПРИМЕР 4: Асинхронные операции с cleanup
// ============================================================================
console.log('\n[Пример 4] Асинхронные операции с cleanup')
console.log('-'.repeat(60))

interface User {
  id: number
  name: string
}

const userId = ref(1)
let currentRequest: Promise<User> | null = null

watch(
  userId,
  async (newId: any, _oldId: any, cleanup: Function) => {
    console.log(`  Загружаем пользователя ${newId}`)

    // Функция для отмены предыдущего запроса
    const abortController = new AbortController()

    cleanup(() => {
      console.log(`  Cleanup: отмена запроса для пользователя ${newId}`)
      abortController.abort()
    })

    try {
      // Имитация асинхронного запроса
      currentRequest = new Promise<User>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ id: newId, name: `User ${newId}` })
        }, 100)

        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout)
        })
      })

      const user = await currentRequest
      console.log(`  Пользователь загружен: ${user.name}`)
    } catch (error) {
      console.log(`  Ошибка загрузки: ${(error as Error).message}`)
    }
  }
)

userId.value = 2
setTimeout(() => {
  userId.value = 3 // Очистит предыдущий запрос
}, 50)

// ============================================================================
// ПРИМЕР 5: Валидация формы с зависимостями
// ============================================================================
console.log('\n[Пример 5] Комплексная валидация формы')
console.log('-'.repeat(60))

interface FormData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

const form = reactive<FormData>({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive<Partial<Record<keyof FormData, string>>>({})

const validators: Record<keyof FormData, (value: string) => string | null> = {
  username: (value) => {
    if (value.length < 3) return 'Минимум 3 символа'
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Только буквы, цифры и подчеркивания'
    return null
  },
  email: (value) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Некорректный email'
    return null
  },
  password: (value) => {
    if (value.length < 8) return 'Минимум 8 символов'
    if (!/[A-Z]/.test(value)) return 'Должна содержать заглавную букву'
    if (!/[0-9]/.test(value)) return 'Должна содержать цифру'
    return null
  },
  confirmPassword: (value) => {
    if (value !== form.password) return 'Пароли не совпадают'
    return null
  },
}

// Валидировать каждое поле при изменении
Object.keys(validators).forEach((field) => {
  watch(
    () => form[field as keyof FormData],
    (newValue: string) => {
      const validator = validators[field as keyof FormData]
      const error = validator(newValue)

      if (error) {
        errors[field as keyof FormData] = error
      } else {
        delete errors[field as keyof FormData]
      }
    },
    { immediate: true } // ИСПРАВЛЕНИЕ: Добавляем immediate: true для валидации при первоначальной установке значений
  )
})

const isFormValid = computed(() => Object.keys(errors).length === 0)

effect(() => {
  console.log(`  Форма ${isFormValid.value ? '✓ валидна' : '✗ невалидна'}`)
  console.log(`  Ошибки:`, Object.keys(errors).length > 0 ? errors : 'нет')
})

// Обновить форму
console.log('  Установка валидных значений формы:')
form.username = 'user'
form.email = 'user@example.com'
form.password = 'SecurePass123'
form.confirmPassword = 'SecurePass123'

// ============================================================================
// ПРИМЕР 6: Оптимизация с batch
// ============================================================================
console.log('\n[Пример 6] Оптимизация с batch')
console.log('-'.repeat(60))

const data = reactive({ a: 1, b: 2, c: 3 })

let updateCount = 0

effect(() => {
  updateCount++
  console.log(
    `  Effect выполнен ${updateCount} раз: a=${data.a}, b=${data.b}, c=${data.c}`
  )
})

console.log('  Без batch (3 обновления):')
updateCount = 0
data.a = 10
data.b = 20
data.c = 30

console.log('  С batch (1 обновление):')
updateCount = 0
batch(() => {
  data.a = 100
  data.b = 200
  data.c = 300
})

// ============================================================================
// ПРИМЕР 7: Дебаунсированное наблюдение
// ============================================================================
console.log('\n[Пример 7] Дебаунсированное наблюдение')
console.log('-'.repeat(60))

const searchQuery = ref('')

let debounceTimer: NodeJS.Timeout | null = null

watch(
  searchQuery,
  (newQuery: any, _oldQuery: any, cleanup: Function) => {
    if (debounceTimer) clearTimeout(debounceTimer)

    cleanup(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
    })

    debounceTimer = setTimeout(() => {
      console.log(`  Поиск: "${newQuery}"`)
    }, 300)
  }
)

searchQuery.value = 'v'
searchQuery.value = 'vu'
searchQuery.value = 'vue'
searchQuery.value = 'vue 3'

// ============================================================================
// ПРИМЕР 8: Мониторинг производительности
// ============================================================================
console.log('\n[Пример 8] Мониторинг производительности')
console.log('-'.repeat(60))

setConfig({ enableDebug: true })
enableDebug(false)

const counter1 = ref(0)
const counter2 = ref(0)
const counter3 = ref(0)

effect(() => {
  const c1 = counter1.value * 2
  console.log({ c1 })
})

effect(() => {
  const c2 = counter2.value * 3
  console.log({ c2 })
})

effect(() => {
  const c3 = counter3.value * 4
  console.log({ c3 })
})

const stats = getEffectStats()
console.log(`  Активные эффекты: ${stats.activeEffects}`)
console.log(`  Очереди обновлений: ${stats.queuedUpdates}`)

// ============================================================================
// ПРИМЕР 9: Паттерн с множественными источниками
// ============================================================================
console.log('\n[Пример 9] Наблюдение за массивом источников')
console.log('-'.repeat(60))

const firstName = ref('John')
const lastName = ref('Doe')
const age = ref(30)

watch([firstName, lastName, age], ([first, last, currentAge]: [string, string, number]) => {
  console.log(`  Данные изменились: ${first} ${last}, ${currentAge} лет`)
})

firstName.value = 'Jane'
age.value = 28

// ============================================================================
// ПРИМЕР 10: Реактивность массивов
// ============================================================================
console.log('\n[Пример 10] Реактивность массивов')
console.log('-'.repeat(60))

const list = reactive<number[]>([1, 2, 3])

const length = computed(() => {
  console.log('  [Computed] Пересчет длины')
  return list.length
})

const sum = computed(() => {
  console.log('  [Computed] Пересчет суммы')
  return list.reduce((a: number, b: number) => a + b, 0)
})

effect(() => {
  console.log(`  Список: [${list.join(', ')}], длина: ${length.value}, сумма: ${sum.value}`)
})

list.push(4)
list[0] = 10
list.pop()

console.log('\n' + '='.repeat(60))
console.log('Продвинутые примеры завершены!')
console.log('='.repeat(60))
