import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const formSource = await readFile(new URL('./components/FundPlanForm.vue', import.meta.url), 'utf8')
const entrySource = await readFile(new URL('./FundPlanEntry.vue', import.meta.url), 'utf8')
const desktopShellSource = await readFile(
  new URL('./components/FundPlanDesktopDialog.vue', import.meta.url),
  'utf8',
)
const mobileShellSource = await readFile(
  new URL('./components/FundPlanMobileDrawer.vue', import.meta.url),
  'utf8',
)
const detailSource = await readFile(
  new URL('../fund-detail/components/FundDetailDrawer.vue', import.meta.url),
  'utf8',
)
const editEntrySource = await readFile(
  new URL('../fund-edit/FundEditEntry.vue', import.meta.url),
  'utf8',
)

test('exposes plan editing and non-payment execution wording', () => {
  assert.match(formSource, /每期含费总额/)
  assert.match(formSource, /本地生成待处理记录/)
  assert.match(entrySource, /只记录本地定投计划，不会自动扣款或访问基金平台。/)
  assert.equal(entrySource.match(/>\s*暂停\s*<\/t-button>/g)?.length, 2)
  assert.equal(entrySource.match(/>\s*恢复\s*<\/t-button>/g)?.length, 2)
  assert.equal(entrySource.match(/>删除<\/t-button>/g)?.length, 2)
  assert.doesNotMatch(formSource, /添加定投计划/)
  assert.doesNotMatch(formSource, /暂停计划|恢复计划|删除计划/)
  assert.match(entrySource, /submitPortfolioPlanDraft/)
  assert.match(entrySource, /defineExpose\(\{ open \}\)/)
  assert.match(formSource, /standalone\?: boolean/)
  assert.match(entrySource, /standalone/)
  assert.doesNotMatch(editEntrySource, /FundPlanForm|submitPortfolioPlanDraft/)
})

test('uses one plan title and one final save action across both surfaces', () => {
  assert.equal(entrySource.match(/<template #footer>/g)?.length, 2)
  assert.equal(desktopShellSource.match(/<template #footer>/g)?.length, 1)
  assert.equal(mobileShellSource.match(/<template #footer>/g)?.length, 1)
  assert.match(entrySource, /ref="planForm"/)
  assert.match(entrySource, /async function submitPlan\(\): Promise<void>/)
  assert.match(entrySource, /@click="submitPlan"/)
  assert.match(formSource, /async function submit\(\): Promise<void>/)
  assert.match(formSource, /<t-form[\s\S]*@submit="handleSubmit"/)
  assert.match(formSource, /defineExpose\(\{ submit, validate \}\)/)
  assert.match(formSource, /<t-form-item/)
  assert.match(formSource, /<t-radio-group/)
  assert.match(formSource, /<t-input-number/)
  assert.match(formSource, /<t-date-picker/)
  assert.match(formSource, /value instanceof Date/)
  assert.match(formSource, /formatLocalDate\(date\)/)
  assert.doesNotMatch(formSource, /保存定投计划/)
  assert.doesNotMatch(formSource, /<t-tag v-if="plan"/)
  assert.equal(entrySource.match(/<t-tag v-if="plan" size="small" variant="light">/g)?.length, 2)
  assert.doesNotMatch(formSource, /<h3[^>]*>定投计划/)
  assert.doesNotMatch(mobileShellSource, /:footer="false"/)
  assert.match(mobileShellSource, /fund-plan-mobile-footer/)
})

test('shows separate recent and plan tabs with installment actions', () => {
  assert.match(detailSource, /最近成交/)
  assert.match(detailSource, /定投计划/)
  assert.match(detailSource, /处理本期/)
  assert.match(detailSource, /跳过/)
  assert.match(detailSource, /取消/)
})
