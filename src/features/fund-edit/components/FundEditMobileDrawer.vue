<script setup lang="ts">
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <t-drawer
    v-model:visible="visible"
    attach="body"
    :showOverlay="false"
    :close-btn="false"
    :destroy-on-close="true"
    :footer="false"
    placement="bottom"
    size="100dvh"
    @close="emit('close')"
  >
    <template #header>
      <div class="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <t-button aria-label="关闭基金编辑" shape="circle" variant="text" @click="emit('close')">
          <template #icon><t-icon name="close" /></template>
        </t-button>
        <span class="text-lg font-medium">编辑基金</span>
        <t-button
          class="justify-self-end"
          size="large"
          theme="primary"
          variant="text"
          @click="emit('confirm')"
        >
          保存
        </t-button>
      </div>
    </template>
    <div class="fund-edit-mobile-content overflow-y-auto">
      <slot />
    </div>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

.fund-edit-mobile-content {
  @apply flex h-full min-h-0 flex-col pb-[env(safe-area-inset-bottom)] pr-1;
}
</style>

<style scoped>
:deep(.t-drawer__body) {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
</style>
