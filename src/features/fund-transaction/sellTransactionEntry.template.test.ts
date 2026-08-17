import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

async function readFeatureFile(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('sell entry exposes a separate sell flow without changing the buy form contract', async () => {
  const source = await readFeatureFile('./FundTransactionEntry.vue')

  assert.match(source, /openSell/)
  assert.match(source, /saveSellDraft/)
  assert.match(source, /FundSellForm/)
  assert.match(source, /记录卖出/)
})

test('fund list routes sell actions on desktop and mobile', async () => {
  const [section, actions, desktop, mobile, quoteCard] = await Promise.all([
    readFeatureFile('../fund-list/FundListSection.vue'),
    readFeatureFile('../fund-list/components/FundActions.vue'),
    readFeatureFile('../fund-list/components/FundDesktopTable.vue'),
    readFeatureFile('../fund-list/components/FundMobileList.vue'),
    readFeatureFile('../fund-list/components/FundQuoteCard.vue'),
  ])

  assert.match(section, /@sell="openSell"/)
  assert.match(actions, /sell: \[code: string\]/)
  assert.match(actions, /emit\('sell', props\.code\)/)
  assert.match(actions, /value: 'sell'/)
  assert.match(desktop, /value === 'sell'/)
  assert.match(desktop, /emit\('sell', code\)/)
  assert.match(mobile, /@sell="emit\('sell', \$event\)"/)
  assert.match(quoteCard, /@sell="emit\('sell', \$event\)"/)
})

test('fund detail exposes average-cost sell facts without FIFO outputs', async () => {
  const source = await readFile(
    new URL('../fund-detail/components/FundTransactionsSection.vue', import.meta.url),
    'utf8',
  )

  assert.match(source, /row\.kind === 'sell'/)
  assert.match(source, /row\.costBasisAmount/)
  assert.match(source, /realizedGainStatusText/)
  assert.doesNotMatch(source, /remainingBatches|allocations|FIFO/)
})
