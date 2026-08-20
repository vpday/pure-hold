<script setup lang="ts">
defineProps<{
  step: 'holdings' | 'search'
}>()

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{
  close: []
}>()
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
        <t-button aria-label="关闭基金搜索" shape="circle" variant="text" @click="emit('close')">
          <template #icon><t-icon name="close" /></template>
        </t-button>
        <span class="text-lg font-medium">
          {{ step === 'search' ? '搜索并添加基金' : '录入汇总持仓' }}
        </span>
        <span aria-hidden="true" />
      </div>
    </template>

    <div class="flex h-full min-h-0 flex-col gap-3">
      <div class="min-h-0 flex-1 overflow-hidden">
        <slot />
      </div>
      <div class="fund-search-mobile-footer">
        <slot name="footer" />
      </div>
    </div>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

.fund-search-mobile-footer {
  @apply shrink-0 border-t border-(--td-component-stroke) pt-3 pb-[env(safe-area-inset-bottom)];
}

:deep(.t-drawer__body) {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
</style>
