<script setup lang="ts">
import type { TableProps } from 'tdesign-vue-next'

import type {
  FundConversionTableRow,
  FundDividendTableRow,
} from '../models/fundDistributionTableModel'
import type { FundDistributionPanelModel } from '../models/fundPerformancePanel'

defineProps<{ model: FundDistributionPanelModel }>()
const emit = defineEmits<{ retry: [] }>()

const dividendColumns: TableProps<FundDividendTableRow>['columns'] = [
  { colKey: 'equityRecordDate', title: '权益登记日' },
  { colKey: 'exDividendDate', title: '除息日' },
  {
    cell: 'dividend-per-ten-units',
    colKey: 'dividendPerTenUnits',
    title: '每10份分红',
  },
  { colKey: 'paymentDate', title: '分红发放日' },
]
const conversionColumns: TableProps<FundConversionTableRow>['columns'] = [
  { colKey: 'conversionDate', title: '拆分折算日' },
  { colKey: 'conversionType', title: '拆分类型' },
  { cell: 'ratio', colKey: 'ratio', title: '拆分折算比例' },
]
</script>

<template>
  <div class="pt-4">
    <t-alert v-if="model.error" class="mb-4" theme="error" :message="model.error">
      <template #operation>
        <t-button size="small" theme="danger" variant="text" @click="emit('retry')">
          重试
        </t-button>
      </template>
    </t-alert>
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section class="min-w-0">
        <h3 class="mb-3 text-base font-medium">分红送配详情</h3>
        <div class="overflow-x-auto">
          <t-table
            class="min-w-100"
            bordered
            :columns="dividendColumns"
            :data="model.dividends"
            :empty="model.hasLoaded ? '暂无分红送配记录' : ''"
            :loading="model.isLoading"
            row-key="rowKey"
            size="small"
            table-layout="auto"
          >
            <template #dividend-per-ten-units="{ row }">
              <span class="font-mono tabular-nums">{{ row.dividendPerTenUnits }}</span>
            </template>
          </t-table>
        </div>
      </section>
      <section class="min-w-0">
        <h3 class="mb-3 text-base font-medium">拆分详情</h3>
        <div class="overflow-x-auto">
          <t-table
            bordered
            :columns="conversionColumns"
            :data="model.conversions"
            :empty="model.hasLoaded ? '暂无份额折算记录' : ''"
            :loading="model.isLoading"
            row-key="rowKey"
            size="small"
            table-layout="auto"
          >
            <template #ratio="{ row }">
              <span class="font-mono tabular-nums">{{ row.ratio }}</span>
            </template>
          </t-table>
        </div>
      </section>
    </div>
  </div>
</template>
