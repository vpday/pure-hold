<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { MessagePlugin } from 'tdesign-vue-next'

import { useIndexQuotesStore } from '@/domains/indices/stores/useIndexQuotesStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import GroupDetail from './components/GroupDetail.vue'
import GroupList from './components/GroupList.vue'
import { useSettingsDraft } from './composables/useSettingsDraft'

type MobileView = 'detail' | 'groups'

const store = useIndexQuotesStore()
const { definitions } = storeToRefs(store)
const { isSmUp } = useBreakpoints()
const visible = ref(false)
const mobileView = ref<MobileView>('groups')
const draft = useSettingsDraft()
const selectedGroup = computed(() => draft.selectedGroup.value)

watch(isSmUp, (desktop) => {
  if (!desktop) {
    mobileView.value = 'groups'
  }
})

function open(): void {
  draft.reset()
  mobileView.value = 'groups'
  visible.value = true
}

function close(): void {
  draft.reset()
  mobileView.value = 'groups'
  visible.value = false
}

function handleGroupSelect(groupId: string): void {
  draft.selectedGroupId.value = groupId
  if (!isSmUp.value) {
    mobileView.value = 'detail'
  }
}

function handleAddGroup(name: string): void {
  const error = draft.addGroup(name)
  if (error) {
    MessagePlugin.error(error)
    return
  }

  if (!isSmUp.value) {
    mobileView.value = 'detail'
  }
}

function handleRenameGroup(groupId: string, name: string): void {
  const error = draft.renameGroup(groupId, name)
  if (error) {
    MessagePlugin.error(error)
  }
}

function handleRemoveGroup(groupId: string): void {
  const error = draft.removeGroup(groupId)
  if (error) {
    MessagePlugin.error(error)
  }
}

function handleReorderIndices(fromIndex: number, toIndex: number): void {
  if (selectedGroup.value) {
    draft.reorderIndices(selectedGroup.value.id, fromIndex, toIndex)
  }
}

function handleConfirm(): void {
  const { error } = draft.commit()
  if (error) {
    MessagePlugin.error(error)
    return
  }

  close()
}

function returnToGroupList(): void {
  mobileView.value = 'groups'
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
    :confirm-btn="{ content: '确认', disabled: !draft.isDirty.value }"
    cancel-btn="取消"
    :dialog-style="{
      maxWidth: 'calc(100vw - 96px)',
      height: 'calc(100dvh - 96px)',
      display: 'flex',
      flexDirection: 'column',
    }"
    dialog-class-name="index-settings-dialog"
    :destroy-on-close="true"
    header="指数设置"
    placement="center"
    width="900px"
    @close="close"
    @confirm="handleConfirm"
  >
    <div data-testid="index-settings-dialog-body" class="settings-dialog-content">
      <div class="min-h-0 overflow-hidden pt-4 pr-4">
        <GroupList
          :groups="draft.groups.value"
          :selected-group-id="draft.selectedGroupId.value"
          @add="handleAddGroup"
          @remove="handleRemoveGroup"
          @rename="handleRenameGroup"
          @reorder="draft.reorderGroups"
          @select="handleGroupSelect"
        />
      </div>
      <div class="min-h-0 overflow-hidden pt-4 pl-4">
        <GroupDetail
          v-if="selectedGroup"
          :definitions="definitions"
          :group="selectedGroup"
          @add-index="draft.addIndexToGroup(selectedGroup.id, $event)"
          @remove-index="draft.removeIndexFromGroup(selectedGroup.id, $event)"
          @reorder-indices="handleReorderIndices"
        />
      </div>
    </div>
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
        <t-button
          :aria-label="mobileView === 'groups' ? '关闭指数设置' : '返回分组列表'"
          shape="circle"
          variant="text"
          @click="mobileView === 'groups' ? close() : returnToGroupList()"
        >
          <template #icon>
            <t-icon :name="mobileView === 'groups' ? 'close' : 'chevron-left'" />
          </template>
        </t-button>
        <span class="text-lg font-medium">{{
          mobileView === 'groups' ? '指数设置' : selectedGroup?.name
        }}</span>
        <t-button
          shape="square"
          theme="primary"
          size="large"
          variant="text"
          :disabled="!draft.isDirty.value"
          @click="handleConfirm"
          class="justify-self-end"
        >
          完成
        </t-button>
      </div>
    </template>

    <div v-if="mobileView === 'groups'" class="min-h-full">
      <GroupList
        :groups="draft.groups.value"
        :selected-group-id="draft.selectedGroupId.value"
        @add="handleAddGroup"
        @remove="handleRemoveGroup"
        @rename="handleRenameGroup"
        @reorder="draft.reorderGroups"
        @select="handleGroupSelect"
      />
    </div>
    <div v-else-if="selectedGroup" class="min-h-full">
      <GroupDetail
        :definitions="definitions"
        :group="selectedGroup"
        @add-index="draft.addIndexToGroup(selectedGroup.id, $event)"
        @remove-index="draft.removeIndexFromGroup(selectedGroup.id, $event)"
        @reorder-indices="handleReorderIndices"
      />
    </div>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

.settings-dialog-content {
  @apply grid min-h-0 flex-1 grid-cols-[18rem_minmax(0,1fr)] divide-x divide-(--td-component-border) overflow-hidden;
}

:global(.index-settings-dialog .t-dialog__body) {
  display: flex;
  min-height: 0;
  flex: 1 1 0%;
  overflow: hidden;
}
</style>
