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
const drawerSource = await readFile(
  new URL('../fund-detail/components/FundDetailDrawer.vue', import.meta.url),
  'utf8',
)

test('provides desktop dialog and mobile drawer entry surfaces', () => {
  assert.match(entrySource, /<t-dialog[\s\S]*v-if="isSmUp"/)
  assert.match(entrySource, /<t-drawer[\s\S]*v-else/)
  assert.match(entrySource, /calc\(100vw - 32px\)/)
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
    assert.match(source, /enable-time-picker/)
    assert.match(source, /format="YYYY-MM-DD HH:mm"/)
    assert.match(source, /value-type="YYYY-MM-DD HH:mm"/)
    assert.match(source, /<t-tabs/)
    assert.match(source, /待确认/)
    assert.match(source, /历史补录/)
    assert.match(source, /<t-descriptions/)
    assert.match(source, /<t-alert/)
    assert.match(source, /<t-input-number/)
    assert.match(source, /<t-form-item/)
    assert.match(source, /label-align="top"/)
    assert.doesNotMatch(source, /<input\b|<details\b|<summary\b/)
    assert.match(source, /toDraftValue\(\$event\)/)
    assert.doesNotMatch(source, /actualUnitNav|actualNetAmountYuan|purchaseFeePercent/)
  }
})

test('routes buy and sell actions into the transaction feature', () => {
  assert.match(actionsSource, /emit\('buy', props\.code\)/)
  assert.match(actionsSource, /emit\('sell', props\.code\)/)
  assert.match(entrySource, /saveBuyDraft\(props\.portfolio, draft\)/)
  assert.match(entrySource, /saveSellDraft\(props\.portfolio, draft\)/)
  assert.match(entrySource, /emit\('saved'\)/)
})

test('shows transaction provenance and edit/delete operations in details', () => {
  assert.match(drawerSource, /transactions\.length/)
  assert.match(drawerSource, /transaction\.submittedAtText/)
  assert.match(drawerSource, /transaction\.navDateText/)
  assert.match(drawerSource, /transaction\.units\.sourceText/)
  assert.match(drawerSource, /transaction\.unitNav\.sourceText/)
  assert.match(drawerSource, /transaction\.statusText/)
  assert.match(drawerSource, /<t-popconfirm/)
  assert.match(drawerSource, /emit\('editTransaction', transaction\.id\)/)
  assert.match(drawerSource, /emit\('deleteTransaction', transaction\.id\)/)
})
