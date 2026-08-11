<script setup lang="ts">
import { ref } from 'vue'

import type {
  FundHoldingStatisticsViewModel,
  FundHoldingStatisticValueViewModel,
} from '../models/fundHoldingStatisticsViewModel'

const props = defineProps<{
  loading: boolean
  viewModel: FundHoldingStatisticsViewModel
}>()
const amountsMasked = ref(false)

function trendClass(trend: FundHoldingStatisticValueViewModel['trend']): string {
  if (amountsMasked.value) return 'text-(--td-text-color-secondary)'
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  return 'text-(--td-text-color-secondary)'
}

function statisticColor(
  trend: FundHoldingStatisticValueViewModel['trend'],
): 'black' | 'green' | 'red' {
  if (amountsMasked.value) return 'black'
  if (trend === 'up') return 'red'
  if (trend === 'down') return 'green'
  return 'black'
}

function toggleAmountMask(): void {
  amountsMasked.value = !amountsMasked.value
}

function formatHoldingAmount(value: number): string {
  if (props.viewModel.holdingAmount.amount === null) return '--'
  if (amountsMasked.value) return '******'
  return `¥${formatAbsolute(value)}`
}

function formatCurrentIncome(value: number): string {
  return formatIncome(value, props.viewModel.currentIncome)
}

function formatYesterdayIncome(value: number): string {
  return formatIncome(value, props.viewModel.yesterdayIncome)
}

function formatHoldingIncome(value: number): string {
  return formatIncome(value, props.viewModel.holdingIncome)
}

function formatRate(rateText: string): string {
  if (rateText === '--') return '--'
  return amountsMasked.value ? '******' : rateText
}

