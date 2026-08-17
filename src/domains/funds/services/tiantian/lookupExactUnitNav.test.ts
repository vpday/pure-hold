import assert from 'node:assert/strict'
import test from 'node:test'

import { lookupExactUnitNav } from './lookupExactUnitNav.ts'

test('returns only the valid unit NAV from the exact requested date', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  const requested: { url?: URL; signal?: AbortSignal } = {}
  globalThis.fetch = async (input, init) => {
    requested.url = new URL(input.toString())
    requested.signal = init?.signal ?? undefined
    return Response.json(
      successful([
        { FSRQ: '2026-08-13', DWJZ: 2, LJJZ: 2 },
        { FSRQ: '2026-08-14', DWJZ: 2.05, LJJZ: 2.1 },
        { FSRQ: '2026-08-15', DWJZ: 2.2, LJJZ: 2.2 },
      ]),
    )
  }

  const controller = new AbortController()
  const result = await lookupExactUnitNav('161725', '2026-08-14', controller.signal)

  assert.deepEqual(result, {
    date: '2026-08-14',
    source: 'nav-history',
    unitNav: 2.05,
  })
  assert.equal(requested.url?.searchParams.get('FCODE'), '161725')
  assert.equal(requested.url?.searchParams.get('RANGE'), 'ln')
  assert.equal(requested.signal, controller.signal)
})

test('does not shift a non-trading date to a neighboring history point', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = async () =>
    Response.json(
      successful([
        { FSRQ: '2026-08-13', DWJZ: 2 },
        { FSRQ: '2026-08-15', DWJZ: 2.2 },
      ]),
    )

  const result = await lookupExactUnitNav('161725', '2026-08-14')

  assert.equal(result, null)
})

test('keeps an invalid or missing exact-date unit NAV pending', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = async () => Response.json(successful([{ FSRQ: '2026-08-14', DWJZ: null }]))

  const result = await lookupExactUnitNav('161725', '2026-08-14')

  assert.equal(result, null)
})

test('does not query current-day or future NAV dates', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return Response.json(successful([]))
  }

  const today = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((values, part) => {
      values[part.type] = part.value
      return values
    }, {})
  const currentDate = `${today.year}-${today.month}-${today.day}`

  assert.equal(await lookupExactUnitNav('161725', currentDate), null)
  assert.equal(await lookupExactUnitNav('161725', '2099-01-01'), null)
  assert.equal(calls, 0)
})

test('uses the history adapter duplicate-date rule deterministically', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = async () =>
    Response.json(
      successful([
        { FSRQ: '2026-08-14', DWJZ: 2.01 },
        { FSRQ: '2026-08-14', DWJZ: 2.02 },
      ]),
    )

  const result = await lookupExactUnitNav('161725', '2026-08-14')

  assert.equal(result?.unitNav, 2.01)
})

test('propagates network and cancellation failures without inventing a value', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  const controller = new AbortController()
  const failure = new Error('history unavailable')
  globalThis.fetch = async () => {
    throw failure
  }
  await assert.rejects(lookupExactUnitNav('161725', '2026-08-14', controller.signal), failure)

  const cancellationController = new AbortController()
  globalThis.fetch = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('aborted', 'AbortError')),
        { once: true },
      )
    })
  const request = lookupExactUnitNav('161725', '2026-08-14', cancellationController.signal)
  cancellationController.abort()
  await assert.rejects(request, {
    name: 'AbortError',
  })
})

function successful(data: readonly unknown[]): unknown {
  return { data, errorCode: 0, expansion: [], success: true, totalCount: data.length }
}
