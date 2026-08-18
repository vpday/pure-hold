<script setup lang="ts">
import { computed, ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useAppSettingsStore } from '@/app/settings/stores/useAppSettingsStore.ts'
import {
  parseConfigurationTransfer,
  serializeConfigurationTransfer,
} from '@/app/settings/transfer/configurationTransfer.ts'
import { createConfigurationTransferCoordinator } from '@/app/settings/transfer/configurationTransferCoordinator.ts'
import { createPortfolioTransferAdapter } from '@/app/settings/transfer/portfolioTransfer.ts'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore.ts'
import { useIndexQuotesStore } from '@/domains/indices/stores/useIndexQuotesStore.ts'
import type { PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import { useBreakpoints } from '@/shared/composables/useBreakpoints.ts'
import SettingsContent from './components/SettingsContent.vue'
import type {
  SettingsDraft,
  SettingsImportSelection,
  SettingsImportState,
} from './models/settingsViewModel.ts'

const props = defineProps<{ portfolio: PortfolioStore }>()
const appSettingsStore = useAppSettingsStore()
const indexStore = useIndexQuotesStore()
const fundStore = useFundsStore()
const portfolioTransfer = createPortfolioTransferAdapter(props.portfolio)
const { isSmUp } = useBreakpoints()
const visible = ref(false)
const draft = ref<SettingsDraft>(appSettingsStore.getSnapshot())
const initialDraft = ref<SettingsDraft>(appSettingsStore.getSnapshot())
const importState = ref<SettingsImportState | null>(null)
const selection = ref<SettingsImportSelection>({
  funds: false,
  index: false,
  portfolio: false,
})
const isDirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(initialDraft.value))
const overwriteSections = computed(() => {
  const sections: string[] = []
  if (selection.value.index && indexStore.groups.length > 0) sections.push('指数分组')
  if (selection.value.funds && fundStore.fundOrder.length > 0) sections.push('基金')
  if (selection.value.portfolio) {
    const current = props.portfolio.getPortfolio()
    if (current.events.length > 0 || current.fundCodes.length > 0) {
      sections.push('投资账本')
    }
  }
  return sections
})
const requiresOverwrite = computed(() => overwriteSections.value.length > 0)
const overwriteMessage = computed(
  () => `将覆盖现有的${overwriteSections.value.join('和')}配置，确定继续吗？`,
)

const transferCoordinator = createConfigurationTransferCoordinator({
  commitIndexGroups: indexStore.commitGroups,
  getFundSettings: fundStore.getSettingsSnapshot,
  getIndexGroups: indexStore.getSettingsSnapshot,
  getPortfolio: props.portfolio.getPortfolio,
  replaceFundSettings: fundStore.replaceSettingsPersisted,
  replacePortfolio: portfolioTransfer.replace,
})

function open(): void {
  close()
  resetDraft()
  visible.value = true
}

function close(): void {
  visible.value = false
  resetDraft()
  clearImport()
}

function resetDraft(): void {
  initialDraft.value = appSettingsStore.getSnapshot()
  draft.value = appSettingsStore.getSnapshot()
}

function save(): void {
  if (!isDirty.value) {
    close()
    return
  }

  const result = appSettingsStore.commit(draft.value)
  if (!result.ok) {
    MessagePlugin.error(
      result.reason === 'persistence-failed' ? '设置保存失败，请稍后重试' : '设置内容无效',
    )
    return
  }

  MessagePlugin.success('设置已保存')
  close()
}

function updateDraft(nextDraft: SettingsDraft): void {
  draft.value = nextDraft
}

function exportText(): string {
  return serializeConfigurationTransfer({
    fundSettings: fundStore.getSettingsSnapshot(),
    indexGroups: indexStore.getSettingsSnapshot(),
    portfolio: props.portfolio.getPortfolio(),
  })
}

async function exportToClipboard(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('clipboard unavailable')
    }
    await navigator.clipboard.writeText(exportText())
    MessagePlugin.success('配置 JSON 已复制')
  } catch {
    MessagePlugin.error('无法写入剪贴板，请检查浏览器权限')
  }
}

