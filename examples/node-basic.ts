/**
 * Базовые примеры использования реактивной системы
 */

import {
  ref,
  reactive,
  computed,
  effect,
  watch,
  batch,
  isRef,
  unref,
  // enableDebug,
} from '../src'

console.log('='.repeat(60))
console.log('БАЗОВЫЕ ПРИМЕРЫ РЕАКТИВНОЙ СИСТЕМЫ')
console.log('='.repeat(60))

// ============================================================================
// ПРИМЕР 1: Базовое использование ref
// ============================================================================
console.log('\n[Пример 1] Базовое использование ref')
console.log('-'.repeat(60))

const count = ref(0)
const name = ref('Vue')

console.log(`Начальные значения: count=${count.value}, name=${name.value}`)

// Подписать на изменения
effect(() => {
  console.log(`  Effect: count изменился на ${count.value}`)
})

// Изменить значения
count.value = 1
count.value = 2

// ============================================================================
// ПРИМЕР 2: Использование reactive
// ============================================================================
console.log('\n[Пример 2] Использование reactive')
console.log('-'.repeat(60))

const state = reactive({
  user: {
    name: 'Alice',
    age: 30,
  },
  todos: [
    { id: 1, text: 'Учить Vue', done: false },
    { id: 2, text: 'Создать проект', done: false },
  ],
})

effect(() => {
  console.log(`  Effect: Пользователь ${state.user.name}, возраст ${state.user.age}`)
})

// Изменить вложенное значение
state.user.name = 'Bob'
state.user.age = 31

// ============================================================================
// ПРИМЕР 3: Использование computed
// ============================================================================
console.log('\n[Пример 3] Использование computed')
console.log('-'.repeat(60))

const a = ref(2)
const b = ref(3)
const sum = computed(() => {
  console.log('  [Computed] Пересчет суммы')
  return a.value + b.value
})

effect(() => {
  console.log(`  Effect: a + b = ${sum.value}`)
})

a.value = 5
b.value = 7

// ============================================================================
// ПРИМЕР 4: Использование watch с ref
// ============================================================================
console.log('\n[Пример 4] Использование watch с ref')
console.log('-'.repeat(60))

const counter = ref(0)

// Наблюдать за изменениями
const stopWatch = watch(counter, (newVal: any, oldVal: any) => {
  console.log(`  Watch: counter изменился с ${oldVal} на ${newVal}`)
})

counter.value = 1
counter.value = 2
counter.value = 3

stopWatch() // Остановить наблюдение
console.log('  Наблюдение остановлено')
counter.value = 4 // Никакого вывода

// ============================================================================
// ПРИМЕР 5: Watch с immediate опцией
// ============================================================================
console.log('\n[Пример 5] Watch с immediate опцией')
console.log('-'.repeat(60))

const message = ref('Hello')

watch(
  message,
  (newVal: any, _oldVal: any) => {
    console.log(`  Watch: сообщение изменилось на "${newVal}"`)
  },
  { immediate: true }
)

message.value = 'World'

// ============================================================================
// ПРИМЕР 6: Watch с deep опцией для объектов
// ============================================================================
console.log('\n[Пример 6] Watch с deep опцией')
console.log('-'.repeat(60))

interface Address {
  city: string
  zip: string
}

interface User {
  name: string
  address: Address
}

const user = reactive<User>({
  name: 'John',
  address: {
    city: 'New York',
    zip: '10001',
  },
})

watch(
  user,
  (_newVal: any, _oldVal: any) => {
    console.log(`  Watch (Deep): объект изменился`)
  },
  { deep: true }
)

user.address.city = 'Los Angeles'
user.name = 'Jane'

// ============================================================================
// ПРИМЕР 7: Watch с cleanup функцией
// ============================================================================
console.log('\n[Пример 7] Watch с cleanup функцией')
console.log('-'.repeat(60))

const search = ref('initial')

let timeoutId: NodeJS.Timeout | null = null

