<script setup lang="ts">
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <t-dialog
    v-model:visible="visible"
    attach="body"
    :destroy-on-close="true"
    header="定投计划"
    placement="center"
    width="min(560px, calc(100vw - 32px))"
    @close="emit('close')"
  >
    <slot />
    <template #footer>
      <slot name="footer" />
    </template>
  </t-dialog>
</template>
