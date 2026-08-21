<script setup lang="ts">
import { ref } from 'vue'

import type { ConfigurationTransferSectionError } from '@/app/settings/transfer/configurationTransfer.ts'
import type { SettingsImportSelection, SettingsImportState } from '../models/settingsViewModel.ts'

const props = defineProps<{
  importState: SettingsImportState | null
  overwriteMessage: string
  requiresOverwrite: boolean
  selection: SettingsImportSelection
}>()

const fileInput = ref<HTMLInputElement>()

const emit = defineEmits<{
  clearImport: []
  commitImport: []
  exportClipboard: []
  exportDownload: []
  fileSelected: [file: File]
  importClipboard: []
  updateSelection: [selection: SettingsImportSelection]
}>()

function updateIndexSelection(value: boolean): void {
  emit('updateSelection', { ...props.selection, index: value })
}

function updateFundSelection(value: boolean): void {
  emit('updateSelection', { ...props.selection, funds: value })
}

function updatePortfolioSelection(value: boolean): void {
  emit('updateSelection', { ...props.selection, portfolio: value })
}

function openFilePicker(): void {
  fileInput.value?.click()
}

function handleFileChange(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('fileSelected', file)
}

function sectionErrorLabel(error: ConfigurationTransferSectionError): string {
  const label = error.section === 'index' ? '指数' : error.section === 'funds' ? '基金' : '投资账本'
  return `${label}配置无法导入：${error.message}`
}
</script>

<template>
  <section aria-labelledby="settings-backup-heading">
    <h3 id="settings-backup-heading" class="text-sm font-semibold">配置备份</h3>
    <p class="mt-1 text-xs text-(--td-text-color-secondary)">
      导出指数分组、完整基金配置（含持仓）和投资账本，不包含自动刷新配置。
    </p>

    <div class="mt-4 flex flex-wrap gap-2">
      <t-button variant="outline" @click="emit('exportDownload')">下载 JSON</t-button>
      <t-button variant="outline" @click="emit('exportClipboard')">复制 JSON</t-button>
    </div>
  </section>

  <section aria-labelledby="settings-restore-heading">
    <h3 id="settings-restore-heading" class="text-sm font-semibold">配置恢复</h3>
    <p class="mt-1 text-xs text-(--td-text-color-secondary)">
      从剪贴板或 JSON 文件读取备份，并选择要恢复的配置分区。
    </p>

    <div class="mt-4 flex flex-wrap gap-2">
      <t-button variant="outline" @click="emit('importClipboard')">从剪贴板读取</t-button>
      <t-button variant="outline" @click="openFilePicker">选择 JSON 文件</t-button>
      <input
        ref="fileInput"
        accept="application/json,.json"
        class="hidden"
        type="file"
        @change="handleFileChange"
      />
    </div>

    <t-dialog
      v-if="importState"
      attach="body"
      :close-on-esc-keydown="false"
      :close-on-overlay-click="false"
      :destroy-on-close="true"
      :dialog-style="{ maxWidth: 'calc(100vw - 32px)' }"
      header="配置恢复"
      :visible="true"
      width="min(420px, calc(100vw - 32px))"
      :z-index="2600"
      @close="emit('clearImport')"
    >
      <div class="text-base font-medium">已读取配置，请选择要恢复的分区</div>
      <div class="mt-4 flex flex-col gap-2">
        <t-checkbox
          :checked="selection.index"
          :disabled="!importState.package.index"
          @change="updateIndexSelection"
        >
          指数分组配置
        </t-checkbox>
        <t-checkbox
          :checked="selection.funds"
          :disabled="!importState.package.funds"
          @change="updateFundSelection"
        >
          基金配置（含持仓）
        </t-checkbox>
        <t-checkbox
          :checked="selection.portfolio"
          :disabled="!importState.package.portfolio"
          @change="updatePortfolioSelection"
        >
          投资账本（交易、分红）
        </t-checkbox>
      </div>

      <div
        v-if="importState.warnings.length"
        class="mt-4 space-y-1 text-sm text-(--td-warning-color)"
      >
        <p v-for="warning in importState.warnings" :key="warning.message">{{ warning.message }}</p>
      </div>
      <div
        v-if="importState.sectionErrors.length"
        class="mt-4 space-y-1 text-sm text-(--td-error-color)"
      >
        <p v-for="error in importState.sectionErrors" :key="error.message">
          {{ sectionErrorLabel(error) }}
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <t-button variant="outline" @click="emit('clearImport')">取消</t-button>
          <t-popconfirm
            v-if="requiresOverwrite"
            :cancel-btn="{ content: '取消', variant: 'outline' }"
            :confirm-btn="{ content: '确认', variant: 'base' }"
            :content="overwriteMessage"
            placement="top-right"
            :popup-props="{ attach: 'body', zIndex: 2700 }"
            theme="warning"
            @confirm="emit('commitImport')"
          >
            <t-button
              theme="primary"
              variant="base"
              :disabled="!selection.index && !selection.funds && !selection.portfolio"
            >
              确认
            </t-button>
          </t-popconfirm>
          <t-button
            v-else
            theme="primary"
            variant="base"
            :disabled="!selection.index && !selection.funds && !selection.portfolio"
            @click="emit('commitImport')"
          >
            确认
          </t-button>
        </div>
      </template>
    </t-dialog>
  </section>
</template>
