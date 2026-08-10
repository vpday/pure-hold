import assert from 'node:assert/strict'
import test from 'node:test'

import { installLocalStorage, MemoryStorage } from '@/shared/testing/browserStorageTestSupport.ts'
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
  const restore = installLocalStorage(undefined)
  resetTiantianDeviceIdForTests()
  try {
    const first = getTiantianDeviceId()
    assert.equal(getTiantianDeviceId(), first)
  } finally {
    resetTiantianDeviceIdForTests()
    restore()
  }
})

test('keeps a stable in-memory id when storage reads and writes fail', () => {
  const storage = new MemoryStorage()
  storage.readError = new Error('storage unavailable')
  storage.writeError = new Error('storage unavailable')
  withStorage(storage, () => {
    const first = getTiantianDeviceId()
    assert.match(first, uuidPattern)
    assert.equal(getTiantianDeviceId(), first)
  })
})

const validUuid = '123e4567-e89b-12d3-a456-426614174000'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function withStorage(storage: MemoryStorage, callback: () => void): void {
  const restore = installLocalStorage(storage)
  resetTiantianDeviceIdForTests()
  try {
    callback()
  } finally {
    resetTiantianDeviceIdForTests()
    restore()
  }
}
