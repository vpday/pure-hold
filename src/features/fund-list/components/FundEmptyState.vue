<script setup lang="ts">
defineProps<{ isAllCategory: boolean }>()
const emit = defineEmits<{ comingSoon: []; search: [] }>()
</script>

<template>
  <div class="mt-4">
    <t-empty v-if="isAllCategory" title="暂无基金">
      <template #action>
        <t-button theme="primary" variant="outline" @click="emit('search')"
          >搜索并添加基金</t-button
        >
      </template>
    </t-empty>
    <t-empty v-else title="当前分组暂无基金" />
  </div>
</template>