function formatIncome(value: number, statistic: FundHoldingStatisticValueViewModel): string {
  if (statistic.amount === null) return '--'
  if (amountsMasked.value) return '******'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatAbsolute(value)}`
}

function formatAbsolute(value: number): string {
  return Math.abs(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
}
</script>

<template>
  <section aria-label="持仓收益统计" class="mt-4">
    <t-card :bordered="true" class="sm:hidden">
      <div class="flex items-center justify-between gap-2">
        <span class="text-base text-(--td-text-color-secondary)">持仓市值</span>
        <t-button
          :aria-label="amountsMasked ? '显示金额' : '隐藏金额'"
          shape="square"
          size="small"
          variant="text"
          :title="amountsMasked ? '显示金额' : '隐藏金额'"
          @click="toggleAmountMask"
        >
          <template #icon>
            <t-icon :name="amountsMasked ? 'browse-off' : 'browse'" />
          </template>
        </t-button>
      </div>

      <t-statistic
        :value="amountsMasked ? 0 : (viewModel.holdingAmount.amount ?? 0)"
        color="black"
        :format="formatHoldingAmount"
        :loading="loading"
      />

      <div class="mt-4 pt-4 border-t border-(--td-component-stroke)">
        <div class="flex flex-row justify-between text-left">
          <t-skeleton :loading="loading" :row-col="[1, 1, 1]">
            <p class="whitespace-nowrap text-sm text-(--td-text-color-secondary)">
              {{ viewModel.currentIncomeLabel }}
            </p>
            <p
              class="font-mono text-lg font-semibold tabular-nums"
              :class="trendClass(viewModel.currentIncome.trend)"
            >
              {{ formatCurrentIncome(viewModel.currentIncome.amount ?? 0) }}
            </p>
            <p
              class="font-mono text-sm tabular-nums"
              :class="trendClass(viewModel.currentIncome.trend)"
            >
              {{ formatRate(viewModel.currentIncome.rateText) }}
            </p>
          </t-skeleton>
          <t-skeleton :loading="loading" :row-col="[1, 1, 1]">
            <p class="whitespace-nowrap text-sm text-(--td-text-color-secondary)">昨日收益</p>
            <p
              class="font-mono text-lg font-semibold tabular-nums"
              :class="trendClass(viewModel.yesterdayIncome.trend)"
            >
              {{ formatYesterdayIncome(viewModel.yesterdayIncome.amount ?? 0) }}
            </p>
            <p
              class="font-mono text-sm tabular-nums"
              :class="trendClass(viewModel.yesterdayIncome.trend)"
            >
              {{ formatRate(viewModel.yesterdayIncome.rateText) }}
            </p>
          </t-skeleton>
          <t-skeleton :loading="loading" :row-col="[1, 1, 1]">
            <p class="whitespace-nowrap text-sm text-(--td-text-color-secondary)">持仓收益</p>
            <p
              class="font-mono text-lg font-semibold tabular-nums"
              :class="trendClass(viewModel.holdingIncome.trend)"
            >
              {{ formatHoldingIncome(viewModel.holdingIncome.amount ?? 0) }}
            </p>
            <p
              class="font-mono text-sm tabular-nums"
              :class="trendClass(viewModel.holdingIncome.trend)"
            >
              {{ formatRate(viewModel.holdingIncome.rateText) }}
            </p>
          </t-skeleton>
        </div>
      </div>
    </t-card>

    <div class="hidden gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-4">
      <t-card :bordered="true" class="h-full">
        <t-statistic
          :value="amountsMasked ? 0 : (viewModel.holdingAmount.amount ?? 0)"
          color="black"
          :format="formatHoldingAmount"
          :loading="loading"
        >
          <template #title>
            <div class="flex items-center gap-1">
              <span>持仓市值</span>
              <t-button
                :aria-label="amountsMasked ? '显示金额' : '隐藏金额'"
                shape="square"
                size="small"
                variant="text"
                :title="amountsMasked ? '显示金额' : '隐藏金额'"
                @click="toggleAmountMask"
              >
                <template #icon>
                  <t-icon :name="amountsMasked ? 'browse-off' : 'browse'" />
                </template>
              </t-button>
            </div>
          </template>
        </t-statistic>
      </t-card>

      <t-card :bordered="true" class="h-full">
        <t-statistic
          :title="viewModel.currentIncomeLabel"
          :value="amountsMasked ? 0 : (viewModel.currentIncome.amount ?? 0)"
          :color="statisticColor(viewModel.currentIncome.trend)"
          :format="formatCurrentIncome"
          :loading="loading"
        >
          <template #extra>
            <span class="font-mono tabular-nums" :class="trendClass(viewModel.currentIncome.trend)">
              {{ formatRate(viewModel.currentIncome.rateText) }}
            </span>
          </template>
        </t-statistic>
      </t-card>

      <t-card :bordered="true" class="h-full">
        <t-statistic
          title="昨日收益"
          :value="amountsMasked ? 0 : (viewModel.yesterdayIncome.amount ?? 0)"
          :color="statisticColor(viewModel.yesterdayIncome.trend)"
          :format="formatYesterdayIncome"
          :loading="loading"
        >
          <template #extra>
            <span
              class="font-mono tabular-nums"
              :class="trendClass(viewModel.yesterdayIncome.trend)"
            >
              {{ formatRate(viewModel.yesterdayIncome.rateText) }}
            </span>
          </template>
        </t-statistic>
      </t-card>

      <t-card :bordered="true" class="h-full">
        <t-statistic
          title="持仓收益"
          :value="amountsMasked ? 0 : (viewModel.holdingIncome.amount ?? 0)"
          :color="statisticColor(viewModel.holdingIncome.trend)"
          :format="formatHoldingIncome"
          :loading="loading"
        >
          <template #extra>
            <span class="font-mono tabular-nums" :class="trendClass(viewModel.holdingIncome.trend)">
              {{ formatRate(viewModel.holdingIncome.rateText) }}
            </span>
          </template>
        </t-statistic>
      </t-card>
    </div>
  </section>
</template>

<style scoped>
@reference '@/style.css';

:deep(.t-statistic-content-value) {
  @apply font-mono tabular-nums;
}
</style>
