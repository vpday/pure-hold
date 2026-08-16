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
  assert.match(formSource, /实际份额/)
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
    assert.match(source, /format="YYYY-MM-DD"/)
    assert.match(source, /value-type="YYYY-MM-DD"/)
    assert.match(source, /<t-input-number/)
    assert.match(source, /<t-form-item/)
    assert.match(source, /label-align="top"/)
    assert.match(source, /disableTransactionDate/)
    assert.match(source, /formatLocalDate\(date\)/)
    assert.match(source, /<section[\s\S]*(净值与费用|到账与费用)/)
    assert.match(source, /可选填写平台返回的实际值/)
    assert.doesNotMatch(source, /<input\b|<details\b|<summary\b/)
    assert.match(source, /toDraftValue\(\$event\)/)
  }
})

test('routes only the buy action into the transaction feature', () => {
  assert.match(actionsSource, /emit\('buy', props\.code\)/)
  assert.match(entrySource, /saveBuyDraft\(props\.portfolio, draft\.draft\)/)
  assert.match(entrySource, /emit\('saved'\)/)
})

test('shows pending, estimated and actual-facing transaction fields in details', () => {
  assert.match(drawerSource, /transactions\.length/)
  assert.match(drawerSource, /transaction\.units\.sourceText/)
  assert.match(drawerSource, /transaction\.unitNav\.sourceText/)
  assert.match(drawerSource, /transaction\.statusText/)
})
