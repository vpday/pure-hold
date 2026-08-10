import assert from 'node:assert/strict'
import test from 'node:test'

import { MemoryStorage } from '../testing/browserStorageTestSupport.ts'
import { createBrowserStorageAdapter } from './browserStorageAdapter.ts'

test('reads found and missing values from the current storage provider', () => {
  let storage: Storage | undefined = new MemoryStorage([['key', 'first']])
  const adapter = createBrowserStorageAdapter(() => storage)

  assert.deepEqual(adapter.read('key'), { status: 'found', value: 'first' })
  assert.deepEqual(adapter.read('missing'), { status: 'missing' })

  storage = new MemoryStorage([['key', 'second']])
  assert.deepEqual(adapter.read('key'), { status: 'found', value: 'second' })
})

test('reports unavailable, provider and read failures without throwing', () => {
  const unavailable = createBrowserStorageAdapter(() => undefined).read('key')
  assert.equal(unavailable.status, 'failed')
  if (unavailable.status === 'failed') {
    assert.match(String(unavailable.error), /localStorage is unavailable/)
  }

  const providerError = new Error('provider failed')
  assert.deepEqual(
    createBrowserStorageAdapter(() => {
      throw providerError
    }).read('key'),
    { status: 'failed', error: providerError },
  )

  const storage = new MemoryStorage()
  storage.readError = new Error('read failed')
  assert.deepEqual(createBrowserStorageAdapter(() => storage).read('key'), {
    status: 'failed',
    error: storage.readError,
  })
})

test('writes values and preserves provider or storage failures', () => {
  const storage = new MemoryStorage()
  const adapter = createBrowserStorageAdapter(() => storage)
  assert.deepEqual(adapter.write('key', 'value'), { ok: true })
  assert.equal(storage.getItem('key'), 'value')

  const writeError = new Error('write failed')
  storage.writeError = writeError
  assert.deepEqual(adapter.write('key', 'next'), { ok: false, error: writeError })

  const providerError = new Error('provider failed')
  assert.deepEqual(
    createBrowserStorageAdapter(() => {
      throw providerError
    }).write('key', 'value'),
    { ok: false, error: providerError },
  )

  const unavailable = createBrowserStorageAdapter(() => undefined).write('key', 'value')
  assert.equal(unavailable.ok, false)
  if (!unavailable.ok) {
    assert.match(String(unavailable.error), /localStorage is unavailable/)
  }
})

test('persistence requests are optional and ignore synchronous or asynchronous failures', async () => {
  const storage = new MemoryStorage()
  createBrowserStorageAdapter(() => storage).requestPersistence()
  createBrowserStorageAdapter(
    () => storage,
    () => {
      throw new Error('synchronous failure')
    },
  ).requestPersistence()
  createBrowserStorageAdapter(
    () => storage,
    () => Promise.reject(new Error('asynchronous failure')),
  ).requestPersistence()

  await Promise.resolve()
})
