<script setup lang="ts">
import type { TableProps } from 'tdesign-vue-next'

import type {
  FundLedgerViewModel,
  LedgerRecordViewModel,
} from '../presenters/toFundLedgerViewModel'

defineProps<{
  ledger: FundLedgerViewModel
  transactions: readonly LedgerRecordViewModel[]
}>()
const emit = defineEmits<{
  correct: []
  deleteTransaction: [eventId: string]
  editTransaction: [eventId: string]
  recordBuy: [code: string]
  recordSell: [code: string]
}>()

const transactionColumns: TableProps<LedgerRecordViewModel>['columns'] = [
  { cell: 'kind', colKey: 'kind', title: '类型', fixed: 'left' },
  { cell: 'date', colKey: 'dateText', title: '日期' },
  { cell: 'units', colKey: 'units', title: '份额' },
  { cell: 'amount', colKey: 'amount', title: '金额' },
  { cell: 'fee', colKey: 'fee', title: '费用' },
  { cell: 'cost', colKey: 'costBasisAmount', title: '成本基础' },
  { cell: 'status', colKey: 'status', title: '状态' },
  { cell: 'actions', colKey: 'actions', title: '操作', fixed: 'right' },
]

function deleteConfirmationText(transaction: LedgerRecordViewModel): string {
  return transaction.kind === 'buy' ? '删除这条买入记录？' : '删除这条卖出记录？'
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="fund-detail-transactions-title" class="section-title">成交记录</h2>
      <div v-if="ledger.canRecord || ledger.canCorrect" class="flex items-center gap-2">
        <t-button
          v-if="ledger.canRecord"
          size="small"
          theme="default"
          variant="outline"
          @click="emit('recordBuy', ledger.fundCode)"
        >
          记录买入
        </t-button>
        <t-button
          v-if="ledger.canRecord"
          size="small"
          theme="default"
          variant="outline"
          @click="emit('recordSell', ledger.fundCode)"
        >
          记录卖出
        </t-button>
        <t-button
          v-if="ledger.canCorrect"
          size="small"
          theme="primary"
          variant="outline"
          @click="emit('correct')"
        >
          手工修正
        </t-button>
      </div>
    </div>

    <div class="mt-4">
      <t-table
        bordered
        :columns="transactionColumns"
        :data="transactions"
        empty="暂无成交记录"
        row-key="id"
        size="small"
        table-layout="auto"
        table-content-width="1110px"
      >
        <template #kind="{ row }">
          <span>{{ row.kindText }}</span>
          <span class="block text-xs text-(--td-text-color-secondary)">{{ row.sourceText }}</span>
        </template>
        <template #date="{ row }">
          <span class="font-mono tabular-nums">{{ row.dateText }}</span>
          <span
            v-if="row.submittedAtText !== '--'"
            class="block text-xs text-(--td-text-color-secondary)"
          >
            提交 {{ row.submittedAtText }}
          </span>
        </template>
        <template #units="{ row }">
          <span class="font-mono tabular-nums">{{ row.units.text }}</span>
          <span
            v-if="row.units.text !== '--'"
            class="ml-1 text-xs text-(--td-text-color-secondary)"
          >
            {{ row.units.confidenceText }}
          </span>
        </template>
        <template #amount="{ row }">
          <span class="block font-mono tabular-nums">
            <template v-if="row.amountLabel">{{ row.amountLabel }} </template>{{ row.amount.text }}
          </span>
          <span v-if="row.reasonText" class="text-xs text-(--td-text-color-secondary)">
            {{ row.reasonText }}
          </span>
        </template>
        <template #fee="{ row }">
          <span class="font-mono tabular-nums">
            <template v-if="row.feeLabel">{{ row.feeLabel }} </template>{{ row.fee.text }}
          </span>
          <span v-if="row.fee.text !== '--'" class="ml-1 text-xs text-(--td-text-color-secondary)">
            {{ row.fee.confidenceText }}
            <template v-if="row.fee.sourceVisible"> · {{ row.fee.sourceText }}</template>
          </span>
        </template>
        <template #cost="{ row }">
          <span class="block font-mono tabular-nums">
            <template v-if="row.costBasisLabel">{{ row.costBasisLabel }} </template
            >{{ row.costBasisAmount.text }}
          </span>
          <span v-if="row.unitNav.text !== '--'" class="text-xs text-(--td-text-color-secondary)">
            净值 {{ row.unitNav.text }} · {{ row.navDateText }}
          </span>
        </template>
        <template #status="{ row }">
          <t-tag size="small" :theme="row.statusTone" variant="light">
            {{ row.statusText }}
          </t-tag>
        </template>
        <template #actions="{ row }">
          <div v-if="row.canEdit || row.canDelete" class="flex items-center gap-1">
            <t-button
              v-if="row.canEdit"
              size="small"
              variant="text"
              @click="emit('editTransaction', row.id)"
            >
              编辑
            </t-button>
            <t-popconfirm
              v-if="row.canDelete"
              :cancel-btn="{ content: '取消', variant: 'outline' }"
              :confirm-btn="{ content: '删除', theme: 'danger' }"
              :content="deleteConfirmationText(row)"
              placement="top-right"
              :popup-props="{ attach: 'body' }"
              theme="warning"
              @confirm="emit('deleteTransaction', row.id)"
            >
              <t-button size="small" theme="danger" variant="text">删除</t-button>
            </t-popconfirm>
          </div>
        </template>
      </t-table>
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.section-title {
  @apply text-lg font-medium text-(--td-text-color-primary);
}
</style>
