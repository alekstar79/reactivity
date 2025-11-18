/**
 * Modern Reactivity System
 */

import { ref, reactive, computed, effect, watch, batch, createEffectScope } from '../src'

// Global state for the demo
const demoState = reactive({
  activeSection: 'ref',
  effectRunCount: 0
})

// Utility function for formatted logging
function addLog(logElementId: string, message: string, type: 'info' | 'effect' | 'computed' | 'watch' | 'batch' | 'error' = 'info') {
  const logElement = document.getElementById(logElementId)
  if (!logElement) return

  const timestamp = new Date().toLocaleTimeString()
  const typeIcon = {
    info: '📝',
    effect: '⚡',
    computed: '🧮',
    watch: '👀',
    batch: '📦',
    error: '❌'
  }[type]

  const logEntry = document.createElement('div')
  logEntry.className = `log-entry log-${type}`
  logEntry.innerHTML = `
    <span class="log-time">[${timestamp}]</span>
    <span class="log-icon">${typeIcon}</span>
    <span class="log-message">${message}</span>
  `

  logElement.appendChild(logEntry)
  logElement.scrollTop = logElement.scrollHeight

  // Keep only last 50 log entries
  const entries = logElement.querySelectorAll('.log-entry')
  if (entries.length > 50) {
    entries[0].remove()
  }
}

// Navigation
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link')
  const sections = document.querySelectorAll('.section')

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const sectionId = link.getAttribute('data-section')

      // Update active states
      navLinks.forEach(l => l.classList.remove('active'))
      sections.forEach(s => s.classList.remove('active'))

      link.classList.add('active')
      document.getElementById(sectionId!)!.classList.add('active')
      demoState.activeSection = sectionId!

      addLog('globalLog', `Switched to ${sectionId} section`, 'info')
    })
  })
}

// Section 1: Ref & Effect
function setupRefDemo() {
  const count = ref(0)
  const effectRuns = ref(0)
  const currentValue = ref(0)

  addLog('counterLog', '🔧 Ref & Effect demo initialized', 'info')
  addLog('effectLog', '🔧 Effect tracking started', 'info')

  // Counter display effect
  effect(() => {
    document.getElementById('counterValue')!.textContent = count.value.toString()
    document.getElementById('counterValue')!.classList.add('pulse')
    setTimeout(() => document.getElementById('counterValue')!.classList.remove('pulse'), 500)

    addLog('counterLog', `Effect: Counter display updated to ${count.value}`, 'effect')
  })

  // Effect tracking
  effect(() => {
    effectRuns.value++
    currentValue.value = count.value

    document.getElementById('effectRuns')!.textContent = effectRuns.value.toString()
    document.getElementById('currentValue')!.textContent = currentValue.value.toString()

    addLog('effectLog', `Effect run #${effectRuns.value}: count = ${count.value}`, 'effect')
  })

  // Slider with watch
  const slider = document.getElementById('slider') as HTMLInputElement
  watch(() => count.value, (newVal, oldVal) => {
    slider.value = newVal.toString()
    addLog('effectLog', `Watch: Count changed from ${oldVal} to ${newVal}, updating slider`, 'watch')
  })

  slider.addEventListener('input', (e) => {
    const newValue = parseInt((e.target as HTMLInputElement).value)
    addLog('effectLog', `Slider input: changing count from ${count.value} to ${newValue}`, 'info')
    count.value = newValue
  })

  // Buttons with detailed logging
  document.getElementById('increment')!.addEventListener('click', () => {
    const oldValue = count.value
    count.value++
    addLog('counterLog', `Button: Incremented count from ${oldValue} to ${count.value}`, 'info')
  })

  document.getElementById('decrement')!.addEventListener('click', () => {
    const oldValue = count.value
    count.value--
    addLog('counterLog', `Button: Decremented count from ${oldValue} to ${count.value}`, 'info')
  })

  document.getElementById('resetCounter')!.addEventListener('click', () => {
    const oldValue = count.value
    count.value = 0
    addLog('counterLog', `Button: Reset count from ${oldValue} to 0`, 'info')
  })

  // Log ref creation
  addLog('counterLog', `Created ref with initial value: ${count.value}`, 'info')
  addLog('effectLog', `Active effects: Counter display, Value tracking`, 'info')
}

