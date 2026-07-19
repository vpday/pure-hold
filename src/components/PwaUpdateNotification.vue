<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const dismissed = ref(false)
const updating = ref(false)
const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisterError: () => undefined,
})
const visible = computed(() => needRefresh.value && !dismissed.value)

watch(needRefresh, (refreshNeeded) => {
  if (!refreshNeeded) {
    dismissed.value = false
  }
})

async function applyUpdate() {
  updating.value = true
  try {
    await updateServiceWorker().catch(() => undefined)
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="fixed top-4 right-4 z-6000 w-[calc(100%-2rem)] max-w-sm">
    <t-notification
      title="发现新版本"
      content="新版本已准备好，可以立即更新。"
      theme="info"
      :duration="0"
      :close-btn="false"
    >
      <template #footer>
        <t-space>
          <t-button theme="primary" size="small" :loading="updating" @click="applyUpdate">
            立即更新
          </t-button>
          <t-button size="small" variant="outline" :disabled="updating" @click="dismissed = true">
            稍后
          </t-button>
        </t-space>
      </template>
    </t-notification>
  </div>
</template>
