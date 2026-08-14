<script setup lang="ts">
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <t-drawer
    v-model:visible="visible"
    attach="body"
    :close-btn="false"
    :destroy-on-close="true"
    placement="bottom"
    size="100dvh"
    @close="emit('close')"
  >
    <template #header>
      <div class="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <t-button aria-label="关闭定投计划" shape="circle" variant="text" @click="emit('close')">
          <template #icon><t-icon name="close" /></template>
        </t-button>
        <span class="text-lg font-medium">定投计划</span>
        <span aria-hidden="true" />
      </div>
    </template>
    <div class="fund-plan-mobile-drawer-content">
      <slot />
    </div>
    <template #footer>
      <div class="fund-plan-mobile-footer">
        <slot name="footer" />
      </div>
    </template>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

.fund-plan-mobile-drawer-content {
  @apply flex h-full min-h-0 flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)] pr-1;
}

.fund-plan-mobile-footer {
  @apply border-t border-(--td-component-stroke) pt-3 pb-[env(safe-area-inset-bottom)];
}

:deep(.t-drawer__body) {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
</style>
