<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { MessagePlugin } from 'tdesign-vue-next'

import { useIndexQuotesStore } from '@/domains/indices/stores/useIndexQuotesStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import GroupDetail from './components/GroupDetail.vue'
import GroupList from './components/GroupList.vue'
import IndexSettingsResponsiveShell from './components/IndexSettingsResponsiveShell.vue'
import { useIndexSettingsSession } from './composables/useIndexSettingsSession'

const store = useIndexQuotesStore()
const { definitions } = storeToRefs(store)
const { isSmUp } = useBreakpoints()
const visible = ref(false)
const session = useIndexSettingsSession(store, isSmUp)

function open(): void {
  session.open()
  visible.value = true
}

function close(): void {
  session.reset()
  visible.value = false
}

function handleAddGroup(name: string): void {
  handleResult(session.addGroup(name))
}

function handleRenameGroup(groupId: string, name: string): void {
  handleResult(session.renameGroup(groupId, name))
}

function handleResult(error: string | null): void {
  if (error) MessagePlugin.error(error)
}

function handleConfirm(): void {
  const error = session.commit()
  if (error) {
    MessagePlugin.error(error)
    return
  }

  MessagePlugin.success('指数设置已保存')
  close()
}

defineExpose({ open })
</script>

<template>
  <IndexSettingsResponsiveShell
    v-model:visible="visible"
    :model="session.model.value.shell"
    @back="session.returnToGroups"
    @close="close"
    @confirm="handleConfirm"
  >
    <template #groups>
      <GroupList
        :groups="session.model.value.groups"
        :selected-group-id="session.model.value.selectedGroupId"
        @add="handleAddGroup"
        @remove="handleResult(session.removeGroup($event))"
        @rename="handleRenameGroup"
        @reorder="session.reorderGroups"
        @select="session.selectGroup"
      />
    </template>
    <template #detail>
      <GroupDetail
        v-if="session.model.value.selectedGroup"
        :definitions="definitions"
        :group="session.model.value.selectedGroup"
        @add-index="session.addIndex"
        @remove-index="session.removeIndex"
        @reorder-indices="session.reorderIndices"
      />
    </template>
  </IndexSettingsResponsiveShell>
</template>
