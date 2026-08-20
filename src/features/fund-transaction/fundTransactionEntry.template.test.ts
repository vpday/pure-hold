import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const entrySource = await readFile(new URL('./FundTransactionEntry.vue', import.meta.url), 'utf8')
const formSource = await readFile(new URL('./components/FundBuyForm.vue', import.meta.url), 'utf8')
const sellFormSource = await readFile(
  new URL('./components/FundSellForm.vue', import.meta.url),
  'utf8',
)
const actionsSource = await readFile(
  new URL('../fund-list/components/FundActions.vue', import.meta.url),
  'utf8',
)
const transactionSectionSource = await readFile(
  new URL('../fund-detail/components/FundTransactionsSection.vue', import.meta.url),
  'utf8',
)

test('provides desktop dialog and mobile drawer entry surfaces', () => {
  assert.match(entrySource, /<t-dialog[\s\S]*v-if="isSmUp"/)
  assert.match(entrySource, /<t-drawer[\s\S]*v-else/)
  assert.match(entrySource, /calc\(100vw - 32px\)/)
  assert.match(
    entrySource,
    /fund-transaction-dialog \.t-dialog__body[\s\S]*@apply max-h-\[calc\(100dvh-176px\)\] overflow-y-auto scrollbar-none/,
  )
  assert.match(entrySource, /fund-transaction-mobile-content[\s\S]*overflow-y-auto/)
  assert.match(formSource, /含费总额/)
  assert.match(formSource, /实际确认日期/)
  assert.match(formSource, /确认份额/)
  assert.match(formSource, /<t-tag[\s\S]*只记录本地买入信息，不会提交真实交易。[\s\S]*<section/)
  assert.match(sellFormSource, /<t-tag[\s\S]*只记录本地卖出信息，不会提交真实交易。[\s\S]*<section/)
})

test('keeps one shared confirmation footer for each transaction surface', () => {
  assert.equal(entrySource.match(/<template #footer>/g)?.length, 2)
  assert.match(entrySource, /saveCurrentTransaction/)
  assert.doesNotMatch(entrySource, /@cancel="close"/)
  assert.match(formSource, /<t-form[\s\S]*@submit="handleSubmit"/)
  assert.match(sellFormSource, /<t-form[\s\S]*@submit="handleSubmit"/)
  assert.doesNotMatch(formSource, /@cancel|保存买入/)
  assert.doesNotMatch(sellFormSource, /@cancel|保存卖出/)
})

test('uses TDesign controls while preserving the transaction value contract', () => {
  for (const source of [formSource, sellFormSource]) {
    assert.match(source, /<t-date-picker/)
    assert.doesNotMatch(source, /enable-time-picker/)
    assert.match(source, /format="YYYY-MM-DD"/)
    assert.match(source, /value-type="YYYY-MM-DD"/)
    assert.match(source, /<t-radio-group/)
    assert.match(source, /15:00 前/)
    assert.match(source, /15:00 后/)
    assert.match(source, /<t-tabs/)
    assert.match(source, /待确认/)
    assert.match(source, /历史补录/)
    assert.match(source, /<t-descriptions/)
    assert.match(source, /<t-alert/)
    assert.match(source, /<t-input-number/)
    assert.match(source, /<t-form-item/)
    assert.match(source, /label-align="top"/)
    assert.doesNotMatch(source, /<input\b|<details\b|<summary\b/)
    assert.match(source, /@change="updateSubmissionDate"/)
    assert.match(source, /@change="updateTransactionSession"/)
    assert.doesNotMatch(source, /actualUnitNav|actualNetAmountYuan|purchaseFeePercent/)
  }
})

test('does not warn when the submission date is today', () => {
  for (const source of [formSource, sellFormSource]) {
    assert.match(
      source,
      /const showMissingNavWarning = computed\([\s\S]*props\.navStatus === 'missing'[\s\S]*submissionDate\.value !== getShanghaiDate\(\)/,
    )
    assert.match(source, /<div v-if="navError \|\| showMissingNavWarning"/)
  }
})

test('routes buy and sell actions into the transaction feature', () => {
  assert.match(actionsSource, /emit\('buy', props\.code\)/)
  assert.match(actionsSource, /emit\('sell', props\.code\)/)
  assert.match(entrySource, /saveBuyDraft\(props\.portfolioCoordinator, draft\)/)
  assert.match(entrySource, /saveSellDraft\(props\.portfolioCoordinator, draft\)/)
  assert.match(entrySource, /emit\('saved'\)/)
})

test('shows transaction provenance and edit/delete operations in details', () => {
  assert.match(transactionSectionSource, /:data="transactions"/)
  assert.match(transactionSectionSource, /row\.submittedAtText/)
  assert.match(transactionSectionSource, /row\.navDateText/)
  assert.match(transactionSectionSource, /v-if="row\.amountLabel"/)
  assert.match(transactionSectionSource, /v-if="row\.feeLabel"/)
  assert.match(transactionSectionSource, /v-if="row\.costBasisLabel"/)
  assert.doesNotMatch(
    transactionSectionSource,
    /#result|realizedGain|realizedGainStatusText|resultText|issueText/,
  )
  assert.match(transactionSectionSource, /row\.statusText/)
  assert.match(transactionSectionSource, /<t-popconfirm/)
  assert.match(transactionSectionSource, /emit\('editTransaction', row\.id\)/)
  assert.match(transactionSectionSource, /emit\('deleteTransaction', row\.id\)/)
})
