import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getTiantianDeviceId,
  initializeTiantianDeviceId,
  resetTiantianDeviceIdForTests,
  tiantianDeviceIdStorageKey,
} from './tiantianDeviceId.ts'

test('reuses a valid stored device id for the page session', () => {
  withStorage(new MemoryStorage([[tiantianDeviceIdStorageKey, validUuid]]), () => {
    assert.equal(initializeTiantianDeviceId(), validUuid)
    assert.equal(getTiantianDeviceId(), validUuid)
  })
})

test('replaces invalid storage values and persists the generated id', () => {
  const storage = new MemoryStorage([[tiantianDeviceIdStorageKey, 'invalid']])
  withStorage(storage, () => {
    const deviceId = getTiantianDeviceId()
    assert.match(deviceId, uuidPattern)
    assert.equal(storage.getItem(tiantianDeviceIdStorageKey), deviceId)
    assert.equal(getTiantianDeviceId(), deviceId)
  })
})

test('keeps a stable in-memory id when localStorage is unavailable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Reflect.deleteProperty(globalThis, 'localStorage')
  resetTiantianDeviceIdForTests()
  try {
    const first = getTiantianDeviceId()
    assert.equal(getTiantianDeviceId(), first)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
  }
})

test('keeps a stable in-memory id when storage reads and writes fail', () => {
  withStorage(new ThrowingStorage(), () => {
    const first = getTiantianDeviceId()
    assert.match(first, uuidPattern)
    assert.equal(getTiantianDeviceId(), first)
  })
})

const validUuid = '123e4567-e89b-12d3-a456-426614174000'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function withStorage(storage: MemoryStorage, callback: () => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  resetTiantianDeviceIdForTests()
  try {
    callback()
  } finally {
    resetTiantianDeviceIdForTests()
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>()
  constructor(entries: readonly (readonly [string, string])[] = []) {
    this.values = new Map(entries)
  }
  get length(): number {
    return this.values.size
  }
  clear(): void {
    this.values.clear()
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.values.delete(key)
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class ThrowingStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('storage unavailable')
  }
  override setItem(): void {
    throw new Error('storage unavailable')
  }
}
