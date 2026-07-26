<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import FundGroupList from './components/FundGroupList.vue'
import { useFundGroupDraft } from './composables/useFundGroupDraft'

const { isSmUp } = useBreakpoints()
const visible = ref(false)
const draft = useFundGroupDraft()
const mobileDialogWidth = 'min(320px, calc(100vw - 32px))'

function open(): void {
  draft.reset()
  visible.value = true
}

function close(): void {
  draft.reset()
  visible.value = false
}

function handleResult(error: string | null): void {
  if (error) MessagePlugin.error(error)
}

function handleRename(id: string, name: string): void {
  handleResult(draft.renameGroup(id, name))
}

function confirm(): void {
  const { error } = draft.commit()
  if (error) {
    MessagePlugin.error(error)
    return
  }
  close()
}

defineExpose({ open })
</script>

<template>
  <t-dialog
    v-model:visible="visible"
    attach="body"
    header="基金分组管理"
    :width="isSmUp ? '450px' : mobileDialogWidth"
    :dialog-style="{ maxHeight: 'calc(100dvh - 32px)', display: 'flex', flexDirection: 'column' }"
    :confirm-btn="{ content: '确定', disabled: !draft.isDirty.value }"
    :destroy-on-close="true"
    @close="close"
    @confirm="confirm"
  >
    <FundGroupList
      :groups="draft.groups.value"
      :holding-count="0"
      @add="handleResult(draft.addGroup($event))"
      @remove="handleResult(draft.removeGroup($event))"
      @rename="handleRename"
      @reorder="draft.reorderGroups"
    />
  </t-dialog>
</template>
