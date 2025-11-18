/**
 * Production-ready reactive system.
 * Refactored with functional style and encapsulated entities
 */

import { deepClone } from './clone'
import type {
  EffectFn,
  ComputedGetter,
  ComputedSetter,
  WatchCallback,
  WatchSource,
  Ref,
  Reactive,
  ComputedOptions,
  EffectOptions,
  WatchOptions,
  WatchStopHandle,
  EffectScope,
  ReactivityConfig,
} from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

const MUTATING_ARRAY_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
const NON_REACTIVE_TYPES = new Set<Function>([Date, RegExp, Map, Set, WeakMap, WeakSet, Function])

const DEFAULT_CONFIG: ReactivityConfig = {
  enableDebug: false,
  cyclePrevention: true,
  batchUpdates: true,
  deepReactiveMaxDepth: 10,
  trackingDepth: 100,
}

// ============================================================================
// REACTIVE SYSTEM STATE
// ============================================================================

// Global system state
let config: ReactivityConfig = { ...DEFAULT_CONFIG }
let targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>()
let reactiveMap = new WeakMap<object, any>()
let effectStack: EffectFn[] = []
let activeEffect: EffectFn | null = null
let activeEffectScope: EffectScope | null = null
let shouldTrack = true

// Batch update state
let updateQueue = new Set<EffectFn>()
let scheduledEffects = new Set<EffectFn>()
let batchStack = 0
let isBatching = false

// ============================================================================
// PURE UTILITIES
// ============================================================================

// Pure utility functions
const isObject = (value: any): boolean => value !== null && typeof value === 'object'

const isReactiveEligible = (target: any): boolean => {
  return isObject(target) && !NON_REACTIVE_TYPES.has(target?.constructor)
}

const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false
  }
  return true
}

const traverse = (value: any, seen = new Set()): void => {
  if (!isObject(value) || value === null || seen.has(value)) return
  seen.add(value)

  if (Array.isArray(value)) {
    value.forEach(item => traverse(item, seen))
  } else {
    for (const key in value) {
      traverse(value[key], seen)
    }
  }
}

const getSourceValue = (source: WatchSource<any>): any => {
  if (typeof source === 'function') return source()
  if (isRef(source)) return source.value
  if (Array.isArray(source)) return source.map((s: any) => getSourceValue(s))
  return source
}

// ============================================================================
// REACTIVE ENTITIES
// ============================================================================

/**
 * Ref entity - simple reactive value container
 */
class RefImpl<T> {
  private _value: T
  public readonly __isRef = true

  constructor(value: T) {
    this._value = value
  }

  get value(): T {
    track(this, 'value')
    return this._value
  }

  set value(newValue: T) {
    if (!Object.is(this._value, newValue)) {
      this._value = newValue
      trigger(this, 'value')
    }
  }
}

/**
 * ShallowRef entity - reactive reference with shallow reactivity
 */
class ShallowRefImpl<T> {
  private _value: T
  public readonly __isRef = true
  public readonly __isShallowRef = true

  constructor(value: T) {
    this._value = value
  }

  get value(): T {
    track(this, 'value')
    return this._value
  }

  set value(newValue: T) {
    if (!Object.is(this._value, newValue)) {
      this._value = newValue
      trigger(this, 'value')
    }
  }
}

class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true
  private _isSetting = false
  private readonly _getter: ComputedGetter<T>
  private readonly _setter?: ComputedSetter<T>
  private readonly _runner: { run: () => T; stop: () => void }
  public readonly __isRef = true

  constructor(getterOrOptions: ComputedGetter<T> | ComputedOptions<T>) {
    const options = typeof getterOrOptions === 'function'
      ? { get: getterOrOptions }
      : getterOrOptions

    this._getter = options.get
    this._setter = options.set

    this._runner = createComputedEffect(options.get, {
      lazy: true,
      scheduler: () => {
        if (!this._dirty) {
          this._dirty = true

          if (!this._isSetting) {
            trigger(this, 'value')
          }
        }
      }
    })
  }

  get value(): T {
    track(this, 'value')

    if (this._dirty) {
      if (config.enableDebug) {
        console.log('[Computed] Recomputing value')
      }

      this._value = this._runner.run()
      this._dirty = false
    }

    return this._value
  }

  set value(newValue: T) {
    if (this._setter) {
      this._isSetting = true

      try {
        this._setter(newValue)
        this._dirty = true
        trigger(this, 'value')
      } finally {
        this._isSetting = false
      }
    } else if (config.enableDebug) {
      console.warn('[Computed] Attempt to set computed value without setter')
    }
  }
}

/**
 * EffectScope entity - manages group of effects
 */
class EffectScopeImpl implements EffectScope {
  private _active = true
  public readonly effects = new Set<() => void>()

