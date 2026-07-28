<script setup lang="ts">
defineProps<{ code: string; name: string }>()
const emit = defineEmits<{ comingSoon: []; delete: [code: string]; edit: [code: string] }>()
</script>

<template>
  <t-space>
    <t-button size="small" variant="text" @click="emit('edit', code)">编辑</t-button>
    <t-popconfirm
      cancel-btn="取消"
      :confirm-btn="{ content: '删除', theme: 'danger' }"
      theme="danger"
      @confirm="emit('delete', code)"
    >
      <template #content>
        <p class="max-w-64 whitespace-normal wrap-break-word">
          确认删除“{{ name }}”（{{ code }}）？<br />
          将从整个基金列表及所有分组中删除。
        </p>
      </template>
      <t-button size="small" variant="text" theme="danger">删除</t-button>
    </t-popconfirm>
    <t-button size="small" variant="text" @click="emit('comingSoon')">记录买入</t-button>
    <t-button size="small" variant="text" @click="emit('comingSoon')">记录卖出</t-button>
  </t-space>
</template>
