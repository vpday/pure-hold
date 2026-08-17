<script setup lang="ts">
import type { DropdownProps } from 'tdesign-vue-next'

const props = defineProps<{ code: string }>()
const emit = defineEmits<{
  buy: [code: string]
  delete: [code: string]
  edit: [code: string]
  sell: [code: string]
}>()
const actionOptions = [
  { content: '编辑', value: 'edit' },
  { content: '记录买入', value: 'buy' },
  { content: '记录卖出', value: 'sell' },
  { content: '删除', theme: 'error', value: 'delete' },
] satisfies NonNullable<DropdownProps['options']>

function handleAction(value: unknown): void {
  if (value === 'edit') emit('edit', props.code)
  else if (value === 'buy') emit('buy', props.code)
  else if (value === 'sell') emit('sell', props.code)
  else if (value === 'delete') emit('delete', props.code)
}
</script>

<template>
  <t-dropdown :options="actionOptions" trigger="click" @click="handleAction($event.value)">
    <t-button aria-label="更多基金操作" shape="square" size="medium" variant="text">
      <template #icon><t-icon name="more" /></template>
    </t-button>
  </t-dropdown>
</template>
