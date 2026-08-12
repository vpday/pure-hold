<script setup lang="ts">
import { ref } from 'vue'
import zhCNConfig from 'tdesign-vue-next/es/locale/zh_CN'

import PwaUpdateNotification from '@/app/components/PwaUpdateNotification.vue'
import SettingsEntry from '@/features/settings/SettingsEntry.vue'
import FundHoldingStatisticsEntry from '@/features/fund-list/FundHoldingStatisticsEntry.vue'
import FundListSection from '@/features/fund-list/FundListSection.vue'
import FundSearchEntry from '@/features/fund-search/FundSearchEntry.vue'
import IndexOverviewSection from '@/features/index-overview/IndexOverviewSection.vue'
import { requestGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'

const globalRefreshing = ref(false)
const fundSearchEntry = ref<{ open: () => void }>()
const settingsEntry = ref<{ open: () => void }>()

async function refreshAllData(): Promise<void> {
  if (globalRefreshing.value) {
    return
  }
  globalRefreshing.value = true
  try {
    await requestGlobalRefresh()
  } finally {
    globalRefreshing.value = false
  }
}
</script>

<template>
  <t-config-provider :global-config="zhCNConfig">
    <PwaUpdateNotification />
    <t-layout class="min-h-screen flex flex-col">
      <t-header>
        <div class="mx-auto w-full max-w-7xl">
          <t-head-menu theme="light" height="120px">
            <template #logo>
              <div class="text-xl">简持</div>
            </template>
            <template #operations>
              <a
                href="javascript:;"
                title="刷新全部数据"
                :disabled="globalRefreshing"
                @click="refreshAllData"
                ><t-icon class="t-menu__operations-icon" name="refresh"
              /></a>
              <a href="javascript:;" title="搜索并添加基金" @click="fundSearchEntry?.open()"
                ><t-icon class="t-menu__operations-icon" name="search"
              /></a>
              <a href="javascript:;" title="设置" @click="settingsEntry?.open()"
                ><t-icon class="t-menu__operations-icon" name="setting"
              /></a>
            </template>
          </t-head-menu>
        </div>
      </t-header>
      <t-content class="flex-1">
        <div class="mx-auto w-full max-w-7xl pt-4">
          <IndexOverviewSection />
          <FundHoldingStatisticsEntry />
          <FundListSection @search-funds="fundSearchEntry?.open()" />
        </div>
      </t-content>
      <t-footer>
        <div class="app-footer-content">
          <div>仅供个人学习及参考使用，使用前请核实，风险自负。</div>
        </div>
      </t-footer>
    </t-layout>
    <FundSearchEntry ref="fundSearchEntry" />
    <SettingsEntry ref="settingsEntry" />
  </t-config-provider>
</template>

<style scoped>
@reference '@/style.css';

.app-footer-content {
  @apply mx-auto flex w-full max-w-7xl items-center justify-center;
}
</style>
