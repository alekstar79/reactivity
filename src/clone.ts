/**
* @description The structuredClone function is well-supported by browsers (https://caniuse.com/?search=structuredClone)
*   and doesn't require a polyfill. It was created for educational purposes and is a simple implementation of _.deepClone.
*/
type Primitive = null | undefined | string | number | boolean | symbol | bigint

type DeepClone<T> =
  T extends Primitive ? T : // примитивы возвращаем как есть
  T extends Date ? Date :
  T extends RegExp ? RegExp :
  T extends Map<infer K, infer V> ? Map<DeepClone<K>, DeepClone<V>> :
  T extends Set<infer U> ? Set<DeepClone<U>> :
  T extends Array<infer U> ? Array<DeepClone<U>> :
  T extends object ? { [K in keyof T]: DeepClone<T[K]> } :
  // fallback: returning the original type
  T

export function deepClone<T>(value: T, map = new WeakMap()): DeepClone<T> {
  if (typeof value !== 'object' || value === null) {
    return value as DeepClone<T>
  }

  // handling circular references
  if (map.has(value)) {
    return map.get(value)
  }

  if (value instanceof Date) {
    return new Date(value) as DeepClone<T>
  }

  if (value instanceof RegExp) {
    return new RegExp(value) as DeepClone<T>
  }

  if (value instanceof Map) {
    const result = new Map()

    map.set(value, result)
    value.forEach((v, k) => {
      result.set(deepClone(k, map), deepClone(v, map))
    })

    return result as DeepClone<T>
  }

  if (value instanceof Set) {
    const result = new Set()

    map.set(value, result)
    value.forEach(v => {
      result.add(deepClone(v, map))
    })

    return result as DeepClone<T>
  }

  if (Array.isArray(value)) {
    const result: any[] = []

    map.set(value, result)
    value.forEach((item, i) => {
      result[i] = deepClone(item, map)
    })

    return result as DeepClone<T>
  }

  // ordinary object
  const result: any = {}
  map.set(value, result)
  Object.entries(value).forEach(([key, val]) => {
    result[key] = deepClone(val, map)
  })

  return result as DeepClone<T>
}

// @ts-ignore
globalThis.structuredClone ??= deepClone
