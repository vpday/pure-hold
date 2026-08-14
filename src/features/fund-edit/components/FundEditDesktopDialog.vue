<script setup lang="ts">
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <t-dialog
    v-model:visible="visible"
    attach="body"
    :destroy-on-close="true"
    header="编辑基金"
    placement="center"
    width="min(560px, calc(100vw - 32px))"
    @close="emit('close')"
    @confirm="emit('confirm')"
  >
    <slot />
  </t-dialog>
</template>
