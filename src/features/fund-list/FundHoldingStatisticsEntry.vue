<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { calculateFundHoldingMetrics } from '@/domains/funds/models/fundHoldingMetrics'
import { calculateFundHoldingStatistics } from '@/domains/funds/models/fundHoldingStatistics'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import FundHoldingStatistics from './components/FundHoldingStatistics.vue'
import { toFundHoldingStatisticsViewModel } from './presenters/toFundHoldingStatisticsViewModel'

const store = useFundsStore()
const { holdingOrder, holdingsByCode, isRefreshing, previousSnapshotsByCode, snapshotsByCode } =
  storeToRefs(store)

const visible = computed(() => holdingOrder.value.length > 0)
const viewModel = computed(() => {
  const today = shanghaiDate()
  const items = holdingOrder.value.flatMap((code) => {
    const currentSnapshot = snapshotsByCode.value[code]
    const holding = holdingsByCode.value[code]
    if (!currentSnapshot || !holding) return []

    return [
      {
        currentSnapshot,
        holding,
        metrics: calculateFundHoldingMetrics({
          currentSnapshot,
          holding,
          previousConfirmedSnapshot: previousSnapshotsByCode.value[code],
          today,
        }),
        previousConfirmedSnapshot: previousSnapshotsByCode.value[code],
        today,
      },
    ]
  })

  return toFundHoldingStatisticsViewModel({
    fundCount: holdingOrder.value.length,
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
