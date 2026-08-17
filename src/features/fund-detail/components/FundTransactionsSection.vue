<script setup lang="ts">
import type { TableProps } from 'tdesign-vue-next'

import type { BuyTransactionViewModel } from '@/features/fund-transaction/presenters/toBuyTransactionViewModel.ts'
import type {
  SellTransactionIssueViewModel,
  SellTransactionViewModel,
} from '@/features/fund-transaction/presenters/toSellTransactionViewModel.ts'

type FundTransactionViewModel =
  | (BuyTransactionViewModel & { readonly kind: 'buy' })
  | (SellTransactionViewModel & { readonly kind: 'sell' })

defineProps<{
  code: string
  ledgerEnabled: boolean
  sellIssues: readonly SellTransactionIssueViewModel[]
  transactions: readonly FundTransactionViewModel[]
}>()
const emit = defineEmits<{
  deleteTransaction: [eventId: string]
  editTransaction: [eventId: string]
  recordBuy: [code: string]
  recordSell: [code: string]
}>()

const transactionColumns: TableProps<FundTransactionViewModel>['columns'] = [
  { cell: 'kind', colKey: 'kind', title: '类型', fixed: 'left' },
  { cell: 'submitted-at', colKey: 'submittedAtText', title: '提交时间' },
  { cell: 'nav-date', colKey: 'navDateText', title: '净值日期' },
  { cell: 'confirmed-date', colKey: 'confirmedDateText', title: '确认/预计确认' },
  { cell: 'units', colKey: 'units', title: '份额' },
  { cell: 'unit-nav', colKey: 'unitNav', title: '单位净值' },
  { cell: 'amount', colKey: 'amount', title: '金额' },
  { cell: 'fee', colKey: 'fee', title: '费用' },
  { cell: 'result', colKey: 'result', title: '收益/状态' },
  { cell: 'actions', colKey: 'actions', title: '操作', fixed: 'right' },
]
function confirmedDateText(transaction: FundTransactionViewModel): string {
  return transaction.confirmedDateText !== '--'
    ? transaction.confirmedDateText
    : transaction.expectedConfirmationDateText
}

function deleteConfirmationText(transaction: FundTransactionViewModel): string {
  return transaction.kind === 'buy'
    ? '删除这条买入记录？删除后会重新计算持仓。'
    : '删除这条卖出记录？删除后会重新计算移动平均成本和收益。'
}
</script>

<template>
  <section
    id="fund-detail-transactions"
    aria-labelledby="fund-detail-transactions-title"
    class="detail-section pt-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="fund-detail-transactions-title" class="section-title">成交记录</h2>
      <div v-if="ledgerEnabled" class="flex items-center gap-2">
        <t-button size="small" theme="default" variant="outline" @click="emit('recordBuy', code)">
          记录买入
        </t-button>
        <t-button size="small" theme="default" variant="outline" @click="emit('recordSell', code)">
          记录卖出
        </t-button>
      </div>
    </div>

    <div class="mt-4">
      <t-table
        bordered
        :columns="transactionColumns"
        :data="transactions"
        empty="暂无交易记录"
        row-key="id"
        size="small"
        table-layout="auto"
        table-content-width="1100px"
      >
        <template #kind="{ row }">
          <span>{{ row.kind === 'buy' ? '买入' : '卖出' }}</span>
        </template>
        <template #submitted-at="{ row }">
          <span class="font-mono tabular-nums">{{ row.submittedAtText }}</span>
        </template>
        <template #nav-date="{ row }">
          <span class="font-mono tabular-nums">{{ row.navDateText }}</span>
        </template>
        <template #confirmed-date="{ row }">
          <span class="font-mono tabular-nums">{{ confirmedDateText(row) }}</span>
        </template>
        <template #units="{ row }">
          <span class="font-mono tabular-nums">{{ row.units.text }}</span>
          <span v-if="row.kind === 'sell'" class="ml-1 text-xs text-(--td-text-color-secondary)">
            {{ row.units.confidenceText }} · {{ row.units.sourceText }}
          </span>
        </template>
        <template #unit-nav="{ row }">
          <span class="font-mono tabular-nums">{{ row.unitNav.text }}</span>
          <span class="ml-1 text-xs text-(--td-text-color-secondary)">
            <template v-if="row.kind === 'buy'">{{ row.unitNav.sourceText }}</template>
            <template v-else>
              {{ row.unitNav.confidenceText }} · {{ row.unitNav.sourceText }}
            </template>
          </span>
        </template>
        <template #amount="{ row }">
          <template v-if="row.kind === 'buy'">
            <span class="font-mono tabular-nums">{{ row.totalAmount.text }}</span>
          </template>
          <template v-else>
            <span class="block font-mono tabular-nums">毛 {{ row.grossAmount.text }}</span>
            <span class="text-xs text-(--td-text-color-secondary)">
              净 {{ row.netAmount.text }}
            </span>
          </template>
        </template>
        <template #fee="{ row }">
          <template v-if="row.kind === 'buy'">
            <span class="font-mono tabular-nums">{{ row.purchaseFee.text }}</span>
          </template>
          <template v-else>
            <span class="font-mono tabular-nums">{{ row.redemptionFee.text }}</span>
            <span class="ml-1 text-xs text-(--td-text-color-secondary)">
              {{ row.redemptionFee.confidenceText }} · {{ row.redemptionFee.sourceText }}
            </span>
          </template>
        </template>
        <template #result="{ row }">
          <template v-if="row.kind === 'buy'">
            <t-tag
              size="small"
              :theme="row.status === 'settled-nav-ready' ? 'success' : 'warning'"
              variant="light"
            >
              {{ row.statusText }}
            </t-tag>
          </template>
          <template v-else>
            <span class="block text-xs text-(--td-text-color-secondary)">
              成本基础 {{ row.costBasisAmount.text }}
            </span>
            <span class="block">{{ row.realizedGain.text }}</span>
            <span class="text-xs text-(--td-text-color-secondary)">
              {{ row.realizedGainStatusText }}
            </span>
            <t-tag
              class="mt-1"
              size="small"
              :theme="row.status === 'settled-nav-ready' ? 'success' : 'warning'"
              variant="light"
            >
              {{ row.statusText }}
            </t-tag>
          </template>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center gap-1">
            <t-button size="small" variant="text" @click="emit('editTransaction', row.id)">
              编辑
            </t-button>
            <t-popconfirm
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

    <div
      v-if="sellIssues.length"
      class="mt-4 rounded-md bg-(--td-error-color-light-9) p-3 text-(--td-error-color)"
    >
      <p class="font-medium">卖出校验问题</p>
      <ul class="mt-1 list-disc pl-5">
        <li v-for="issue in sellIssues" :key="issue.eventId">{{ issue.text }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
@reference '@/style.css';

.detail-section {
  @apply mt-4 border-t border-(--td-component-border);
}

.section-title {
  @apply text-lg font-medium text-(--td-text-color-primary);
}
</style>
