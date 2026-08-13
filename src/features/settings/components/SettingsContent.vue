<script setup lang="ts">
import SettingsRefreshPanel from './SettingsRefreshPanel.vue'
import SettingsTransferPanel from './SettingsTransferPanel.vue'
import type {
  SettingsDraft,
  SettingsImportSelection,
  SettingsImportState,
} from '../models/settingsViewModel.ts'

defineProps<{
  importState: SettingsImportState | null
  modelValue: SettingsDraft
  overwriteMessage: string
  requiresOverwrite: boolean
  selection: SettingsImportSelection
}>()

const emit = defineEmits<{
  clearImport: []
  commitImport: []
  exportClipboard: []
  exportDownload: []
  fileSelected: [file: File]
  importClipboard: []
  'update:modelValue': [value: SettingsDraft]
  updateSelection: [selection: SettingsImportSelection]
}>()
</script>

<template>
  <div class="space-y-5">
    <SettingsRefreshPanel
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <SettingsTransferPanel
      :import-state="importState"
      :overwrite-message="overwriteMessage"
      :requires-overwrite="requiresOverwrite"
      :selection="selection"
      @clear-import="emit('clearImport')"
      @commit-import="emit('commitImport')"
      @export-clipboard="emit('exportClipboard')"
      @export-download="emit('exportDownload')"
      @file-selected="emit('fileSelected', $event)"
      @import-clipboard="emit('importClipboard')"
      @update-selection="emit('updateSelection', $event)"
    />
  </div>
</template>
