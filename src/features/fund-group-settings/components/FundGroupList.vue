<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import {
  type FundGroupDraft,
  isFundGroupNameDuplicate,
  validateFundGroupName,
} from '../models/fundGroupDraft'

const props = defineProps<{
  allCount: number
  groups: readonly FundGroupDraft[]
  holdingCount: number
  selectedCategoryId: string
}>()
const emit = defineEmits<{
  add: [name: string]
  remove: [id: string]
  rename: [id: string, name: string]
  reorder: [fromIndex: number, toIndex: number]
  select: [id: string]
}>()
const { isSmUp } = useBreakpoints()
const mobileDialogWidth = 'min(320px, calc(100vw - 32px))'
const draggableGroups = ref<FundGroupDraft[]>([])
const editingGroupId = ref<string | null>(null)
const isAdding = ref(false)
const nameInput = ref('')
const nameError = ref('')
const pendingRemoval = ref<FundGroupDraft | null>(null)
const isNameEditing = computed(() => isAdding.value || editingGroupId.value !== null)
const removalVisible = computed({
  get: () => pendingRemoval.value !== null,
  set: (visible: boolean) => {
    if (!visible) pendingRemoval.value = null
  },
})

watch(
  () => props.groups,
  (groups) => {
    draggableGroups.value = groups.map((group) => ({ ...group, fundCodes: [...group.fundCodes] }))
  },
  { deep: true, immediate: true },
)

function startAdding(): void {
  editingGroupId.value = null
  isAdding.value = true
  nameInput.value = ''
  nameError.value = ''
}

function startRenaming(group: FundGroupDraft): void {
  editingGroupId.value = group.id
  isAdding.value = false
  nameInput.value = group.name
  nameError.value = ''
}

function cancelNameEditing(): void {
  editingGroupId.value = null
  isAdding.value = false
  nameInput.value = ''
  nameError.value = ''
}

function submitName(): void {
  const name = nameInput.value.trim()
  const error = validateFundGroupName(name)
  if (error || isFundGroupNameDuplicate(name, props.groups, editingGroupId.value ?? undefined)) {
    nameError.value = error ?? '分组名称不能重复'
    return
  }
  if (editingGroupId.value) emit('rename', editingGroupId.value, name)
  else emit('add', name)
  cancelNameEditing()
}

function requestRemove(group: FundGroupDraft): void {
  if (group.fundCodes.length === 0) emit('remove', group.id)
  else pendingRemoval.value = group
}

function confirmRemove(): void {
  if (pendingRemoval.value) emit('remove', pendingRemoval.value.id)
  pendingRemoval.value = null
}

function handleDragEnd(event: {
  newDraggableIndex?: number
  newIndex?: number
  oldDraggableIndex?: number
  oldIndex?: number
}): void {
  const fromIndex = event.oldDraggableIndex ?? event.oldIndex
  const toIndex = event.newDraggableIndex ?? event.newIndex
  if (fromIndex !== undefined && toIndex !== undefined) {
    emit('reorder', fromIndex, toIndex)
  }
}
</script>

