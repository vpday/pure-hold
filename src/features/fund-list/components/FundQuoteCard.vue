<script setup lang="ts">
import { ref } from 'vue'

import type { FundRowViewModel, FundTrend } from '../models/fundListViewModel'
import { formatEstimatedDisplayDate, formatNavDisplayDate } from '../presenters/formatFundDates'
import { fundTagTheme, isEstimatedQuoteEmpty } from '../presenters/fundDisplayRules'
import FundActions from './FundActions.vue'

defineProps<{ holdingMode: boolean; row: FundRowViewModel }>()
const emit = defineEmits<{
  comingSoon: []
  delete: [code: string]
  detail: [code: string]
  edit: [code: string]
}>()
const actionsVisible = ref(false)

function trendClass(trend: FundTrend): string {
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  return 'text-(--td-text-color-primary)'
}

function isPlaceholderPair(first: string, second: string): boolean {
  return first === '--' && second === '--'
}
</script>

<template>
  <t-card :bordered="true" class="w-full">
    <div class="flex items-start justify-between gap-3">
      <button type="button" class="min-w-0 flex-1 text-left" @click="emit('detail', row.code)">
        <span class="block font-medium">{{ row.name }}</span>
        <span class="block font-mono text-xs tabular-nums text-(--td-text-color-secondary)">
          {{ row.code }}
        </span>
        <span v-if="row.tags.length" class="mt-1 flex flex-wrap gap-1">
          <t-tag
            v-for="tag in row.tags"
            :key="tag"
            size="small"
            :theme="fundTagTheme(tag)"
            variant="light"
          >
            {{ tag }}
          </t-tag>
        </span>
      </button>
      <t-button
        shape="square"
        variant="text"
        :aria-label="actionsVisible ? '收起基金操作' : '展开基金操作'"
        @click.stop="actionsVisible = !actionsVisible"
      >
        <template #icon><t-icon :name="actionsVisible ? 'chevron-up' : 'more'" /></template>
      </t-button>
    </div>

    <div class="mt-4 grid gap-3" :class="holdingMode ? 'grid-cols-3' : 'grid-cols-2'">
      <div v-if="holdingMode && row.holding">
        <p class="text-xs text-(--td-text-color-secondary)">
          {{ row.holding.currentIncome.label }}
        </p>
        <p
          v-if="
            isPlaceholderPair(
              row.holding.currentIncome.amountText,
              row.holding.currentIncome.percentText,
            )
          "
          class="font-mono font-medium tabular-nums"
        >
          --
        </p>
        <template v-else>
          <p
            class="font-mono font-medium tabular-nums"
            :class="trendClass(row.holding.currentIncome.trend)"
          >
            {{ row.holding.currentIncome.amountText }}
          </p>
          <p class="font-mono tabular-nums" :class="trendClass(row.holding.currentIncome.trend)">
            {{ row.holding.currentIncome.percentText }}
          </p>
        </template>
      </div>
      <div>
        <p class="text-xs text-(--td-text-color-secondary)">净值估算</p>
        <p v-if="isEstimatedQuoteEmpty(row)" class="font-mono text-base font-medium tabular-nums">
          --
        </p>
        <template v-else>
          <p class="font-mono font-medium tabular-nums">{{ row.estimatedNavText }}</p>
          <p
            class="font-mono tabular-nums"
            :class="trendClass(row.trendByField.estimatedChangePercent)"
          >
            {{ row.estimatedChangePercentText }}
          </p>
          <p
            v-if="row.estimatedAtText !== '--'"
            class="font-mono text-xs tabular-nums text-(--td-text-color-placeholder)"
          >
            {{ formatEstimatedDisplayDate(row.estimatedAtText) }}
          </p>
        </template>
      </div>
      <div>
        <p class="text-xs text-(--td-text-color-secondary)">单位净值</p>
        <p
          v-if="isPlaceholderPair(row.navText, row.dailyChangePercentText)"
          class="font-mono font-medium tabular-nums"
        >
          --
        </p>
        <template v-else>
          <p class="font-mono font-medium tabular-nums">{{ row.navText }}</p>
          <p
            class="font-mono tabular-nums"
            :class="trendClass(row.trendByField.dailyChangePercent)"
          >
            {{ row.dailyChangePercentText }}
          </p>
        </template>
        <p
          v-if="row.navDateText !== '--'"
          class="font-mono text-xs tabular-nums text-(--td-text-color-placeholder)"
        >
          {{ formatNavDisplayDate(row.navDateText) }}
        </p>
      </div>
    </div>

    <div v-if="holdingMode && row.holding" class="fund-holding-scroll">
      <div class="fund-holding-grid">
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">昨日收益</p>
          <p
            v-if="
              isPlaceholderPair(
                row.holding.yesterdayIncome.amountText,
                row.holding.yesterdayIncome.percentText,
              )
            "
            class="font-mono tabular-nums"
          >
            --
          </p>
          <template v-else>
            <p
              class="font-mono tabular-nums"
              :class="trendClass(row.holding.yesterdayIncome.trend)"
            >
              {{ row.holding.yesterdayIncome.amountText }}
            </p>
            <p
              class="font-mono text-xs tabular-nums"
              :class="trendClass(row.holding.yesterdayIncome.trend)"
            >
              {{ row.holding.yesterdayIncome.percentText }}
            </p>
          </template>
          <p
            v-if="row.holding.yesterdayIncomeDateText !== '--'"
            class="font-mono text-xs tabular-nums text-(--td-text-color-placeholder)"
          >
            {{ formatNavDisplayDate(row.holding.yesterdayIncomeDateText) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">持仓收益</p>
          <p
            v-if="
              isPlaceholderPair(
                row.holding.holdingIncome.amountText,
                row.holding.holdingIncome.percentText,
              )
            "
            class="font-mono tabular-nums"
          >
            --
          </p>
          <template v-else>
            <p class="font-mono tabular-nums" :class="trendClass(row.holding.holdingIncome.trend)">
              {{ row.holding.holdingIncome.amountText }}
            </p>
            <p
              class="font-mono text-xs tabular-nums"
              :class="trendClass(row.holding.holdingIncome.trend)"
            >
              {{ row.holding.holdingIncome.percentText }}
            </p>
          </template>
        </div>
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">持仓金额</p>
          <p class="font-mono tabular-nums">{{ row.holding.holdingAmountText }}</p>
        </div>
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">持有天数</p>
          <p class="font-mono tabular-nums">{{ row.holding.holdingDaysText }}</p>
        </div>
      </div>
    </div>

    <div class="fund-returns-scroll">
      <div class="fund-returns-grid">
        <div
          v-for="item in [
            ['oneWeek', '近1周'],
            ['oneMonth', '近1月'],
            ['threeMonths', '近3月'],
            ['sixMonths', '近6月'],
            ['yearToDate', '今年以来'],
            ['oneYear', '近1年'],
            ['twoYears', '近2年'],
            ['threeYears', '近3年'],
            ['fiveYears', '近5年'],
            ['sinceInception', '成立以来'],
          ]"
          :key="item[0]"
        >
          <p class="text-xs text-(--td-text-color-secondary)">{{ item[1] }}</p>
          <p
            class="font-mono tabular-nums"
            :class="trendClass(row.trendByField[item[0] as keyof typeof row.trendByField])"
          >
            {{ row.returns[item[0] as keyof typeof row.returns] }}
          </p>
        </div>
      </div>
    </div>
    <div v-if="actionsVisible" class="mt-4 border-t border-(--td-component-border) pt-3">
      <FundActions
        :code="row.code"
        :name="row.name"
        @coming-soon="emit('comingSoon')"
        @delete="emit('delete', $event)"
        @edit="emit('edit', $event)"
      />
    </div>
  </t-card>
</template>

<style scoped>
@reference '@/style.css';

.fund-returns-scroll {
  @apply mt-4 overflow-x-auto overscroll-contain scrollbar-thin;
}

.fund-holding-scroll {
  @apply mt-4 overflow-x-auto overscroll-contain scrollbar-thin;
}

.fund-holding-grid {
  @apply grid min-w-sm grid-cols-4 gap-x-3 text-left;
}

.fund-returns-grid {
  @apply grid grid-cols-5 gap-x-1 gap-y-2 text-left min-w-sm;
}
</style>
