<script setup lang="ts">
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import { computed, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

import { type DraftGroup, isGroupNameDuplicate, validateGroupName } from '../models/settingsTypes'

const props = defineProps<{
  groups: readonly DraftGroup[]
  selectedGroupId: string | null
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

const draggableGroups = ref<DraftGroup[]>([])
const nameDialogVisible = ref(false)
const editingGroupId = ref<string | null>(null)
const nameInput = ref('')
const nameError = ref('')
const groupPendingRemoval = ref<DraftGroup | null>(null)
const isAddingGroup = computed(() => editingGroupId.value === null)
const removalDialogVisible = computed({
  get: () => groupPendingRemoval.value !== null,
  set: (visible: boolean) => {
    if (!visible) {
      groupPendingRemoval.value = null
    }
  },
})

watch(
  () => props.groups,
  (groups) => {
    draggableGroups.value = [...groups]
  },
  { deep: true, immediate: true },
)

function openAddDialog(): void {
  editingGroupId.value = null
  nameInput.value = ''
  nameError.value = ''
  nameDialogVisible.value = true
}

function openRenameDialog(group: DraftGroup): void {
  editingGroupId.value = group.id
  nameInput.value = group.name
  nameError.value = ''
  nameDialogVisible.value = true
}

function submitName(): void {
  const name = nameInput.value.trim()
  const validationError = validateGroupName(name)
  if (validationError) {
    nameError.value = validationError
    return
  }

  if (isGroupNameDuplicate(name, props.groups, editingGroupId.value ?? undefined)) {
    nameError.value = '分组名称不能重复'
    return
  }

  if (editingGroupId.value) {
    emit('rename', editingGroupId.value, name)
  } else {
    emit('add', name)
  }
  nameDialogVisible.value = false
}

function requestRemove(group: DraftGroup): void {
  if (group.quoteCodes.length === 0) {
    emit('remove', group.id)
    return
  }

  groupPendingRemoval.value = group
}

function confirmRemove(): void {
  if (groupPendingRemoval.value) {
    emit('remove', groupPendingRemoval.value.id)
  }
  groupPendingRemoval.value = null
}

function handleDragEnd(event: { newIndex?: number; oldIndex?: number }): void {
  if (event.oldIndex !== undefined && event.newIndex !== undefined) {
    emit('reorder', event.oldIndex, event.newIndex)
  }
}
</script>

<template>
  <section aria-label="分组管理" class="flex h-full flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-base font-medium">分组管理</h3>
      <t-button
        title="新增分组"
        theme="primary"
        variant="text"
        shape="square"
        @click="openAddDialog"
      >
        <template #icon><t-icon name="add" /></template>
      </t-button>
    </div>

    <VueDraggable
      v-model="draggableGroups"
      :animation="150"
      :delay="200"
      :delay-on-touch-only="true"
      data-testid="index-settings-group-list"
      handle=".drag-handle"
      tag="ul"
      class="min-h-0 flex-1 overflow-y-auto"
      @end="handleDragEnd"
    >
      <t-list-item
        v-for="group in draggableGroups"
        :key="group.id"
        class="mb-1 cursor-pointer rounded-md"
        :class="
          group.id === selectedGroupId
            ? 'bg-(--td-brand-color-light)'
            : 'hover:bg-(--td-brand-color-light-hover)'
        "
        @click="emit('select', group.id)"
        @keydown.enter="emit('select', group.id)"
        @keydown.space.prevent="emit('select', group.id)"
      >
        <div class="flex min-w-0 items-center gap-2">
          <t-icon
            name="move"
            class="drag-handle shrink-0 cursor-grab text-(--td-text-color-placeholder)"
          />
          <span class="truncate">{{ group.name }}</span>
        </div>
        <template #action>
          <div class="" @click.stop>
            <span class="text-xs text-(--td-text-color-secondary)">
              {{ group.quoteCodes.length }} 个指数
            </span>
            <t-button
              :title="`重命名${group.name}`"
              :aria-label="`重命名${group.name}`"
              shape="square"
              size="small"
              variant="text"
              @click="openRenameDialog(group)"
            >
              <template #icon><t-icon name="edit" /></template>
            </t-button>
            <t-button
              :title="`删除${group.name}`"
              :aria-label="`删除${group.name}`"
              shape="square"
              size="small"
              variant="text"
              :disabled="groups.length <= 1"
              @click="requestRemove(group)"
            >
              <template #icon><t-icon name="delete" /></template>
            </t-button>
          </div>
        </template>
      </t-list-item>
    </VueDraggable>

    <p class="text-center text-xs text-(--td-text-color-placeholder)">拖拽以排序</p>

    <t-dialog
      v-model:visible="nameDialogVisible"
      :header="isAddingGroup ? '新建分组' : '重命名分组'"
      :width="isSmUp ? undefined : mobileDialogWidth"
      :placement="isSmUp ? undefined : 'center'"
      :close-on-esc-keydown="false"
      :close-on-overlay-click="false"
      :confirm-btn="{ content: isAddingGroup ? '新建' : '保存' }"
      @confirm="submitName"
    >
      <t-input
        v-if="isSmUp"
        :maxlength="20"
        show-limit-number
        v-model:value="nameInput"
        autofocus
        placeholder="请输入分组名称"
      />
      <div v-else>
        <t-textarea
          v-model:value="nameInput"
          autofocus
          :autosize="{ minRows: 2, maxRows: 3 }"
          :maxlength="20"
          placeholder="请输入分组名称"
        />
      </div>
      <p v-if="nameError" class="mt-2 text-sm text-(--td-error-color)">{{ nameError }}</p>
    </t-dialog>

    <t-dialog
      v-model:visible="removalDialogVisible"
      header="删除分组"
      :width="isSmUp ? undefined : mobileDialogWidth"
      :placement="isSmUp ? undefined : 'center'"
      :close-on-esc-keydown="false"
      :close-on-overlay-click="false"
      :confirm-btn="{ content: '删除', theme: 'danger' }"
      @confirm="confirmRemove"
    >
      删除“{{ groupPendingRemoval?.name }}”会移除其中的全部指数，是否继续？
    </t-dialog>
  </section>
</template>

<style scoped>
:deep(.t-list-item) {
  padding: var(--td-comp-paddingTB-m) 0;
}
</style>