watch(
  search,
  (newVal: any, _oldVal: any, cleanup: Function) => {
    console.log(`  Watch: поиск по "${newVal}"`)

    // Очистить предыдущий таймаут
    cleanup(() => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        console.log('  Cleanup: таймаут очищен')
      }
    })

    // Создать новый таймаут
    timeoutId = setTimeout(() => {
      console.log(`  Асинхронный результат для "${newVal}"`)
    }, 100)
  }
)

search.value = 'first'
search.value = 'second'
search.value = 'third'

// ============================================================================
// ПРИМЕР 8: Watch с функцией-геттером
// ============================================================================
console.log('\n[Пример 8] Watch с функцией-геттером')
console.log('-'.repeat(60))

const firstName = ref('John')
const lastName = ref('Doe')

watch(
  () => `${firstName.value} ${lastName.value}`,
  (fullName: any, oldFullName: any) => {
    console.log(`  Watch: Полное имя изменилось с "${oldFullName}" на "${fullName}"`)
  }
)

firstName.value = 'Jane'
lastName.value = 'Smith'

// ============================================================================
// ПРИМЕР 9: Batch обновления
// ============================================================================
console.log('\n[Пример 9] Batch обновления')
console.log('-'.repeat(60))

const x = ref(0)
const y = ref(0)

effect(() => {
  console.log(`  Effect: x=${x.value}, y=${y.value}`)
})

console.log('  Без batch - два эффекта:')
x.value = 1
y.value = 2

console.log('  С batch - один эффект:')
batch(() => {
  x.value = 10
  y.value = 20
})

// ============================================================================
// ПРИМЕР 10: Утилиты
// ============================================================================
console.log('\n[Пример 10] Утилиты (isRef, unref)')
console.log('-'.repeat(60))

const refValue = ref(42)
const plainValue = 'plain string'

console.log(`  isRef(refValue): ${isRef(refValue)}`)
console.log(`  isRef(plainValue): ${isRef(plainValue)}`)

console.log(`  unref(refValue): ${unref(refValue)}`)
console.log(`  unref(plainValue): ${unref(plainValue)}`)

// ============================================================================
// ПРИМЕР 11: Комплексный сценарий - список задач
// ============================================================================
console.log('\n[Пример 11] Комплексный сценарий - список задач')
console.log('-'.repeat(60))

interface Todo {
  id: number
  text: string
  completed: boolean
}

const todos = reactive<Todo[]>([
  { id: 1, text: 'Купить молоко', completed: false },
  { id: 2, text: 'Написать код', completed: false },
  { id: 3, text: 'Прочитать книгу', completed: true },
])

const completedCount = computed(() => {
  return todos.filter((todo: Todo) => todo.completed).length
})

const totalCount = computed(() => todos.length)

effect(() => {
  console.log(`  Всего задач: ${totalCount.value}, выполнено: ${completedCount.value}`)
})

watch(completedCount, (newCount: number) => {
  console.log(`  Watch: Выполнено ${newCount} задач из ${totalCount.value}`)
})

// Добавить новую задачу
todos.push({ id: 4, text: 'Запустить проект', completed: false })

// Отметить как выполненную
todos[0].completed = true

// ============================================================================
// ПРИМЕР 12: Контролируемая переменная
// ============================================================================
console.log('\n[Пример 12] Контролируемая переменная (v-model паттерн)')
console.log('-'.repeat(60))

interface FormState {
  email: string
  password: string
}

const formState = reactive<FormState>({
  email: '',
  password: '',
})

const isFormValid = computed(() => {
  return formState.email.includes('@') && formState.password.length >= 8
})

effect(() => {
  console.log(`  Форма ${isFormValid.value ? 'валидна' : 'невалидна'}`)
})

watch(
  () => formState.email,
  (newEmail: string) => {
    console.log(`  Email изменен на: ${newEmail}`)
  }
)

// Обновить форму
formState.email = 'user@example.com'
formState.password = 'securepass123'

console.log('\n' + '='.repeat(60))
console.log('Примеры завершены!')
console.log('='.repeat(60))