// Section 2: Reactive Objects
function setupReactiveDemo() {
  // Initialize from current input values to handle browser autofill
  const userNameInput = document.getElementById('userName') as HTMLInputElement
  const userAgeInput = document.getElementById('userAge') as HTMLInputElement
  const userEmailInput = document.getElementById('userEmail') as HTMLInputElement

  const user = reactive({
    name: userNameInput.value || 'John Doe',
    age: parseInt(userAgeInput.value) || 25,
    email: userEmailInput.value || 'john@example.com'
  })

  const todos = reactive<{ id: number; text: string; completed: boolean }[]>([])
  let nextTodoId = 1

  addLog('userLog', '🔧 Reactive Objects demo initialized', 'info')
  addLog('userLog', `Initialized from current form values: ${user.name}, ${user.age}, ${user.email}`, 'info')

  // User profile effects
  effect(() => {
    document.getElementById('userDisplayName')!.textContent = user.name
    document.getElementById('userDisplayAge')!.textContent = `Age: ${user.age}`
    document.getElementById('userDisplayEmail')!.textContent = user.email
    document.getElementById('userInitial')!.textContent = user.name.charAt(0).toUpperCase()

    addLog('userLog', `Effect: User display updated - ${user.name}, ${user.age}, ${user.email}`, 'effect')
  })

  // Watch user changes
  watch(() => user, (newUser, oldUser) => {
    addLog('userLog', `Watch: User object changed`, 'watch')
    addLog('userLog', `  Old: ${oldUser.name}, ${oldUser.age}, ${oldUser.email}`, 'watch')
    addLog('userLog', `  New: ${newUser.name}, ${newUser.age}, ${newUser.email}`, 'watch')
  }, { deep: true })

  // Helper function to update user field
  const updateUserField = (field: keyof typeof user, value: any, inputName: string) => {
    const oldValue = user[field]
    user[field as string] = value
    addLog('userLog', `Input: ${inputName} changed from "${oldValue}" to "${value}"`, 'info')
  }

  // User inputs with logging - handle both input and change events
  userNameInput.addEventListener('input', (e) => {
    updateUserField('name', (e.target as HTMLInputElement).value, 'Name')
  })

  userNameInput.addEventListener('change', (e) => {
    updateUserField('name', (e.target as HTMLInputElement).value, 'Name (change)')
  })

  userAgeInput.addEventListener('input', (e) => {
    updateUserField('age', parseInt((e.target as HTMLInputElement).value) || 0, 'Age')
  })

  userAgeInput.addEventListener('change', (e) => {
    updateUserField('age', parseInt((e.target as HTMLInputElement).value) || 0, 'Age (change)')
  })

  userEmailInput.addEventListener('input', (e) => {
    updateUserField('email', (e.target as HTMLInputElement).value, 'Email')
  })

  userEmailInput.addEventListener('change', (e) => {
    updateUserField('email', (e.target as HTMLInputElement).value, 'Email (change)')
  })

  // Todo list functionality
  const todoTotal = computed(() => {
    const total = todos.length
    addLog('userLog', `Computed: Todo total recalculated: ${total}`, 'computed')
    return total
  })

  const todoCompleted = computed(() => {
    const completed = todos.filter(todo => todo.completed).length
    addLog('userLog', `Computed: Todo completed recalculated: ${completed}`, 'computed')
    return completed
  })

  effect(() => {
    document.getElementById('todoTotal')!.textContent = todoTotal.value.toString()
    document.getElementById('todoCompleted')!.textContent = todoCompleted.value.toString()
  })

  // Todo list effect with logging
  effect(() => {
    const todoList = document.getElementById('todoList')!
    todoList.innerHTML = ''

    addLog('userLog', `Effect: Rendering ${todos.length} todos`, 'effect')

    todos.forEach(todo => {
      const todoItem = document.createElement('div')
      todoItem.className = 'todo-item'
      todoItem.innerHTML = `
        <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
             data-id="${todo.id}"></div>
        <div class="todo-text ${todo.completed ? 'completed' : ''}">${todo.text}</div>
      `
      todoList.appendChild(todoItem)
    })

    // Add click handlers for checkboxes
    todoList.querySelectorAll('.todo-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', (e) => {
        const id = parseInt((e.target as HTMLElement).getAttribute('data-id')!)
        const todo = todos.find(t => t.id === id)
        if (todo) {
          const action = todo.completed ? 'unchecked' : 'checked'
          todo.completed = !todo.completed
          addLog('userLog', `Todo: ${action} "${todo.text}"`, 'info')
        }
      })
    })
  })

  document.getElementById('addTodo')!.addEventListener('click', () => {
    const input = document.getElementById('todoInput') as HTMLInputElement
    const text = input.value.trim()

    if (text) {
      todos.push({
        id: nextTodoId++,
        text,
        completed: false
      })
      addLog('userLog', `Todo: Added "${text}" (ID: ${nextTodoId - 1})`, 'info')
      input.value = ''
    }
  });

  (document.getElementById('todoInput') as HTMLInputElement).addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('addTodo')!.click()
    }
  })

  // Initial log
  addLog('userLog', `Created reactive user object: ${user.name}, ${user.age}, ${user.email}`, 'info')
}

