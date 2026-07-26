import assert from 'node:assert/strict'
import test from 'node:test'

import { requestGlobalRefresh, subscribeGlobalRefresh } from './globalRefreshCoordinator.ts'

test('global refresh subscribes once and cancellation is idempotent', async () => {
  let calls = 0
  const observer = async () => {
    calls += 1
  }
  const firstCancel = subscribeGlobalRefresh(observer)
  subscribeGlobalRefresh(observer)
  await requestGlobalRefresh()
  assert.equal(calls, 1)
  firstCancel()
  firstCancel()
  await requestGlobalRefresh()
  assert.equal(calls, 1)
})

test('global refresh waits in parallel and isolates rejected observers', async () => {
  const order: string[] = []
  let releaseSlow: () => void = () => {}
  const slow = new Promise<void>((resolve) => {
    releaseSlow = resolve
  })
  const cancelSlow = subscribeGlobalRefresh(async () => {
    order.push('slow-start')
    await slow
    order.push('slow-end')
  })
  const cancelRejected = subscribeGlobalRefresh(async () => {
    order.push('rejected')
    throw new Error('expected')
  })
  const refresh = requestGlobalRefresh()
  await Promise.resolve()
  assert.deepEqual(order, ['slow-start', 'rejected'])
  releaseSlow()
  await refresh
  assert.deepEqual(order, ['slow-start', 'rejected', 'slow-end'])
  cancelSlow()
  cancelRejected()
})

test('global refresh also isolates an observer that throws synchronously', async () => {
  let completed = false
  const cancelThrowing = subscribeGlobalRefresh((() => {
    throw new Error('expected')
  }) as () => Promise<void>)
  const cancelCompleted = subscribeGlobalRefresh(async () => {
    completed = true
  })
  await requestGlobalRefresh()
  assert.equal(completed, true)
  cancelThrowing()
  cancelCompleted()
})
