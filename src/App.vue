<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin as $Message } from 'tdesign-vue-next'
import zhCNConfig from 'tdesign-vue-next/es/locale/zh_CN'

import PwaUpdateNotification from '@/app/components/PwaUpdateNotification.vue'
import {
  createPortfolioCoordinator,
  type EnsureFundLedgerResult,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { createPortfolioRuntime } from '@/app/portfolio/createPortfolioRuntime.ts'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore.ts'
import SettingsEntry from '@/features/settings/SettingsEntry.vue'
import FundHoldingStatisticsEntry from '@/features/fund-list/FundHoldingStatisticsEntry.vue'
import FundListSection from '@/features/fund-list/FundListSection.vue'
import FundSearchEntry from '@/features/fund-search/FundSearchEntry.vue'
import IndexOverviewSection from '@/features/index-overview/IndexOverviewSection.vue'
import { requestGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'

const globalRefreshing = ref(false)
const fundSearchEntry = ref<{ open: () => void }>()
const settingsEntry = ref<{ open: () => void }>()
const fundsStore = useFundsStore()
const portfolio = createPortfolioRuntime()
const portfolioCoordinator = createPortfolioCoordinator({
  funds: {
    deleteFund: fundsStore.deleteFund,
    getSettingsSnapshot: fundsStore.getSettingsSnapshot,
    replaceHoldingProjection: fundsStore.replaceHoldingProjection,
    replaceSettingsPersisted: fundsStore.replaceSettingsPersisted,
    updateHoldingMetadata: fundsStore.updateHoldingMetadata,
  },
  portfolio,
})

try {
  const startupRebuild = portfolioCoordinator.rebuildHoldingProjections({
    asOfDate: todayInShanghai(),
  })
  if (startupRebuild.status !== 'synced' || startupRebuild.failure?.persistence === 'partial') {
    console.warn('启动账本持仓重建未完成。', startupRebuild)
  }
} catch (error) {
  console.warn('启动账本持仓重建失败。', error)
}

function ensureFundLedger(fundCode: string): EnsureFundLedgerResult {
  return portfolioCoordinator.ensureFundLedger({ fundCode })
}

async function refreshAllData(): Promise<void> {
  if (globalRefreshing.value) {
    return
  }
  globalRefreshing.value = true
  const msg = $Message.info({ content: '刷新中', duration: 0 })
  try {
    await requestGlobalRefresh()
  } finally {
    $Message.close(msg)
    globalRefreshing.value = false
  }
  $Message.success({ content: '刷新完成' })
}

function todayInShanghai(): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
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
              <div class="flex items-center gap-2 text-xl">
                <img
                  src="/icon.svg"
                  alt=""
                  aria-hidden="true"
                  class="size-10 shrink-0"
                  width="40"
                  height="40"
                />
                <span>简持</span>
              </div>
            </template>
            <template #operations>
              <t-button
                title="刷新全部数据"
                aria-label="刷新全部数据"
                shape="square"
                variant="text"
                :disabled="globalRefreshing"
                @click="refreshAllData"
              >
                <template #icon>
                  <t-icon name="refresh" aria-hidden="true" />
                </template>
              </t-button>
              <t-button
                title="搜索并添加基金"
                aria-label="搜索并添加基金"
                shape="square"
                variant="text"
                @click="fundSearchEntry?.open()"
              >
                <template #icon>
                  <t-icon name="search" aria-hidden="true" />
                </template>
              </t-button>
              <t-button
                title="设置"
                aria-label="设置"
                shape="square"
                variant="text"
                @click="settingsEntry?.open()"
              >
                <template #icon>
                  <t-icon name="setting" aria-hidden="true" />
                </template>
              </t-button>
            </template>
          </t-head-menu>
        </div>
      </t-header>
      <t-content class="flex-1">
        <div class="app-content">
          <IndexOverviewSection />
          <FundHoldingStatisticsEntry />
          <FundListSection
            :portfolio="portfolio"
            :portfolio-coordinator="portfolioCoordinator"
            @search-funds="fundSearchEntry?.open()"
          />
        </div>
      </t-content>
      <t-footer>
        <div class="app-footer-content">
          <div>仅供个人学习及参考使用，使用前请核实，风险自负。</div>
        </div>
      </t-footer>
    </t-layout>
    <FundSearchEntry ref="fundSearchEntry" :ensure-fund-ledger="ensureFundLedger" />
    <SettingsEntry
      ref="settingsEntry"
      :portfolio="portfolio"
      :portfolio-coordinator="portfolioCoordinator"
    />
  </t-config-provider>
</template>

<style scoped>
@reference '@/style.css';

.app-footer-content {
  @apply mx-auto flex w-full max-w-7xl items-center justify-center;
}

.app-content {
  @apply mx-auto w-full max-w-7xl pt-4 pl-0 pr-0 sm:pl-6 sm:pr-4;
}
</style>
