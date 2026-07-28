<script setup lang="ts">
import { ref } from 'vue'

import type { FundRowViewModel, FundTrend } from '../models/fundListViewModel'
import { formatEstimatedDisplayDate, formatNavDisplayDate } from '../presenters/formatFundDates'
import { fundTagTheme, isEstimatedQuoteEmpty } from '../presenters/fundDisplayRules'
import FundActions from './FundActions.vue'

defineProps<{ row: FundRowViewModel }>()
const emit = defineEmits<{ comingSoon: []; delete: [code: string]; edit: [code: string] }>()
const actionsVisible = ref(false)

function trendClass(trend: FundTrend): string {
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  return 'text-(--td-text-color-primary)'
}
</script>

<template>
  <t-card :bordered="true" class="w-full">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="font-medium">{{ row.name }}</h3>
        <p class="font-mono text-xs tabular-nums text-(--td-text-color-secondary)">
          {{ row.code }}
        </p>
        <div v-if="row.tags.length" class="mt-1 flex flex-wrap gap-1">
          <t-tag
            v-for="tag in row.tags"
            :key="tag"
            size="small"
            :theme="fundTagTheme(tag)"
            variant="light"
          >
            {{ tag }}
          </t-tag>
        </div>
      </div>
      <t-button
        shape="square"
        variant="text"
        :aria-label="actionsVisible ? '收起基金操作' : '展开基金操作'"
        @click="actionsVisible = !actionsVisible"
      >
        <template #icon><t-icon :name="actionsVisible ? 'chevron-up' : 'more'" /></template>
      </t-button>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3">
      <div>
        <p class="text-xs text-(--td-text-color-secondary)">净值估算</p>
        <p v-if="isEstimatedQuoteEmpty(row)" class="font-mono text-lg font-medium tabular-nums">
          --
        </p>
        <template v-else>
          <p class="font-mono text-lg font-medium tabular-nums">{{ row.estimatedNavText }}</p>
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
        <p class="font-mono text-lg font-medium tabular-nums">{{ row.navText }}</p>
        <p class="font-mono tabular-nums" :class="trendClass(row.trendByField.dailyChangePercent)">
          {{ row.dailyChangePercentText }}
        </p>
        <p
          v-if="row.navDateText !== '--'"
          class="font-mono text-xs tabular-nums text-(--td-text-color-placeholder)"
        >
          {{ formatNavDisplayDate(row.navDateText) }}
        </p>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-4 gap-x-3 gap-y-3 text-left">
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
