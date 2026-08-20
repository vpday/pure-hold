<script setup lang="ts">
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import type { IndexSettingsShellModel } from '../models/indexSettingsSessionModel'

defineProps<{ model: IndexSettingsShellModel }>()

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{
  back: []
  close: []
  confirm: []
}>()
const { isSmUp } = useBreakpoints()
</script>

<template>
  <t-dialog
    v-if="isSmUp"
    v-model:visible="visible"
    attach="body"
    :close-on-esc-keydown="false"
    :close-on-overlay-click="false"
    :confirm-btn="{ content: '确认', disabled: !model.isDirty }"
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
    @close="emit('close')"
    @confirm="emit('confirm')"
  >
    <div data-testid="index-settings-dialog-body" class="settings-dialog-content">
      <div class="min-h-0 overflow-hidden pt-4 pr-4">
        <slot name="groups" />
      </div>
      <div class="min-h-0 overflow-hidden pt-4 pl-4">
        <slot name="detail" />
      </div>
    </div>
  </t-dialog>

  <t-drawer
    v-else
    v-model:visible="visible"
    attach="body"
    :showOverlay="false"
    :close-btn="false"
    :close-on-esc-keydown="false"
    :close-on-overlay-click="false"
    :destroy-on-close="true"
    :footer="false"
    placement="bottom"
    size="100%"
    @close="emit('close')"
  >
    <template #header>
      <div class="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <t-button
          :aria-label="model.mobileView === 'groups' ? '关闭指数设置' : '返回分组列表'"
          shape="circle"
          variant="text"
          @click="model.mobileView === 'groups' ? emit('close') : emit('back')"
        >
          <template #icon>
            <t-icon :name="model.mobileView === 'groups' ? 'close' : 'chevron-left'" />
          </template>
        </t-button>
        <span class="text-lg font-medium">
          {{ model.mobileView === 'groups' ? '指数设置' : model.selectedGroupName }}
        </span>
        <t-button
          class="justify-self-end"
          :disabled="!model.isDirty"
          shape="square"
          size="large"
          theme="primary"
          variant="text"
          @click="emit('confirm')"
        >
          完成
        </t-button>
      </div>
    </template>

    <div v-if="model.mobileView === 'groups'" class="min-h-full">
      <slot name="groups" />
    </div>
    <div v-else class="min-h-full">
      <slot name="detail" />
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
