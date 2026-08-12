import assert from 'node:assert/strict'
import test from 'node:test'

import { createSharedRequestPool } from './createSharedRequestPool.ts'

test('shares one operation between subscribers with the same key', async () => {
  const operation = deferred<number>()
  let starts = 0
  const pool = createSharedRequestPool<string, number>()
  const start = async () => {
    starts += 1
    return await operation.promise
  }

  const first = pool.request('fund', undefined, start)
  const second = pool.request('fund', undefined, start)
  assert.equal(starts, 1)
  assert.equal(pool.hasPending('fund'), true)

  operation.resolve(42)
  assert.deepEqual(await Promise.all([first, second]), [42, 42])
  assert.equal(pool.hasPending('fund'), false)
})

test('cancels subscribers independently and aborts when the last subscriber leaves', async () => {
  const oldOperation = deferred<number>()
  const signals: AbortSignal[] = []
  const pool = createSharedRequestPool<string, number>()
  const firstController = new AbortController()
  const secondController = new AbortController()
  const start = async (signal: AbortSignal) => {
    signals.push(signal)
    return await oldOperation.promise
  }

  const first = pool.request('fund', firstController.signal, start)
  const second = pool.request('fund', secondController.signal, start)
  firstController.abort()
  await assert.rejects(first, { name: 'AbortError' })
  assert.equal(signals[0]?.aborted, false)

  secondController.abort()
  await assert.rejects(second, { name: 'AbortError' })
  assert.equal(signals[0]?.aborted, true)
  assert.equal(pool.hasPending('fund'), false)

  const nextOperation = deferred<number>()
  const next = pool.request('fund', undefined, async () => await nextOperation.promise)
  oldOperation.resolve(1)
  assert.equal(pool.hasPending('fund'), true)
  nextOperation.resolve(2)
  assert.equal(await next, 2)
})

test('broadcasts failures and permits a retry after settlement', async () => {
  let starts = 0
  const pool = createSharedRequestPool<string, number>()
  const start = async () => {
    starts += 1
    if (starts === 1) throw new Error('failed')
    return 7
  }

  const first = pool.request('fund', undefined, start)
  const second = pool.request('fund', undefined, start)
  await assert.rejects(first, /failed/)
  await assert.rejects(second, /failed/)
  assert.equal(await pool.request('fund', undefined, start), 7)
  assert.equal(starts, 2)
})

test('aborts all pending work and rejects new requests after disposal', async () => {
  const signals: AbortSignal[] = []
  const pool = createSharedRequestPool<string, number>()
  const start = async (signal: AbortSignal) => {
    signals.push(signal)
    return await new Promise<number>(() => undefined)
  }

  const first = pool.request('first', undefined, start)
  const second = pool.request('second', undefined, start)
  pool.abortPending()
  await assert.rejects(first, { name: 'AbortError' })
  await assert.rejects(second, { name: 'AbortError' })
  assert.equal(
    signals.every((signal) => signal.aborted),
    true,
  )

  const third = pool.request('third', undefined, start)
  pool.dispose()
  await assert.rejects(third, { name: 'AbortError' })
  await assert.rejects(pool.request('fourth', undefined, start), /disposed/)
})

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}
