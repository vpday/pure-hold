import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const source = await readFile(new URL('./SettingsEntry.vue', import.meta.url), 'utf8')
const transferSource = await readFile(
  new URL('./components/SettingsTransferPanel.vue', import.meta.url),
  'utf8',
)

test('forwards refresh preference updates from SettingsContent to the draft', () => {
  assert.equal((source.match(/@update:model-value="updateDraft"/g) ?? []).length, 2)
  assert.doesNotMatch(source, /@update-model-value=/)
})

test('renders import selection in a dialog and overwrite confirmation as a popconfirm', () => {
  assert.match(transferSource, /<t-dialog[\s\S]*header="配置恢复"/)
  assert.match(transferSource, /已读取配置，请选择要恢复的分区/)
  assert.match(transferSource, /<t-dialog[\s\S]*v-if="importState"[\s\S]*:visible="true"/)
  assert.match(transferSource, /<t-popconfirm[\s\S]*:content="overwriteMessage"/)
  assert.match(transferSource, /:popup-props="\{ attach: 'body', zIndex: 2700 \}"/)
  assert.doesNotMatch(source, /header="确认覆盖配置"/)
})

test('exposes portfolio transfer selection and explicit recovery modes', () => {
  assert.match(transferSource, /投资账本（交易、分红、修正）/)
  assert.match(transferSource, /合并：保留现有记录，相同稳定 ID 内容一致时幂等/)
  assert.match(transferSource, /显式替换：先备份现有账本，失败时尝试恢复/)
  assert.match(source, /portfolio: props\.portfolio\.getPortfolio\(\)/)
  assert.match(source, /new Set\(fundStore\.fundOrder\)/)
})

test('uses separate backup and restore sections', () => {
  assert.match(transferSource, /id="settings-backup-heading"[^>]*>配置备份<\/h3>/)
  assert.match(transferSource, /id="settings-restore-heading"[^>]*>配置恢复<\/h3>/)
  assert.doesNotMatch(transferSource, /配置备份与恢复/)
})

test('uses explicit footer actions for settings dialog and overwrite popconfirm', () => {
  assert.match(source, /:confirm-btn="\{[\s\S]*content: '确认'[\s\S]*variant: 'base'/)
  assert.match(source, /:cancel-btn="\{[\s\S]*content: '取消'[\s\S]*variant: 'outline'/)
  assert.match(transferSource, /:confirm-btn="\{ content: '确认', variant: 'base' \}"/)
  assert.match(transferSource, /:cancel-btn="\{ content: '取消', variant: 'outline' \}"/)
  assert.match(transferSource, /@confirm="emit\('commitImport'\)"/)
  assert.match(source, /disabled: !isDirty/)
})
