<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import FundGroupList from './components/FundGroupList.vue'
import FundOrderList from './components/FundOrderList.vue'
import { useFundGroupDraft } from './composables/useFundGroupDraft'

type MobileView = 'detail' | 'groups'

const emit = defineEmits<{
  saved: [reorderedCategoryIds: readonly string[]]
}>()
const store = useFundsStore()
const { snapshotsByCode } = storeToRefs(store)
const { isSmUp } = useBreakpoints()
const visible = ref(false)
const mobileView = ref<MobileView>('groups')
const draft = useFundGroupDraft()

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

function handleResult(error: string | null): void {
  if (error) MessagePlugin.error(error)
}

function handleRename(id: string, name: string): void {
  handleResult(draft.renameGroup(id, name))
}

function handleSelect(categoryId: string): void {
  draft.selectedCategoryId.value = categoryId
  if (!isSmUp.value) {
    mobileView.value = 'detail'
  }
}

function handleReorderFunds(fromIndex: number, toIndex: number): void {
  draft.reorderFunds(draft.selectedCategoryId.value, fromIndex, toIndex)
}

function confirm(): void {
  const { error, reorderedCategoryIds } = draft.commit()
  if (error) {
    MessagePlugin.error(error)
    return
  }
  emit('saved', reorderedCategoryIds)
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
    cancel-btn="取消"
    :dialog-style="{
      maxWidth: 'calc(100vw - 96px)',
      height: 'calc(100dvh - 96px)',
      display: 'flex',
      flexDirection: 'column',
    }"
    dialog-class-name="fund-group-settings-dialog"
    :destroy-on-close="true"
    header="基金分组管理"
    :confirm-btn="{ content: '确定', disabled: !draft.isDirty.value }"
    placement="center"
    width="900px"
    @close="close"
    @confirm="confirm"
  >
    <div class="settings-dialog-content">
      <div class="min-h-0 overflow-hidden pt-4 pr-4">
        <FundGroupList
          :all-count="draft.fundOrder.value.length"
          :groups="draft.groups.value"
          :holding-count="draft.holdingOrder.value.length"
          :selected-category-id="draft.selectedCategoryId.value"
          @add="handleResult(draft.addGroup($event))"
          @remove="handleResult(draft.removeGroup($event))"
          @rename="handleRename"
          @reorder="draft.reorderGroups"
          @select="handleSelect"
        />
      </div>
      <div class="min-h-0 overflow-hidden pt-4 pl-4">
        <FundOrderList
          :category-name="draft.selectedCategoryName.value"
          :fund-codes="draft.selectedFundCodes.value"
          :snapshots-by-code="snapshotsByCode"
          @reorder="handleReorderFunds"
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
          :aria-label="mobileView === 'groups' ? '关闭基金分组管理' : '返回分组列表'"
          shape="circle"
          variant="text"
          @click="mobileView === 'groups' ? close() : returnToGroupList()"
        >
          <template #icon>
            <t-icon :name="mobileView === 'groups' ? 'close' : 'chevron-left'" />
          </template>
        </t-button>
        <span class="text-lg font-medium">{{
          mobileView === 'groups' ? '基金分组管理' : draft.selectedCategoryName.value
        }}</span>
        <t-button
          class="justify-self-end"
          :disabled="!draft.isDirty.value"
          shape="square"
          size="large"
          theme="primary"
          variant="text"
          @click="confirm"
        >
          完成
        </t-button>
      </div>
    </template>

    <div v-if="mobileView === 'groups'" class="min-h-full">
      <FundGroupList
        :all-count="draft.fundOrder.value.length"
        :groups="draft.groups.value"
        :holding-count="draft.holdingOrder.value.length"
        :selected-category-id="draft.selectedCategoryId.value"
        @add="handleResult(draft.addGroup($event))"
        @remove="handleResult(draft.removeGroup($event))"
        @rename="handleRename"
        @reorder="draft.reorderGroups"
        @select="handleSelect"
      />
    </div>
    <div v-else class="min-h-full">
      <FundOrderList
        :category-name="draft.selectedCategoryName.value"
        :fund-codes="draft.selectedFundCodes.value"
        :snapshots-by-code="snapshotsByCode"
        @reorder="handleReorderFunds"
      />
    </div>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

.settings-dialog-content {
  @apply grid min-h-0 flex-1 grid-cols-[18rem_minmax(0,1fr)] divide-x divide-(--td-component-border) overflow-hidden;
}

:global(.fund-group-settings-dialog .t-dialog__body) {
  display: flex;
  min-height: 0;
  flex: 1 1 0%;
  overflow: hidden;
}
</style>
