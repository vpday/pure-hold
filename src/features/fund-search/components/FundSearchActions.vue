<script setup lang="ts">
defineProps<{
  count: number
  disabled: boolean
  step: 'holdings' | 'search'
}>()

const emit = defineEmits<{
  add: []
  back: []
  confirmHoldings: []
  enterHoldings: []
}>()
</script>

<template>
  <div v-if="step === 'search'" class="flex justify-end gap-2">
    <t-button variant="outline" :disabled="disabled" @click="emit('enterHoldings')">
      录入持仓信息
    </t-button>
    <t-button theme="primary" :disabled="disabled" @click="emit('add')">添加</t-button>
  </div>
  <div v-else class="flex w-full items-center justify-between gap-2">
    <p class="shrink-0 whitespace-nowrap text-sm text-(--td-text-color-secondary)">
      共录入
      <strong class="mx-0.5 font-semibold text-(--td-brand-color)">{{ count }}</strong>
      只基金
    </p>
    <div class="flex min-w-0 justify-end gap-2">
      <t-button variant="outline" @click="emit('back')">返回搜索</t-button>
      <t-button theme="primary" @click="emit('confirmHoldings')">确认录入</t-button>
    </div>
  </div>
</template>
