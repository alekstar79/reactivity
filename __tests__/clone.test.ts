import { deepClone } from '../src'

describe('deepClone', () => {
  it('should clone primitive values', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('hello')).toBe('hello')
    expect(deepClone(true)).toBe(true)
    expect(deepClone(null)).toBe(null)
    expect(deepClone(undefined)).toBe(undefined)
  })

  it('should clone arrays', () => {
    const original = [1, 2, 3, { a: 4 }]
    const cloned = deepClone(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned[3]).not.toBe(original[3])
  })

  it('should clone objects', () => {
    const original = { a: 1, b: { c: 2 } }
    const cloned = deepClone(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.b).not.toBe(original.b)
  })

  it('should clone Date objects', () => {
    const original = new Date('2023-01-01')
    const cloned = deepClone(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.getTime()).toBe(original.getTime())
  })

  it('should clone RegExp objects', () => {
    const original = /test/gi
    const cloned = deepClone(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.source).toBe(original.source)
    expect(cloned.flags).toBe(original.flags)
  })

  it('should clone Map objects', () => {
    const original = new Map<string, any>([
      ['key1', 'value1'],
      ['key2', { nested: 'value' }]
    ])
    const cloned = deepClone(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.get('key2')).not.toBe(original.get('key2'))
  })

  it('should clone Set objects', () => {
    const original = new Set([1, 2, { a: 3 }])
    const cloned = deepClone(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)

    const clonedArray = Array.from(cloned)
    const originalArray = Array.from(original)
    expect(clonedArray[2]).not.toBe(originalArray[2])
  })

  it('should handle circular references', () => {
    const original: any = { a: 1 }
    original.self = original

    const cloned = deepClone(original)

    expect(cloned.a).toBe(1)
    expect(cloned.self).toBe(cloned)
    expect(cloned.self).not.toBe(original)
  })

  it('should handle nested circular references', () => {
    const original: any = {
      a: 1,
      nested: {
        b: 2
      }
    }
    original.nested.parent = original

    const cloned = deepClone(original)

    expect(cloned.a).toBe(1)
    expect(cloned.nested.b).toBe(2)
    expect(cloned.nested.parent).toBe(cloned)
    expect(cloned.nested.parent).not.toBe(original)
  })

  it('should handle multiple circular references', () => {
    const original: any = { a: 1 }
    const obj2 = { b: 2, ref: original }
    original.ref = obj2

    const cloned = deepClone(original)

    expect(cloned.a).toBe(1)
    expect(cloned.ref.b).toBe(2)
    expect(cloned.ref.ref).toBe(cloned)
    expect(cloned.ref).not.toBe(obj2)
  })

  it('should clone complex nested structures', () => {
    const original = {
      array: [1, 2, { a: 3 }],
      map: new Map([['key', { b: 4 }]]),
      set: new Set([5, 6, { c: 7 }]),
      date: new Date(),
      regex: /test/g,
      object: {
        nested: {
          deep: 'value'
        }
      }
    }

    const cloned = deepClone(original)

    expect(cloned).toEqual(original)
    expect(cloned.array).not.toBe(original.array)
    expect(cloned.array[2]).not.toBe(original.array[2])
    expect(cloned.map).not.toBe(original.map)
    expect(cloned.map.get('key')).not.toBe(original.map.get('key'))
    expect(cloned.set).not.toBe(original.set)
    expect(cloned.date).not.toBe(original.date)
    expect(cloned.regex).not.toBe(original.regex)
    expect(cloned.object).not.toBe(original.object)
    expect(cloned.object.nested).not.toBe(original.object.nested)
  })

  it('should preserve class instances for built-in types', () => {
    const original = {
      date: new Date('2023-01-01'),
      regex: /test/gi,
      map: new Map([['a', 1]]),
      set: new Set([1, 2, 3])
    }

    const cloned = deepClone(original)

    expect(cloned.date instanceof Date).toBe(true)
    expect(cloned.regex instanceof RegExp).toBe(true)
    expect(cloned.map instanceof Map).toBe(true)
    expect(cloned.set instanceof Set).toBe(true)
  })

  it('should handle null and undefined properties', () => {
    const original = {
      a: null,
      b: undefined,
      c: { d: null }
    }

    const cloned = deepClone(original)

    expect(cloned.a).toBe(null)
    expect(cloned.b).toBe(undefined)
    expect(cloned.c.d).toBe(null)
    expect(cloned.c).not.toBe(original.c)
  })

  it('should handle empty objects and arrays', () => {
    const original = {
      emptyObj: {},
      emptyArr: [],
      nestedEmpty: { empty: {} }
    }

    const cloned = deepClone(original)

    expect(cloned.emptyObj).toEqual({})
    expect(cloned.emptyArr).toEqual([])
    expect(cloned.nestedEmpty).toEqual({ empty: {} })
    expect(cloned.emptyObj).not.toBe(original.emptyObj)
    expect(cloned.emptyArr).not.toBe(original.emptyArr)
    expect(cloned.nestedEmpty).not.toBe(original.nestedEmpty)
  })

  it('should not clone non-object values recursively', () => {
    const original = {
      number: 42,
      string: 'hello',
      boolean: true,
      symbol: Symbol('test'),
      bigint: BigInt(123)
    }

    const cloned = deepClone(original)

    expect(cloned.number).toBe(42)
    expect(cloned.string).toBe('hello')
    expect(cloned.boolean).toBe(true)
    // Symbols and BigInts are not cloned (they are primitive)
    expect(cloned.symbol).toBe(original.symbol)
    expect(cloned.bigint).toBe(original.bigint)
  })

  it('should handle very deep nesting', () => {
    let original: any = {}
    let current = original
    for (let i = 0; i < 100; i++) {
      current.level = i
      current.next = {}
      current = current.next
    }

    const cloned = deepClone(original)

    let originalCurrent = original
    let clonedCurrent = cloned
    for (let i = 0; i < 100; i++) {
      expect(clonedCurrent.level).toBe(originalCurrent.level)
      expect(clonedCurrent).not.toBe(originalCurrent)
      originalCurrent = originalCurrent.next
      clonedCurrent = clonedCurrent.next
    }
  })
})