  get active(): boolean {
    return this._active
  }

  run<T>(fn: () => T): T | undefined {
    if (!this._active) {
      console.warn('[EffectScope] Running effect in inactive scope')
      return undefined
    }

    const parentScope = activeEffectScope
    activeEffectScope = this

    try {
      return fn()
    } finally {
      activeEffectScope = parentScope
    }
  }

  stop(): void {
    if (!this._active) return

    this._active = false
    this.effects.forEach(stop => stop())
    this.effects.clear()

    if (config.enableDebug) {
      console.log('[EffectScope] Scope stopped')
    }
  }
}

// ============================================================================
// DEPENDENCY TRACKING
// ============================================================================

function track(target: object, key: string | symbol): void {
  if (!shouldTrack || !activeEffect || activeEffect.isActive === false) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)

    if (!activeEffect.deps) {
      activeEffect.deps = []
    }
    activeEffect.deps.push(dep)

    if (config.enableDebug) {
      console.log(`[Track] Effect registered for ${String(key)}`)
    }
  }
}

function trigger(target: object, key: string | symbol): void {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (!dep) return

  if (config.enableDebug) {
    console.log(`[Trigger] Found ${dep.size} effects for ${String(key)}`)
  }

  const effectsToRun = new Set<EffectFn>()
  dep.forEach(effect => {
    if (effect !== activeEffect && effect.isActive !== false) {
      effectsToRun.add(effect)
    }
  })

  if (config.enableDebug) {
    console.log(`[Trigger] Running ${effectsToRun.size} effects for ${String(key)}`)
  }

  effectsToRun.forEach(effect => {
    if (config.batchUpdates && isBatching) {
      if (!scheduledEffects.has(effect)) {
        updateQueue.add(effect)
        scheduledEffects.add(effect)
      }
    } else {
      if (effect.scheduler) {
        effect.scheduler(() => effect())
      } else {
        effect()
      }
    }
  })
}

function cleanupEffect(effectFn: EffectFn): void {
  const deps = effectFn.deps
  if (deps) {
    deps.forEach(dep => {
      dep.delete(effectFn)
    })
    deps.length = 0
  }

  if (config.enableDebug) {
    console.log('[Cleanup] Effect dependencies cleaned')
  }
}

// ============================================================================
// BATCH UPDATES
// ============================================================================

function flushBatch(): void {
  isBatching = false
  batchStack = 0

  const effects = Array.from(updateQueue)
  updateQueue.clear()
  scheduledEffects.clear()

  if (config.enableDebug) {
    console.log(`[Batch] Flushing ${effects.length} effects`)
  }

  effects.forEach(effect => {
    try {
      effect()
    } catch (error) {
      console.error('Error during batch update:', error)
    }
  })
}

// ============================================================================
// REACTIVE OBJECT HANDLERS
// ============================================================================

function handleArrayMethodTriggers(target: any[], method: string, args: any[]): void {
  switch (method) {
    case 'push':
    case 'unshift':
      const startIndex = method === 'push' ? target.length - args.length : 0
      for (let i = startIndex; i < startIndex + args.length; i++) {
        trigger(target, i.toString())
      }
      break

    case 'pop':
    case 'shift':
      if (target.length >= 0) {
        const removedIndex = method === 'pop' ? target.length : 0
        trigger(target, removedIndex.toString())
      }
      break

    case 'splice':
      const start = args[0] as number
      const deleteCount = args[1] as number
      for (let i = start; i < start + (deleteCount || 0); i++) {
        trigger(target, i.toString())
      }
      for (let i = start; i < start + (args.length - 2); i++) {
        trigger(target, i.toString())
      }
      break

    case 'sort':
    case 'reverse':
      for (let i = 0; i < target.length; i++) {
        trigger(target, i.toString())
      }
      break
  }
}

function createArrayMethodHandler(target: any[], method: string): Function {
  return function (...args: any[]) {
    const oldLength = target.length

    pauseTracking()
    const result = (Array.prototype as any)[method].apply(target, args)
    resetTracking()

    if (target.length !== oldLength) {
      trigger(target, 'length')
    }

    trigger(target, 'keys')
    handleArrayMethodTriggers(target, method, args)

    return result
  }
}

// ============================================================================
// REACTIVE PROXY HANDLERS
// ============================================================================

