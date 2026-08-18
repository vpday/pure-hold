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
const transactionSectionSource = await readFile(
  new URL('../fund-detail/components/FundTransactionsSection.vue', import.meta.url),
  'utf8',
)
const ledgerPresenterSource = await readFile(
  new URL('../fund-detail/presenters/toFundLedgerViewModel.ts', import.meta.url),
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

test('keeps transaction facts and recovery inside the portfolio coordinator', () => {
  assert.doesNotMatch(sectionSource, /:ensure-fund-ledger="ensureFundLedger"/)
  assert.match(sectionSource, /portfolioCoordinator\.deleteEvent\(\{/)
  assert.match(sectionSource, /:portfolio-coordinator="props\.portfolioCoordinator"/)
  assert.doesNotMatch(sectionSource, /:enable-ledger=/)
  assert.doesNotMatch(sectionSource, /portfolioCoordinator\.enableFund\(\{/)
  assert.match(sectionSource, /:portfolio-revision="portfolioRevision"/)
  assert.match(sectionSource, /@saved="handleTransactionSaved"/)
  assert.match(sectionSource, /@edit-transaction="editTransaction"/)
  assert.match(sectionSource, /@delete-transaction="deleteTransaction"/)
  assert.match(sectionSource, /@record-buy="openBuy"/)
  assert.match(sectionSource, /@record-sell="openSell"/)
  assert.match(detailEntrySource, /portfolioRevision/)
  assert.match(detailEntrySource, /portfolioCoordinator: PortfolioCoordinator/)
  assert.match(detailEntrySource, /props\.portfolioCoordinator\.getFundLedgerState\(/)
  assert.match(detailEntrySource, /props\.portfolioCoordinator\.rebuildHoldingProjections\(/)
  assert.match(detailEntrySource, /toLedgerRecordViewModels/)
  assert.doesNotMatch(detailEntrySource, /handleEnableLedger|@enable-ledger/)
  assert.match(detailDrawerSource, /ledger: FundLedgerViewModel/)
  assert.match(detailDrawerSource, /retryAvailable/)
  assert.doesNotMatch(detailDrawerSource, /启用账本|enableLedger/)
  assert.match(detailEntrySource, /FundTransactionsSection/)
  assert.doesNotMatch(detailDrawerSource, /FundTransactionsSection/)
  assert.match(transactionSectionSource, /ledger: FundLedgerViewModel/)
  assert.match(transactionSectionSource, /<t-table/)
  assert.doesNotMatch(transactionSectionSource, /<table\b/)
  assert.match(transactionSectionSource, /submittedAtText/)
  assert.match(transactionSectionSource, /<t-popconfirm/)
  assert.match(transactionSectionSource, /记录买入/)
  assert.match(transactionSectionSource, /记录卖出/)
  assert.match(transactionSectionSource, /row\.canEdit/)
  assert.match(transactionSectionSource, /row\.canDelete/)
  assert.match(transactionSectionSource, /row\.costBasisLabel/)
  assert.match(ledgerPresenterSource, /移动平均成本/)
  for (const label of ['期初持仓', '买入', '卖出', '现金分红', '红利再投资', '手工修正']) {
    assert.match(ledgerPresenterSource, new RegExp(label))
  }
  assert.doesNotMatch(
    detailEntrySource + detailDrawerSource + transactionSectionSource,
    /toRemainingBatchViewModels|initialHoldingDatesByEventId|remainingBatches|sellAllocations|FIFO/,
  )
})

test('uses transaction records as the detail section and keeps status in the ledger panel', () => {
  assert.match(detailDrawerSource, /label: '成交记录'/)
  assert.match(
    detailDrawerSource,
    /id="fund-detail-transactions"[\s\S]*<slot name="transactions" \/>/,
  )
  assert.match(transactionSectionSource, />成交记录<\/h2>/)
  assert.match(transactionSectionSource, /empty="暂无成交记录"/)
  assert.doesNotMatch(transactionSectionSource, /<section\b/)
  assert.match(detailDrawerSource, /ledger\.statusText/)
  assert.match(detailDrawerSource, /ledger\.statusTone/)
  assert.match(detailDrawerSource, /ledger\.partialPersistence/)
  assert.doesNotMatch(
    detailDrawerSource + transactionSectionSource,
    /账本记录|账本汇总|聚合持仓与收益|持仓对账/,
  )
  assert.doesNotMatch(transactionSectionSource, /ledger\.summary|ledger\.difference/)
})

test('keeps the detail drawer open while launching transaction actions', () => {
  for (const handler of ['editTransaction', 'deleteTransaction', 'recordBuy', 'recordSell']) {
    const handlerSource = detailEntrySource.match(
      new RegExp(`function ${handler}\\([\\s\\S]*?\\n\\}`),
    )?.[0]
    assert.ok(handlerSource, `missing ${handler} handler`)
    assert.doesNotMatch(handlerSource, /close\(\)/)
  }
})
