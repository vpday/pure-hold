<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { calculateFundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics'
import { calculateFundHoldingStatistics } from '@/domains/funds/models/fundHoldingStatistics'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import FundHoldingStatistics from './components/FundHoldingStatistics.vue'
import { toFundHoldingStatisticsViewModel } from './presenters/toFundHoldingStatisticsViewModel'

const store = useFundsStore()
const {
  holdingOrder,
  holdingsByCode,
  isRefreshing,
  previousConfirmedMarketDataByCode,
  marketDataByCode,
} = storeToRefs(store)

const activeHoldingOrder = computed(() =>
  holdingOrder.value.filter((code) => (holdingsByCode.value[code]?.units ?? 0) > 0),
)
const visible = computed(() => activeHoldingOrder.value.length > 0)
const viewModel = computed(() => {
  const today = shanghaiDate()
  const items = activeHoldingOrder.value.flatMap((code) => {
    const currentMarketData = marketDataByCode.value[code]
    const holding = holdingsByCode.value[code]
    if (!currentMarketData || !holding) return []

    return [
      {
        currentMarketData,
        holding,
        metrics: calculateFundHoldingMetrics({
          currentMarketData,
          holding,
          previousConfirmedMarketData: previousConfirmedMarketDataByCode.value[code],
          today,
        }),
        previousConfirmedMarketData: previousConfirmedMarketDataByCode.value[code],
        today,
      },
    ]
  })

  return toFundHoldingStatisticsViewModel({
    fundCount: activeHoldingOrder.value.length,
    statistics: calculateFundHoldingStatistics(items),
  })
})
const loading = computed(() => isRefreshing.value && !hasUsableValue(viewModel.value))

function hasUsableValue(model: typeof viewModel.value): boolean {
  return [
    model.currentIncome.amount,
    model.holdingAmount.amount,
    model.holdingIncome.amount,
    model.yesterdayIncome.amount,
  ].some((value) => value !== null)
}

function shanghaiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
</script>

<template>
  <FundHoldingStatistics v-if="visible" :loading="loading" :view-model="viewModel" />
</template>
