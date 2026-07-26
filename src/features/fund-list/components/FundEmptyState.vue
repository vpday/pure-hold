<script setup lang="ts">
defineProps<{ isAllCategory: boolean }>()
const emit = defineEmits<{ comingSoon: [] }>()
</script>

<template>
  <div class="mt-4">
    <t-empty v-if="isAllCategory" description="暂无基金">
      <div class="mt-3 flex flex-wrap justify-center gap-2">
        <t-button theme="primary" @click="emit('comingSoon')">搜索并添加基金</t-button>
        <t-button variant="outline" @click="emit('comingSoon')">导入数据</t-button>
      </div>
    </t-empty>
    <t-empty v-else description="当前分组暂无基金" />
  </div>
</template>