// Section 3: Computed Values
function setupComputedDemo() {
  const cart = reactive({
    items: [] as { id: number; name: string; price: number }[],
    discount: 0
  })

  let itemId = 1

  addLog('cartLog', '🔧 Computed Values demo initialized', 'info')

  // Computed values with detailed logging
  const itemCount = computed(() => {
    const count = cart.items.length
    addLog('cartLog', `Computed: Item count recalculated: ${count}`, 'computed')
    return count
  })

  const subtotal = computed(() => {
    const total = cart.items.reduce((sum, item) => sum + item.price, 0)
    addLog('cartLog', `Computed: Subtotal recalculated: $${total.toFixed(2)}`, 'computed')
    return total
  })

  const total = computed(() => {
    const finalTotal = subtotal.value * (1 - cart.discount / 100)
    addLog('cartLog', `Computed: Total recalculated: $${finalTotal.toFixed(2)} (with ${cart.discount}% discount)`, 'computed')
    return finalTotal
  })

  // Display updates
  effect(() => {
    document.getElementById('cartCount')!.textContent = itemCount.value.toString()
    document.getElementById('cartSubtotal')!.textContent = `$${subtotal.value.toFixed(2)}`
    document.getElementById('cartDiscount')!.textContent = `${cart.discount}%`
    document.getElementById('cartTotal')!.textContent = `$${total.value.toFixed(2)}`

    addLog('cartLog', `Effect: Cart display updated - ${itemCount.value} items, $${subtotal.value.toFixed(2)} subtotal, $${total.value.toFixed(2)} total`, 'effect')
  })

  // Cart actions with logging
  document.getElementById('addItem')!.addEventListener('click', () => {
    const items = ['Laptop', 'Phone', 'Tablet', 'Headphones', 'Monitor']
    const randomItem = items[Math.floor(Math.random() * items.length)]
    const price = Math.random() * 500 + 50

    cart.items.push({
      id: itemId++,
      name: randomItem,
      price: price
    })

    addLog('cartLog', `Action: Added "${randomItem}" for $${price.toFixed(2)}`, 'info')
    addLog('cartLog', `  Cart now has ${cart.items.length} items`, 'info')
  })

  document.getElementById('removeItem')!.addEventListener('click', () => {
    if (cart.items.length > 0) {
      const removed = cart.items.pop()!
      addLog('cartLog', `Action: Removed "${removed.name}" ($${removed.price.toFixed(2)})`, 'info')
      addLog('cartLog', `  Cart now has ${cart.items.length} items`, 'info')
    } else {
      addLog('cartLog', `Action: Cannot remove - cart is empty`, 'error')
    }
  })

  document.getElementById('applyDiscount')!.addEventListener('click', () => {
    const oldDiscount = cart.discount
    cart.discount = cart.discount === 10 ? 0 : 10
    addLog('cartLog', `Action: Discount changed from ${oldDiscount}% to ${cart.discount}%`, 'info')
  })

  // Currency converter - initialize from current values
  const usdAmountInput = document.getElementById('usdAmount') as HTMLInputElement
  const exchangeRate = ref(0.85)
  const usdAmount = ref(parseFloat(usdAmountInput.value) || 100)

  const eurAmount = computed(() => {
    const result = usdAmount.value * exchangeRate.value
    addLog('cartLog', `Computed: Currency conversion: $${usdAmount.value} * ${exchangeRate.value} = €${result.toFixed(2)}`, 'computed')
    return result
  })

  effect(() => {
    usdAmountInput.value = usdAmount.value.toString();
    (document.getElementById('eurAmount') as HTMLInputElement).value = eurAmount.value.toFixed(2)
    document.getElementById('exchangeRate')!.textContent = exchangeRate.value.toFixed(2)
  })

  // Handle both input and change events for USD amount
  const updateUsdAmount = (e: Event) => {
    const oldValue = usdAmount.value
    usdAmount.value = parseFloat((e.target as HTMLInputElement).value) || 0
    addLog('cartLog', `Input: USD amount changed from ${oldValue} to ${usdAmount.value}`, 'info')
  }

  usdAmountInput.addEventListener('input', updateUsdAmount)
  usdAmountInput.addEventListener('change', updateUsdAmount)

  document.getElementById('increaseRate')!.addEventListener('click', () => {
    const oldRate = exchangeRate.value
    exchangeRate.value += 0.01
    addLog('cartLog', `Action: Exchange rate increased from ${oldRate.toFixed(2)} to ${exchangeRate.value.toFixed(2)}`, 'info')
  })

  document.getElementById('decreaseRate')!.addEventListener('click', () => {
    const oldRate = exchangeRate.value
    exchangeRate.value = Math.max(0.01, exchangeRate.value - 0.01)
    addLog('cartLog', `Action: Exchange rate decreased from ${oldRate.toFixed(2)} to ${exchangeRate.value.toFixed(2)}`, 'info')
  })

  addLog('cartLog', `Initialized cart with computed values: itemCount, subtotal, total`, 'info')
}

