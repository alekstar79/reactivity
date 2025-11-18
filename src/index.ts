/**
 * Main entry point for the npm package
 * Exports all public APIs from refactored reactivity system
 */

export { deepClone } from './clone'

export {
  // Main functions
  effect,
  ref,
  shallowRef,
  reactive,
  computed,
  watch,
  watchRef,
  watchReactive,

  // Utilities
  createEffectScope,
  isRef,
  isShallowRef,
  unref,
  isReactive,
  batch,
  flushUpdates,

  // Configuration
  setConfig,
  getConfig,
  enableDebug,
  getEffectStats,
  clearReactivityState,
} from './reactivity'

export type {
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
  TrackEvent,
  TriggerEvent,
  EffectScope,
  ReactivityConfig,
} from './types'
