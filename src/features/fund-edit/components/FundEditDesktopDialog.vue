<script setup lang="ts">
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <t-dialog
    v-model:visible="visible"
    attach="body"
    dialog-class-name="fund-edit-dialog"
    :dialog-style="{
      maxHeight: 'calc(100dvh - 64px)',
      display: 'flex',
      flexDirection: 'column',
    }"
    :destroy-on-close="true"
    header="编辑基金"
    width="min(560px, calc(100vw - 32px))"
    top="50px"
    @close="emit('close')"
    @confirm="emit('confirm')"
  >
    <slot />
  </t-dialog>
</template>

<style scoped>
:global(.fund-edit-dialog .t-dialog__body) {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}
</style>