const arrayHandlers = {
  get(target: any[], key: string | symbol, receiver: any) {
    if (key === '__isReactive') return true

    if (typeof key !== 'symbol') {
      track(target, key)
    }

    if (typeof key === 'string' && MUTATING_ARRAY_METHODS.includes(key)) {
      return createArrayMethodHandler(target, key)
    }

    const value = Reflect.get(target, key, receiver)
    return isReactiveEligible(value) ? reactive(value) : value
  },

  set(target: any[], key: string | symbol, value: any, receiver: any) {
    const numericKey = typeof key === 'string' ? parseInt(key) : NaN
    const isIndex = !isNaN(numericKey) && numericKey >= 0
    const oldValue = target[key as any]

    if (Object.is(oldValue, value)) return true

    const result = Reflect.set(target, key, value, receiver)
    if (result) {
      trigger(target, key)
      if (isIndex) trigger(target, 'keys')
    }
    return result
  },

  has(target: any[], key: string | symbol) {
    track(target, key)
    return Reflect.has(target, key)
  },

  ownKeys(target: any[]) {
    track(target, 'keys')
    return Reflect.ownKeys(target)
  },

  deleteProperty(target: any[], key: string | symbol) {
    const hadKey = Reflect.has(target, key)
    const result = Reflect.deleteProperty(target, key)

    if (hadKey && result) {
      trigger(target, key)
      trigger(target, 'keys')
    }
    return result
  }
}

const objectHandlers = {
  get(target: any, key: string | symbol, receiver: any) {
    if (key === '__isReactive') return true

    const res = Reflect.get(target, key, receiver)
    track(target, key)

    return isReactiveEligible(res) ? reactive(res) : res
  },

  set(target: any, key: string | symbol, value: any, receiver: any) {
    const oldValue = target[key]
    if (Object.is(oldValue, value)) return true

    const result = Reflect.set(target, key, value, receiver)
    if (result) trigger(target, key)
    return result
  },

  has(target: any, key: string | symbol) {
    track(target, key)
    return Reflect.has(target, key)
  },

  ownKeys(target: any) {
    track(target, 'keys')
    return Reflect.ownKeys(target)
  },

  deleteProperty(target: any, key: string | symbol) {
    const hadKey = Reflect.has(target, key)
    const result = Reflect.deleteProperty(target, key)

    if (hadKey && result) {
      trigger(target, key)
    }
    return result
  }
}

// ============================================================================
// CORE REACTIVITY FUNCTIONS
// ============================================================================

export function ref<T>(initialValue: T): Ref<T> {
  return new RefImpl(initialValue)
}

export function shallowRef<T>(initialValue: T): Ref<T> {
  return new ShallowRefImpl(initialValue)
}

export function reactive<T extends object>(target: T, depth: number = 0): Reactive<T> {
  if (depth > (config.deepReactiveMaxDepth || 10)) return target
  if (!isReactiveEligible(target)) return target

  const existing = reactiveMap.get(target)
  if (existing) return existing

  let proxy: T
  if (Array.isArray(target)) {
    const array = [...target]
    proxy = new Proxy(array, arrayHandlers) as T
  } else {
    proxy = new Proxy(target, objectHandlers) as T
  }

  reactiveMap.set(target, proxy)
  return proxy as Reactive<T>
}

export function computed<T>(getterOrOptions: ComputedGetter<T> | ComputedOptions<T>): Ref<T> {
  return new ComputedRefImpl(getterOrOptions)
}

function createComputedEffect<T>(
  fn: () => T,
  options?: EffectOptions
): { run: () => T; stop: () => void } {
  let result: T
  let isStopped = false

  const effectFn = ((): T => {
    if (isStopped) return result

    try {
      effectStack.push(effectFn as any)
      activeEffect = effectFn as any
      result = fn()
      return result
    } finally {
      effectStack.pop()
      activeEffect = effectStack.length > 0 ? effectStack[effectStack.length - 1] : null
    }
  }) as any

  effectFn.isActive = true
  effectFn.deps = []
  effectFn.scheduler = options?.scheduler

  const run = (): T => effectFn()
  const stop = (): void => {
    if (effectFn.isActive) {
      cleanupEffect(effectFn as any)
      effectFn.isActive = false
      isStopped = true
    }
  }

  if (!options?.lazy) {
    run()
  }

  return { run, stop }
}

// ============================================================================
// EFFECT SYSTEM
// ============================================================================

export function effect(update: EffectFn, options?: EffectOptions): () => void {
  const effectFn = ((): void => {
    if (effectFn.cleanup) {
      effectFn.cleanup()
      effectFn.cleanup = undefined
    }

    try {
      effectStack.push(effectFn)
      activeEffect = effectFn

      const result = update()
      if (typeof result === 'function') {
        effectFn.cleanup = result
      }
    } finally {
      effectStack.pop()
      activeEffect = effectStack.length > 0 ? effectStack[effectStack.length - 1] : null
    }
  }) as EffectFn

  effectFn.isActive = true
  effectFn.cleanup = undefined
  effectFn.deps = []
  effectFn.scheduler = options?.scheduler

  const stop = () => {
    if (effectFn.isActive) {
      cleanupEffect(effectFn)
      effectFn.isActive = false

      if (effectFn.cleanup) {
        effectFn.cleanup()
      }

      updateQueue.delete(effectFn)
      scheduledEffects.delete(effectFn)

      if (config.enableDebug) {
        console.log('[Effect] Effect stopped')
      }
    }
  }

  if (activeEffectScope && activeEffectScope.active) {
    activeEffectScope.effects.add(stop)
  }
  if (options?.scope && options.scope.active) {
    options.scope.effects.add(stop)
  }
  if (!options?.lazy) {
    effectFn()
  }

  return stop
}