// Section 4: Watch & Validation
function setupWatchDemo() {
  addLog('searchLog', '🔧 Watch & Validation demo initialized', 'info')
  addLog('validationLog', '🔧 Form Validation demo initialized', 'info')

  // Search with debounce - initialize from current value
  const searchInput = document.getElementById('searchInput') as HTMLInputElement
  const searchQuery = ref(searchInput.value || '')
  let debounceTimer: number
  let searchCallCount = 0

  // Update search result display immediately with current value
  document.getElementById('searchResult')!.textContent = searchQuery.value
  if (searchQuery.value) {
    addLog('searchLog', `Initial search query: "${searchQuery.value}"`, 'info')
  }

  watch(searchQuery, (newQuery, oldQuery, cleanup) => {
    searchCallCount++
    addLog('searchLog', `Watch #${searchCallCount}: Search query changed from "${oldQuery}" to "${newQuery}"`, 'watch')

    cleanup(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        addLog('searchLog', `Cleanup: Previous search timeout cleared`, 'info')
      }
    })

    debounceTimer = setTimeout(() => {
      document.getElementById('searchResult')!.textContent = newQuery
      addLog('searchLog', `Debounced search executed: "${newQuery}"`, 'info')
    }, 500) as unknown as number
  })

  // Handle both input and change events for search
  const updateSearchQuery = (e: Event) => {
    const value = (e.target as HTMLInputElement).value
    addLog('searchLog', `Input: Search query updating to "${value}"`, 'info')
    searchQuery.value = value
  }

  searchInput.addEventListener('input', updateSearchQuery)
  searchInput.addEventListener('change', updateSearchQuery)

  // Form validation - initialize from current form values
  const valUsernameInput = document.getElementById('valUsername') as HTMLInputElement
  const valEmailInput = document.getElementById('valEmail') as HTMLInputElement
  const valPasswordInput = document.getElementById('valPassword') as HTMLInputElement

  const form = reactive({
    username: valUsernameInput.value || '',
    email: valEmailInput.value || '',
    password: valPasswordInput.value || ''
  })

  const errors = reactive({
    username: '',
    email: '',
    password: ''
  })

  addLog('validationLog', `Form initialized with values: username="${form.username}", email="${form.email}", password=${'*'.repeat(form.password.length)}`, 'info')

  const isFormValid = computed(() => {
    const valid = !errors.username && !errors.email && !errors.password &&
           form.username.length >= 3 &&
           form.email.includes('@') &&
           form.password.length >= 8

    addLog('validationLog', `Computed: Form validity recalculated: ${valid ? 'VALID' : 'INVALID'}`, 'computed')
    return valid
  })

  // Validation watchers with detailed logging
  let validationCount = 0

  // Helper function to validate and update errors
  const validateField = (field: keyof typeof form, value: string) => {
    validationCount++
    addLog('validationLog', `Watch #${validationCount}: ${field} validation - "${field === 'password' ? '*'.repeat(value.length) : value}"`, 'watch')

    let error = ''

    switch (field) {
      case 'username':
        if (value.length < 3) {
          error = 'Username must be at least 3 characters'
          addLog('validationLog', `  Validation: Username too short`, 'error')
        } else {
          addLog('validationLog', `  Validation: Username OK`, 'info')
        }
        break
      case 'email':
        if (!value.includes('@')) {
          error = 'Please enter a valid email'
          addLog('validationLog', `  Validation: Invalid email format`, 'error')
        } else {
          addLog('validationLog', `  Validation: Email OK`, 'info')
        }
        break
      case 'password':
        if (value.length < 8) {
          error = 'Password must be at least 8 characters'
          addLog('validationLog', `  Validation: Password too short`, 'error')
        } else {
          addLog('validationLog', `  Validation: Password OK`, 'info')
        }
        break
    }

    errors[field] = error
  }

  // Initial validation of all fields
  validateField('username', form.username)
  validateField('email', form.email)
  validateField('password', form.password)

  // Watch for changes in form fields
  watch(() => form.username, (username) => validateField('username', username))
  watch(() => form.email, (email) => validateField('email', email))
  watch(() => form.password, (password) => validateField('password', password))

  // Display errors and status
  effect(() => {
    document.getElementById('valUsernameError')!.textContent = errors.username
    document.getElementById('valEmailError')!.textContent = errors.email
    document.getElementById('valPasswordError')!.textContent = errors.password

    const statusElement = document.getElementById('formStatus')!
    if (isFormValid.value) {
      statusElement.textContent = '✓ Form is valid!'
      statusElement.className = 'form-status valid'
    } else {
      statusElement.textContent = '✗ Form is invalid'
      statusElement.className = 'form-status invalid'
    }

    addLog('validationLog', `Effect: Form status updated - ${isFormValid.value ? 'VALID' : 'INVALID'}`, 'effect')
  })

  // Helper function to update form field
  const updateFormField = (field: keyof typeof form, value: string) => {
    form[field] = value
    addLog('validationLog', `Input: ${field} set to "${field === 'password' ? '*'.repeat(value.length) : value}"`, 'info')
  }

  // Input bindings with logging - handle both input and change events
  valUsernameInput.addEventListener('input', (e) => {
    updateFormField('username', (e.target as HTMLInputElement).value)
  })

  valUsernameInput.addEventListener('change', (e) => {
    updateFormField('username', (e.target as HTMLInputElement).value)
  })

  valEmailInput.addEventListener('input', (e) => {
    updateFormField('email', (e.target as HTMLInputElement).value)
  })

  valEmailInput.addEventListener('change', (e) => {
    updateFormField('email', (e.target as HTMLInputElement).value)
  })

  valPasswordInput.addEventListener('input', (e) => {
    updateFormField('password', (e.target as HTMLInputElement).value)
  })

  valPasswordInput.addEventListener('change', (e) => {
    updateFormField('password', (e.target as HTMLInputElement).value)
  })

  document.getElementById('validateForm')!.addEventListener('click', () => {
    addLog('validationLog', `Action: Manual validation triggered - Form is ${isFormValid.value ? 'VALID' : 'INVALID'}`, 'info')
  })

  addLog('validationLog', `Initialized form validation with 3 watchers and computed validity`, 'info')
}