function exportToDownload(): void {
  try {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      throw new Error('download unavailable')
    }
    const blob = new Blob([exportText()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pure-hold-settings-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    MessagePlugin.success('配置 JSON 已下载')
  } catch {
    MessagePlugin.error('配置下载失败')
  }
}

async function importFromClipboard(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('clipboard unavailable')
    }
    await importText(await navigator.clipboard.readText())
  } catch {
    MessagePlugin.error('无法读取剪贴板，请检查浏览器权限')
  }
}

async function importFromFile(file: File): Promise<void> {
  try {
    await importText(await file.text())
  } catch {
    MessagePlugin.error('无法读取配置文件')
  }
}

async function importText(text: string): Promise<void> {
  const knownQuoteCodes = new Set(indexStore.definitions.map(({ quoteCode }) => quoteCode))
  const result = parseConfigurationTransfer(text, knownQuoteCodes, new Set(fundStore.fundOrder))
  if (!result.ok) {
    importState.value = null
    MessagePlugin.error(result.message)
    return
  }

  importState.value = {
    package: result.package,
    sectionErrors: result.sectionErrors,
    warnings: result.warnings,
  }
  selection.value = {
    funds: result.package.funds !== undefined,
    index: result.package.index !== undefined,
    portfolio: result.package.portfolio !== undefined,
  }
}

function clearImport(): void {
  importState.value = null
  selection.value = { funds: false, index: false, portfolio: false }
}

function updateSelection(nextSelection: SettingsImportSelection): void {
  selection.value = { ...nextSelection }
}

function commitImport(): void {
  const state = importState.value
  if (!state) return
  const result = transferCoordinator.commitImport(state.package, selection.value)
  if (!result.ok) {
    MessagePlugin.error(result.reason)
    return
  }

  MessagePlugin.success('配置已恢复')
  if (!isDirty.value) {
    close()
    return
  }

  clearImport()
}

defineExpose({ open })
</script>

<template>
  <t-dialog
    v-if="isSmUp"
    v-model:visible="visible"
    attach="body"
    :close-on-esc-keydown="false"
    :close-on-overlay-click="false"
    :cancel-btn="{ content: '取消', variant: 'outline' }"
    :confirm-btn="{ content: '确认', disabled: !isDirty, variant: 'base' }"
    :destroy-on-close="true"
    header="设置"
    placement="center"
    width="550px"
    @cancel="close"
    @close="close"
    @confirm="save"
  >
    <SettingsContent
      :import-state="importState"
      :model-value="draft"
      :overwrite-message="overwriteMessage"
      :requires-overwrite="requiresOverwrite"
      :selection="selection"
      @clear-import="clearImport"
      @commit-import="commitImport"
      @export-clipboard="exportToClipboard"
      @export-download="exportToDownload"
      @file-selected="importFromFile"
      @import-clipboard="importFromClipboard"
      @update:model-value="updateDraft"
      @update-selection="updateSelection"
    />
  </t-dialog>

  <t-drawer
    v-else
    v-model:visible="visible"
    attach="body"
    :close-btn="false"
    :close-on-esc-keydown="false"
    :close-on-overlay-click="false"
    :destroy-on-close="true"
    :footer="false"
    placement="bottom"
    size="100%"
    @close="close"
  >
    <template #header>
      <div class="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <t-button aria-label="关闭设置" shape="circle" variant="text" @click="close">
          <template #icon><t-icon name="close" /></template>
        </t-button>
        <span class="text-lg font-medium">设置</span>
        <t-button
          class="justify-self-end"
          :disabled="!isDirty"
          shape="square"
          size="large"
          theme="primary"
          variant="text"
          @click="save"
        >
          保存
        </t-button>
      </div>
    </template>

    <div class="min-h-full overflow-y-auto pb-8">
      <SettingsContent
        :import-state="importState"
        :model-value="draft"
        :overwrite-message="overwriteMessage"
        :requires-overwrite="requiresOverwrite"
        :selection="selection"
        @clear-import="clearImport"
        @commit-import="commitImport"
        @export-clipboard="exportToClipboard"
        @export-download="exportToDownload"
        @file-selected="importFromFile"
        @import-clipboard="importFromClipboard"
        @update:model-value="updateDraft"
        @update-selection="updateSelection"
      />
    </div>
  </t-drawer>
</template>