export function createEffectScope(): EffectScope {
  return new EffectScopeImpl()
}

// ============================================================================
// WATCH SYSTEM
// ============================================================================

export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options?: WatchOptions
): WatchStopHandle {
  const opts: WatchOptions = {
    immediate: false,
    deep: false,
    flush: 'post',
    ...options,
  }

  let oldValue: any
  let isFirstRun = true
  let pendingCleanup: (() => void) | null = null

  const stop = effect(() => {
    const newValue = getSourceValue(source)

    if (opts.deep && isObject(newValue)) {
      traverse(newValue)
    }

    if (isFirstRun) {
      if (opts.immediate) {
        callback(newValue, undefined, (fn) => { pendingCleanup = fn })
      }
      oldValue = opts.deep ? deepClone(newValue) : newValue
      isFirstRun = false
    } else {
      const hasChanged = Array.isArray(newValue) && Array.isArray(oldValue)
        ? newValue.some((val, idx) => opts.deep
          ? !deepEqual(val, oldValue[idx])
          : !Object.is(val, oldValue[idx])
        )
        : opts.deep
          ? !deepEqual(oldValue, newValue)
          : !Object.is(oldValue, newValue)

      if (hasChanged) {
        if (pendingCleanup) {
          pendingCleanup()
          pendingCleanup = null
        }

        const oldValueForCallback = oldValue
        callback(newValue, oldValueForCallback, (fn) => { pendingCleanup = fn })
        oldValue = opts.deep ? deepClone(newValue) : newValue
      }
    }
  })

  return () => {
    stop()
    if (pendingCleanup) {
      pendingCleanup()
    }
  }
}

export function watchRef<T>(
  source: Ref<T>,
  callback: WatchCallback<T>,
  options?: WatchOptions
): WatchStopHandle {
  return watch(source, callback, options)
}

export function watchReactive<T extends object>(
  source: T,
  callback: WatchCallback<T>,
  options?: WatchOptions
): WatchStopHandle {
  return watch(source, callback, { deep: true, ...options })
}

// ============================================================================
// BATCHING AND UTILITIES
// ============================================================================

export function batch<T>(fn: () => T): T {
  batchStack++
  const wasBatching = isBatching
  isBatching = true

  try {
    const result = fn()
    batchStack--

    if (batchStack === 0 && !wasBatching) {
      flushBatch()
    }

    return result
  } catch (error) {
    batchStack = 0
    isBatching = false
    updateQueue.clear()
    scheduledEffects.clear()
    throw error
  }
}

export function flushUpdates(): void {
  if (isBatching) {
    flushBatch()
  }
}

export function unref<T>(value: Ref<T> | T): T {
  return isRef(value) ? value.value : value
}

export function isRef<T>(value: any): value is Ref<T> {
  return isObject(value) && value.__isRef === true
}

export function isShallowRef<T>(value: any): value is Ref<T> {
  return isObject(value) && value.__isRef === true && value.__isShallowRef === true
}

export function isReactive(value: any): boolean {
  return !!(value && typeof value === 'object' && value.__isReactive)
}

// ============================================================================
// CONFIGURATION AND STATE MANAGEMENT
// ============================================================================

export function setConfig(newConfig: Partial<ReactivityConfig>): void {
  Object.assign(config, newConfig)
}

export function getConfig(): ReactivityConfig {
  return { ...config }
}

export function enableDebug(enable: boolean = true): void {
  config.enableDebug = enable
}

export function getEffectStats(): { activeEffects: number; queuedUpdates: number } {
  return {
    activeEffects: effectStack.length,
    queuedUpdates: updateQueue.size,
  }
}

function pauseTracking(): void {
  shouldTrack = false
}

function resetTracking(): void {
  shouldTrack = true
}

export function clearReactivityState(): void {
  targetMap = new WeakMap()
  reactiveMap = new WeakMap()
  updateQueue.clear()
  effectStack.length = 0
  scheduledEffects.clear()

  activeEffect = null
  activeEffectScope = null
  isBatching = false
  batchStack = 0
  shouldTrack = true

  config = { ...DEFAULT_CONFIG }

  if (config.enableDebug) {
    console.log('[Reactivity] State cleared')
  }
}
