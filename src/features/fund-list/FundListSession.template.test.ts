import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const sectionSource = await readFile(new URL('./FundListSection.vue', import.meta.url), 'utf8')
const desktopSource = await readFile(
  new URL('./components/FundDesktopTable.vue', import.meta.url),
  'utf8',
)
const mobileSource = await readFile(
  new URL('./components/FundMobileList.vue', import.meta.url),
  'utf8',
)
const quoteCardSource = await readFile(
  new URL('./components/FundQuoteCard.vue', import.meta.url),
  'utf8',
)
const actionsSource = await readFile(
  new URL('./components/FundActions.vue', import.meta.url),
  'utf8',
)
const detailEntrySource = await readFile(
  new URL('../fund-detail/FundDetailEntry.vue', import.meta.url),
  'utf8',
)
const detailDrawerSource = await readFile(
  new URL('../fund-detail/components/FundDetailDrawer.vue', import.meta.url),
  'utf8',
)

test('feeds the same session-owned rows to desktop and mobile views', () => {
  assert.equal(sectionSource.match(/:rows="model\.rows"/g)?.length, 2)
  assert.doesNotMatch(sectionSource, /baseRows|sortFundRows|sortByCategory/)
})

test('keeps the desktop table as a controlled sort intent adapter', () => {
  assert.match(desktopSource, /:data="rows"/)
  assert.match(desktopSource, /sorter: true/)
  assert.match(desktopSource, /table-content-width="1380px"/)
  assert.doesNotMatch(desktopSource, /tableRows|data-change|sortFundRows|moveMissingFundRowsLast/)
})

test('keeps the mobile sort footer visible with its draft actions', () => {
  assert.match(mobileSource, /<template #footer>[\s\S]*恢复默认[\s\S]*取消[\s\S]*确定/)
  assert.match(mobileSource, /@click="resetSort"/)
  assert.match(mobileSource, /@click="confirmSort"/)
  assert.match(mobileSource, /pb-\[env\(safe-area-inset-bottom\)\]/)
  assert.doesNotMatch(mobileSource, /:footer="false"/)
})

test('uses TDesign text buttons for fund navigation and detail tabs', () => {
  assert.match(desktopSource, /fund-name-button[\s\S]*@click="emit\('detail', row\.code\)"/)
  assert.match(quoteCardSource, /<span class="block font-medium">\{\{ row\.name \}\}<\/span>/)
  assert.doesNotMatch(desktopSource, /<button\b[\s\S]*fund-name-button/)
  assert.doesNotMatch(quoteCardSource, /<button\b[\s\S]*emit\('detail'/)
  assert.doesNotMatch(detailDrawerSource, /role="tab"/)
})

test('keeps only ordinary fund actions in desktop and mobile menus', () => {
  assert.doesNotMatch(sectionSource, /@plan=|openPlan/)
  assert.doesNotMatch(desktopSource, /value === 'plan'|emit\('plan'/)
  assert.doesNotMatch(actionsSource, /value: 'plan'|emit\('plan'/)
  assert.doesNotMatch(quoteCardSource, /@plan=|emit\('plan'/)
  assert.doesNotMatch(mobileSource, /@plan=|emit\('plan'/)
  assert.match(actionsSource, /<t-dropdown/)
  assert.doesNotMatch(quoteCardSource, /actionsVisible/)
})

test('uses the portfolio coordinator for a counted second deletion confirmation', () => {
  assert.match(sectionSource, /prepareFundDeletion\(code\)/)
  assert.match(sectionSource, /confirmFundDeletion\(preview\)/)
  assert.match(sectionSource, /交易事件总数/)
  assert.match(sectionSource, /分红事件（现金 \/ 再投资）/)
  assert.match(sectionSource, /修正事件/)
  assert.doesNotMatch(sectionSource, /planCount|installmentCount/)
  assert.match(sectionSource, /删除后不可恢复/)
  assert.match(sectionSource, /@cancel="cancelFundDeletion"/)
  assert.match(sectionSource, /@confirm="confirmFundDeletion"/)
  assert.doesNotMatch(sectionSource, /store\.deleteFund\(code\)/)
  assert.doesNotMatch(desktopSource, /<t-popconfirm/)
})

test('exposes the existing portfolio coordinator through the fund detail ledger entry', () => {
  assert.match(sectionSource, /:enable-ledger="enableLedger"/)
  assert.match(sectionSource, /portfolioCoordinator\.enableFund\(\{/)
  assert.match(detailEntrySource, /@enable-ledger="handleEnableLedger"/)
  assert.match(detailEntrySource, /ledgerEnabled\.value = props\.portfolio\.getPortfolio\(\)/)
  assert.match(detailDrawerSource, /ledgerEnabled: boolean/)
  assert.match(detailDrawerSource, /启用账本/)
})