<template>
  <section aria-label="基金分组管理" class="flex min-h-0 flex-1 flex-col gap-3">
    <t-list-item
      class="cursor-pointer rounded-md"
      :class="
        selectedCategoryId === 'all'
          ? 'bg-(--td-brand-color-light)'
          : 'hover:bg-(--td-brand-color-light-hover)'
      "
      role="button"
      tabindex="0"
      @click="emit('select', 'all')"
      @keydown.enter="emit('select', 'all')"
      @keydown.space.prevent="emit('select', 'all')"
    >
      <div class="flex min-w-0 items-center gap-2">
        <t-icon name="move" class="shrink-0 text-(--td-text-color-disabled)" />
        <span>全部</span>
      </div>
      <template #action>
        <span class="mr-2 text-xs text-(--td-text-color-secondary)">{{ allCount }} 只基金</span>
        <t-tag size="small" theme="default" variant="light" color="var(--td-gray-color-8)"
          >默认</t-tag
        >
      </template>
    </t-list-item>
    <t-list-item
      class="cursor-pointer rounded-md"
      :class="
        selectedCategoryId === 'holdings'
          ? 'bg-(--td-brand-color-light)'
          : 'hover:bg-(--td-brand-color-light-hover)'
      "
      role="button"
      tabindex="0"
      @click="emit('select', 'holdings')"
      @keydown.enter="emit('select', 'holdings')"
      @keydown.space.prevent="emit('select', 'holdings')"
    >
      <div class="flex min-w-0 items-center gap-2">
        <t-icon name="move" class="shrink-0 text-(--td-text-color-disabled)" />
        <span>持仓</span>
      </div>
      <template #action>
        <span class="mr-2 text-xs text-(--td-text-color-secondary)">
          {{ holdingCount }} 只基金
        </span>
        <t-tag size="small" theme="default" variant="light" color="var(--td-gray-color-8)"
          >默认</t-tag
        >
      </template>
    </t-list-item>
    <VueDraggable
      v-model="draggableGroups"
      :animation="150"
      :delay="200"
      :delay-on-touch-only="true"
      :disabled="isNameEditing"
      draggable=".fund-group-draggable-item"
      handle=".fund-group-drag-handle"
      tag="ul"
      class="min-h-0 flex-1 overflow-y-auto space-y-3"
      @end="handleDragEnd"
    >
      <t-list-item
        v-for="group in draggableGroups"
        :key="group.id"
        class="fund-group-draggable-item cursor-pointer rounded-md"
        :class="
          group.id === selectedCategoryId
            ? 'bg-(--td-brand-color-light)'
            : 'hover:bg-(--td-brand-color-light-hover)'
        "
        role="button"
        tabindex="0"
        @click="emit('select', group.id)"
        @keydown.enter="emit('select', group.id)"
        @keydown.space.prevent="emit('select', group.id)"
      >
        <div class="flex min-w-0 items-center gap-2">
          <t-icon
            name="move"
            class="fund-group-drag-handle shrink-0 cursor-grab text-(--td-text-color-placeholder)"
          />
          <t-input
            v-if="editingGroupId === group.id"
            v-model:value="nameInput"
            autofocus
            :maxlength="20"
            :status="nameError ? 'error' : 'default'"
            class="min-w-0 flex-1"
            @enter="submitName"
            @keydown.esc="cancelNameEditing"
          />
          <span v-else class="truncate">{{ group.name }}</span>
        </div>
        <template #action>
          <div @click.stop>
            <template v-if="editingGroupId === group.id">
              <t-button
                shape="square"
                size="small"
                theme="primary"
                variant="text"
                @click="submitName"
              >
                <template #icon><t-icon name="check" /></template>
              </t-button>
              <t-button shape="square" size="small" variant="text" @click="cancelNameEditing">
                <template #icon><t-icon name="close" /></template>
              </t-button>
            </template>
            <template v-else>
              <span class="mr-1 text-xs text-(--td-text-color-secondary)">
                {{ group.fundCodes.length }} 只基金
              </span>
              <t-button shape="square" size="small" variant="text" @click="startRenaming(group)">
                <template #icon><t-icon name="edit" /></template>
              </t-button>
              <t-button shape="square" size="small" variant="text" @click="requestRemove(group)">
                <template #icon><t-icon name="delete" /></template>
              </t-button>
            </template>
          </div>
        </template>
      </t-list-item>
    </VueDraggable>
    <div v-if="isAdding" class="fund-group-create-row">
      <t-input
        v-model:value="nameInput"
        autofocus
        :maxlength="20"
        :status="nameError ? 'error' : 'default'"
        class="min-w-0 flex-1"
        @enter="submitName"
        @keydown.esc="cancelNameEditing"
      />
      <t-button shape="square" size="small" theme="primary" variant="text" @click="submitName">
        <template #icon><t-icon name="check" /></template>
      </t-button>
      <t-button shape="square" size="small" variant="text" @click="cancelNameEditing">
        <template #icon><t-icon name="close" /></template>
      </t-button>
    </div>
    <p v-if="nameError" class="-mt-2 text-sm text-(--td-error-color)">{{ nameError }}</p>
    <t-button v-if="!isNameEditing" block variant="dashed" @click="startAdding">
      <template #icon><t-icon name="add" /></template>新增分组
    </t-button>
    <p class="text-center text-xs text-(--td-text-color-placeholder)">拖拽手柄调整顺序</p>

    <t-dialog
      v-model:visible="removalVisible"
      header="删除分组"
      placement="center"
      :width="isSmUp ? undefined : mobileDialogWidth"
      :confirm-btn="{ content: '删除', theme: 'danger' }"
      @confirm="confirmRemove"
    >
      只删除“{{ pendingRemoval?.name }}”分组及其关联关系，不会删除基金。
    </t-dialog>
  </section>
</template>

<style scoped>
@reference '@/style.css';

.fund-group-create-row {
  @apply flex items-center gap-2 rounded-md border border-(--td-component-border) px-3 py-2;
}

:deep(.t-list-item) {
  padding: var(--td-comp-paddingTB-m) 0;
}
</style>
