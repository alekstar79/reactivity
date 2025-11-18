/**
 * TypeScript types and interfaces for a reactive system.
 * Provide full typing for all system components
 */

/**
 * Type for effects update functions
 */
export type EffectFn = (() => any) & {
  deps?: Set<EffectFn>[]
  cleanup?: () => void
  isActive?: boolean
  scheduler?: (job: () => void) => void
}

/**
 * Type for getter functions (computed)
 */
export type ComputedGetter<T> = () => T

/**
 * Type for setter functions (computed)
 */
export type ComputedSetter<T> = (newValue: T) => void

/**
 * Options for computed
 */
export interface ComputedOptions<T> {
  get: ComputedGetter<T>
  set?: ComputedSetter<T>
}

/**
 * Type for tracking functions (watch)
 */
export type WatchCallback<T> = (
  newValue: T,
  oldValue: T | undefined,
  cleanup: (fn: () => void) => void
) => void | Promise<void>

/**
 * Type for surveillance sources (watch sources)
 */
export type WatchSource<T> =
  | (() => T)
  | Ref<T>
  | Reactive<Record<string, any>>
  | (Ref | Reactive<any> | (() => any))[]

/**
 * Interface of the ref object
 */
export interface Ref<T = any> {
  __isRef?: true
  value: T
}

/**
 * Type for a reactive object
 */
export type Reactive<T extends Record<string, any>> = {
  [K in keyof T]: T[K]
}

/**
 * A scope of the effects
 */
export interface EffectScope {
  readonly active: boolean
  readonly effects: Set<EffectFn>
  run<T>(fn: () => T): T | undefined
  stop(): void
}

/**
 * Options for effect
 */
export interface EffectOptions {
  lazy?: boolean
  scheduler?: (job: () => void) => void
  scope?: EffectScope
}

/**
 * Debugging information about the effect
 */
export interface EffectDebugInfo {
  id: number
  parent?: EffectDebugInfo
  children: EffectDebugInfo[]
  dependencies: Set<EffectDebugInfo>
  dependents: Set<EffectDebugInfo>
}

/**
 * Options for watch
 */
export interface WatchOptions {
  immediate?: boolean
  deep?: boolean
  flush?: 'pre' | 'post' | 'sync'
  onTrack?: (event: TrackEvent) => void
  onTrigger?: (event: TriggerEvent) => void
  scheduler?: (job: () => void) => void
  memoize?: boolean
}

/**
 * Return type for watch (stop function)
 */
export type WatchStopHandle = () => void

/**
 * Dependency Tracking Events
 */
export interface TrackEvent {
  target: any
  type: 'get'
  key: string | symbol
}

/**
 * Events that trigger effects
 */
export interface TriggerEvent {
  target: any
  type: 'set' | 'add' | 'delete' | 'clear'
  key?: string | symbol
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

/**
 * Library configuration
 */
export interface ReactivityConfig {
  enableDebug?: boolean
  enableMemoization?: boolean
  cyclePrevention?: boolean
  batchUpdates?: boolean
  deepReactiveMaxDepth?: number
  trackingDepth?: number
}

/**
 * Internal structure for tracking dependencies
 */
export interface DependencyMap extends Map<any, Set<EffectFn>> {}

/**
 * Internal structure for tracking reverse dependencies
 */
export interface DependentMap extends Map<EffectFn, Set<any>> {}

/**
 * Batch update options
 */
export interface BatchOptions {
  timeout?: number
  maxUpdates?: number
}
