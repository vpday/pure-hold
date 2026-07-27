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
  <t-dialog
    v-model:visible="visible"
    attach="body"
    dialog-class-name="fund-search-dialog"
    :dialog-style="{
      height: 'min(600px, calc(100dvh - 64px))',
      display: 'flex',
      flexDirection: 'column',
    }"
    :destroy-on-close="true"
    :header="step === 'search' ? '搜索并添加基金' : '录入汇总持仓'"
    width="450px"
    top="50px"
    @close="emit('close')"
  >
    <slot />
    <template #footer>
      <slot name="footer" />
    </template>
  </t-dialog>
</template>

<style scoped>
:global(.fund-search-dialog .t-dialog__body) {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
</style>
