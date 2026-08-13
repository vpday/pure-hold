import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import {
  installIntervalTestDouble,
  installVisibilityDocument,
} from '@/shared/testing/pollingTestSupport.ts'
import { useIndexQuotesStore } from './useIndexQuotesStore.ts'

test('index polling restores its timer without refreshing when visibility returns', async () => {
  const documentFake = installVisibilityDocument()
  const intervalFake = installIntervalTestDouble()
  const originalFetch = globalThis.fetch
  let fetchCalls = 0
  globalThis.fetch = async () => {
    fetchCalls += 1
    return new Response('{}', { status: 200 })
  }

  setActivePinia(createPinia())
  const store = useIndexQuotesStore()
  try {
    await store.refresh()
    assert.equal(fetchCalls, 1)

    store.startPolling()
    assert.equal(fetchCalls, 1)
    assert.equal(intervalFake.callbacks.length, 1)

    documentFake.setHidden(true)
    documentFake.dispatch()
    documentFake.setHidden(false)
    documentFake.dispatch()
    await Promise.resolve()

    assert.equal(fetchCalls, 1)
    assert.equal(intervalFake.callbacks.length, 2)
    assert.equal(intervalFake.clearCount, 1)

    intervalFake.callbacks.at(-1)?.()
    await Promise.resolve()
    assert.equal(fetchCalls, 2)
  } finally {
    store.stopPolling()
    store.$dispose()
    globalThis.fetch = originalFetch
    intervalFake.restore()
    documentFake.restore()
  }
})

test('index polling does not refresh or schedule a timer when disabled', async () => {
  const documentFake = installVisibilityDocument()
  const intervalFake = installIntervalTestDouble()
  const originalFetch = globalThis.fetch
  let fetchCalls = 0
  globalThis.fetch = async () => {
    fetchCalls += 1
    return new Response('{}', { status: 200 })
  }

  setActivePinia(createPinia())
  const store = useIndexQuotesStore()
  try {
    store.setPollingConfiguration({ enabled: false, intervalMs: 10_000 })
    store.startPolling()
    documentFake.setHidden(true)
    documentFake.dispatch()
    documentFake.setHidden(false)
    documentFake.dispatch()
    await Promise.resolve()

    assert.equal(fetchCalls, 0)
    assert.equal(intervalFake.callbacks.length, 0)
  } finally {
    store.stopPolling()
    store.$dispose()
    globalThis.fetch = originalFetch
    intervalFake.restore()
    documentFake.restore()
  }
})
