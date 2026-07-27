<script setup lang="ts">
defineProps<{
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
  <div class="flex justify-end gap-2">
    <template v-if="step === 'search'">
      <t-button variant="outline" :disabled="disabled" @click="emit('enterHoldings')">
        录入持仓信息
      </t-button>
      <t-button theme="primary" :disabled="disabled" @click="emit('add')">添加</t-button>
    </template>
    <template v-else>
      <t-button variant="outline" @click="emit('back')">返回搜索</t-button>
      <t-button theme="primary" @click="emit('confirmHoldings')">确认</t-button>
    </template>
  </div>
</template>
