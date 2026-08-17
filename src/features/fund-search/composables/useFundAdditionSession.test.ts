import assert from 'node:assert/strict'
import test from 'node:test'
import { effectScope } from 'vue'

import type { FundAddition } from '@/domains/funds/models/fundAddition'
import { useFundAdditionSession } from './useFundAdditionSession'

test('opens with an existing-code snapshot and submits selected funds without holdings', () => {
  const additions: FundAddition[][] = []
  const ledgerCalls: string[] = []
  const scope = effectScope()
  const session = scope.run(() =>
    useFundAdditionSession(
      (value) => {
        additions.push([...value])
        return {}
      },
      (code) => {
        ledgerCalls.push(code)
        return { ok: true }
      },
    ),
  )!

  const existingCodes = ['000001']
  session.open(existingCodes)
  existingCodes.push('000002')
  session.toggleSelection({ code: '000001', name: '已有基金' })
  session.toggleSelection({ code: '000002', name: '新增基金' })

  assert.equal(session.addWithoutHoldings(), 1)
  assert.deepEqual(additions, [[{ code: '000002', name: '新增基金' }]])
  assert.deepEqual(ledgerCalls, [])
  scope.stop()
})

test('owns holding-step creation, validation and rebuilding', () => {
  const additions: FundAddition[][] = []
  const scope = effectScope()
  const session = scope.run(() =>
    useFundAdditionSession((value) => {
      additions.push([...value])
      return {}
    }),
  )!

  session.open([])
  session.toggleSelection({ code: '000001', name: '一号基金' })
  session.enterHoldings()
  const content = session.model.value.content
  assert.equal(content.step, 'holdings')
  if (content.step !== 'holdings') assert.fail('expected holdings step')
  const draft = content.holdings.drafts[0]!

  assert.equal(session.confirmHoldings(), undefined)
  const invalidContent = session.model.value.content
  assert.equal(invalidContent.step, 'holdings')
  if (invalidContent.step !== 'holdings') assert.fail('expected holdings step')
  assert.deepEqual(Object.keys(invalidContent.holdings.errors), ['000001'])

  Object.assign(draft.holding, {
    costPrice: '1.25',
    dividendMode: 'cash',
    purchaseDate: '2026-07-29',
    units: '10',
  })
  assert.equal(session.confirmHoldings(), 1)
  assert.equal(additions[0]?.[0]?.holding?.costPrice, 1.25)

  session.backToSearch()
  session.enterHoldings()
  const rebuilt = session.model.value.content
  assert.equal(rebuilt.step, 'holdings')
  if (rebuilt.step !== 'holdings') assert.fail('expected holdings step')
  assert.equal(rebuilt.holdings.drafts[0]?.holding.costPrice, '')
  scope.stop()
})

test('saves holdings before automatic ledger setup and exposes an idempotent retry', () => {
  const calls: string[] = []
  let attempts = 0
  const scope = effectScope()
  const session = scope.run(() =>
    useFundAdditionSession(
      (additions) => {
        calls.push(`settings:${additions[0]?.code}`)
        return {}
      },
      (code) => {
        calls.push(`ledger:${code}`)
        attempts += 1
        return attempts === 1
          ? { error: new Error('quota exceeded'), ok: false, retryable: true }
          : { ok: true }
      },
    ),
  )!

  session.open([])
  session.toggleSelection({ code: '000001', name: '一号基金' })
  session.enterHoldings()
  const content = session.model.value.content
  if (content.step !== 'holdings') assert.fail('expected holdings step')
  Object.assign(content.holdings.drafts[0]!.holding, {
    costPrice: '1.25',
    dividendMode: 'cash',
    purchaseDate: '2026-07-29',
    units: '10',
  })

  assert.equal(session.confirmHoldings(), undefined)
  assert.deepEqual(calls, ['settings:000001', 'ledger:000001'])
  assert.equal(session.model.value.actions.step, 'holdings')
  if (session.model.value.actions.step !== 'holdings') assert.fail('expected holdings actions')
  assert.equal(session.model.value.actions.retryLedgerAvailable, true)
  assert.equal(
    session.model.value.content.submitError,
    '基金设置已保存，但投资账本自动建立失败，请重试。',
  )

  assert.equal(session.retryLedger(), 1)
  assert.deepEqual(calls, ['settings:000001', 'ledger:000001', 'ledger:000001'])
  assert.equal(session.model.value.actions.retryLedgerAvailable, false)
  assert.equal(session.model.value.content.submitError, '')
  scope.stop()
})

test('surfaces submission failures and reset clears the complete session', () => {
  const scope = effectScope()
  const session = scope.run(() => useFundAdditionSession(() => ({ error: '保存失败' })))!

  session.open([])
  session.toggleSelection({ code: '000001', name: '一号基金' })
  assert.equal(session.addWithoutHoldings(), undefined)
  assert.equal(session.model.value.content.submitError, '保存失败')

  session.reset()
  assert.equal(session.model.value.step, 'search')
  const actions = session.model.value.actions
  assert.equal(actions.step, 'search')
  if (actions.step !== 'search') assert.fail('expected search actions')
  assert.equal(actions.canSubmit, false)
  assert.equal(session.model.value.content.submitError, '')
  scope.stop()
})