// Section 5: Advanced Patterns
function setupAdvancedDemo() {
  const data = reactive({ a: 0, b: 0, c: 0 })
  let updateCount = 0

  addLog('scopeLog', '🔧 Advanced Patterns demo initialized', 'info')

  // Batch demo with detailed logging
  effect(() => {
    updateCount++
    document.getElementById('batchA')!.textContent = data.a.toString()
    document.getElementById('batchB')!.textContent = data.b.toString()
    document.getElementById('batchC')!.textContent = data.c.toString()
    document.getElementById('batchCount')!.textContent = updateCount.toString()

    addLog('scopeLog', `Effect #${updateCount}: Batch values updated - A=${data.a}, B=${data.b}, C=${data.c}`, 'effect')
  })

  document.getElementById('updateSeparate')!.addEventListener('click', () => {
    addLog('scopeLog', `Action: Updating values separately (3 effect runs expected)`, 'info')

    data.a++
    addLog('scopeLog', `  Set data.a = ${data.a}`, 'info')

    data.b++
    addLog('scopeLog', `  Set data.b = ${data.b}`, 'info')

    data.c++
    addLog('scopeLog', `  Set data.c = ${data.c}`, 'info')
  })

  document.getElementById('updateBatch')!.addEventListener('click', () => {
    addLog('scopeLog', `Action: Starting batch update (1 effect run expected)`, 'batch')

    batch(() => {
      data.a += 10
      addLog('scopeLog', `  Batch: Set data.a = ${data.a}`, 'batch')

      data.b += 10
      addLog('scopeLog', `  Batch: Set data.b = ${data.b}`, 'batch')

      data.c += 10
      addLog('scopeLog', `  Batch: Set data.c = ${data.c}`, 'batch')
    })

    addLog('scopeLog', `Action: Batch update completed`, 'batch')
  })

  // Effect scope demo
  let effectScope: ReturnType<typeof createEffectScope> | null = null
  const scopeValue = ref(0)
  let scopeEffectRunCount = 0

  function updateScopeStatus() {
    const statusElement = document.getElementById('scopeStatus')!
    statusElement.textContent = effectScope?.active ? 'Active' : 'Inactive'
    statusElement.className = `scope-status ${effectScope?.active ? 'active' : 'inactive'}`
  }

  document.getElementById('startScope')!.addEventListener('click', () => {
    if (effectScope) {
      effectScope.stop()
    }

    effectScope = createEffectScope()
    scopeEffectRunCount = 0

    addLog('scopeLog', `Action: Creating new effect scope`, 'info')

    effectScope.run(() => {
      effect(() => {
        scopeEffectRunCount++
        addLog('scopeLog', `Scope Effect #${scopeEffectRunCount}: scopeValue = ${scopeValue.value}`, 'effect')
      })
    })

    updateScopeStatus()
    addLog('scopeLog', `Action: Effect scope started with 1 effect`, 'info')
  })

  document.getElementById('stopScope')!.addEventListener('click', () => {
    if (effectScope) {
      addLog('scopeLog', `Action: Stopping effect scope`, 'info')
      effectScope.stop()
      effectScope = null
      updateScopeStatus()
      addLog('scopeLog', `Action: Effect scope stopped - effects should no longer run`, 'info')
    }
  })

  // Change scope value to demonstrate
  setInterval(() => {
    if (effectScope?.active) {
      const oldValue = scopeValue.value
      scopeValue.value++
      addLog('scopeLog', `Interval: scopeValue changed from ${oldValue} to ${scopeValue.value}`, 'info')
    }
  }, 3000)

  addLog('scopeLog', `Initialized batch updates and effect scope demos`, 'info')
}

// Initialize all demos when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add global log element if it doesn't exist
  if (!document.getElementById('globalLog')) {
    const globalLog = document.createElement('div')
    globalLog.id = 'globalLog'
    globalLog.className = 'log global-log'
    globalLog.style.cssText = `
      position: fixed
      bottom: 20px
      right: 20px
      width: 400px
      height: 200px
      background: rgba(0, 0, 0, 0.9)
      border: 1px solid var(--border)
      z-index: 1000
      font-size: 12px
    `
    document.body.appendChild(globalLog)
  }

  addLog('globalLog', '🚀 Reactivity System Demo Started!', 'info')

  setupNavigation()
  setupRefDemo()
  setupReactiveDemo()
  setupComputedDemo()
  setupWatchDemo()
  setupAdvancedDemo()

  addLog('globalLog', '✅ All demos initialized successfully!', 'info')
  console.log('🎉 Reactivity System Demo Loaded!')
})
