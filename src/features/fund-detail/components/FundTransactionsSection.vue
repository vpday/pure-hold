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
  deleteTransaction: [eventId: string]
  editTransaction: [eventId: string]
  recordBuy: [code: string]
  recordSell: [code: string]
}>()

const transactionColumns: TableProps<LedgerRecordViewModel>['columns'] = [
  { cell: 'kind', colKey: 'kind', title: '类型', fixed: 'left' },
  { cell: 'date', colKey: 'dateText', title: '日期' },
  { cell: 'units', colKey: 'units', title: '份额摘要' },
  { cell: 'amount', colKey: 'amount', title: '金额摘要' },
  { cell: 'fee', colKey: 'fee', title: '费用' },
  { cell: 'cost', colKey: 'costBasisAmount', title: '成本基础' },
  { cell: 'result', colKey: 'realizedGain', title: '收益/说明' },
  { cell: 'status', colKey: 'status', title: '状态' },
  { cell: 'actions', colKey: 'actions', title: '操作', fixed: 'right' },
]

function deleteConfirmationText(transaction: LedgerRecordViewModel): string {
  return transaction.kind === 'buy'
    ? '删除这条买入记录？删除后会重新计算账本汇总。'
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
      <h2 id="fund-detail-transactions-title" class="section-title">账本记录</h2>
      <div v-if="ledger.ledgerEnabled" class="flex items-center gap-2">
        <t-button
          size="small"
          theme="default"
          variant="outline"
          @click="emit('recordBuy', ledger.fundCode)"
        >
          记录买入
        </t-button>
        <t-button
          size="small"
          theme="default"
          variant="outline"
          @click="emit('recordSell', ledger.fundCode)"
        >
          记录卖出
        </t-button>
      </div>
    </div>

    <div class="ledger-summary mt-4" aria-label="账本汇总">
      <h3 class="font-medium">聚合持仓与收益</h3>
      <dl class="summary-grid mt-3">
        <div>
          <dt>账本份额</dt>
          <dd>{{ ledger.summary.units.text }}</dd>
        </div>
        <div>
          <dt>累计成本</dt>
          <dd>{{ ledger.summary.costAmount.text }}</dd>
        </div>
        <div>
          <dt>平均成本</dt>
          <dd>{{ ledger.summary.averageCost.text }}</dd>
        </div>
        <div>
          <dt>已实现收益</dt>
          <dd>{{ ledger.summary.realizedGain.text }}</dd>
        </div>
        <div>
          <dt>现金分红</dt>
          <dd>{{ ledger.summary.cashDividend.text }}</dd>
        </div>
        <div>
          <dt>总收益</dt>
          <dd>{{ ledger.summary.totalGain.text }}</dd>
        </div>
      </dl>
      <p class="mt-3 text-xs text-(--td-text-color-secondary)">
        汇总来自已结算事件；待确认或缺少事实的指标保留为空值。
      </p>
    </div>

    <div class="ledger-reconciliation mt-4" aria-label="持仓对账">
      <h3 class="font-medium">持仓对账</h3>
      <div v-if="ledger.fundHolding && ledger.position" class="reconciliation-grid mt-3">
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">当前 FundHolding</p>
          <p>份额 {{ ledger.fundHolding.units.text }}</p>
          <p>成本 {{ ledger.fundHolding.costAmount.text }}</p>
        </div>
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">账本聚合</p>
          <p>份额 {{ ledger.position.units.text }}</p>
          <p>成本 {{ ledger.position.costAmount.text }}</p>
        </div>
        <div>
          <p class="text-xs text-(--td-text-color-secondary)">对账差异</p>
          <p>份额 {{ ledger.difference.units.text }}</p>
          <p>成本 {{ ledger.difference.costAmount.text }}</p>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-(--td-text-color-secondary)">
        {{ ledger.availabilityText }}，暂不能进行持仓对账。
      </p>
      <p
        v-if="ledger.fundHolding && ledger.position && !ledger.difference.hasDifference"
        class="mt-3 text-sm text-(--td-success-color)"
      >
        当前 FundHolding 与账本聚合一致。
      </p>
      <p
        v-else-if="ledger.fundHolding && ledger.position && ledger.difference.hasDifference"
        class="mt-3 text-sm text-(--td-warning-color)"
      >
        当前 FundHolding 与账本聚合存在差异；账本不会自动写回基金设置。
      </p>
    </div>

    <div class="mt-4">
      <t-table
        bordered
        :columns="transactionColumns"
        :data="transactions"
        empty="暂无账本记录"
        row-key="id"
        size="small"
        table-layout="auto"
        table-content-width="1250px"
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
            {{ row.units.confidenceText }} · {{ row.units.sourceText }}
          </span>
        </template>
        <template #amount="{ row }">
          <span class="block font-mono tabular-nums"
            >{{ row.amountLabel }} {{ row.amount.text }}</span
          >
          <span v-if="row.reasonText" class="text-xs text-(--td-text-color-secondary)">
            {{ row.reasonText }}
          </span>
        </template>
        <template #fee="{ row }">
          <span class="font-mono tabular-nums">{{ row.feeLabel }} {{ row.fee.text }}</span>
          <span v-if="row.fee.text !== '--'" class="ml-1 text-xs text-(--td-text-color-secondary)">
            {{ row.fee.confidenceText }} · {{ row.fee.sourceText }}
          </span>
        </template>
        <template #cost="{ row }">
          <span class="block font-mono tabular-nums"
            >{{ row.costBasisLabel }} {{ row.costBasisAmount.text }}</span
          >
          <span v-if="row.unitNav.text !== '--'" class="text-xs text-(--td-text-color-secondary)">
            净值 {{ row.unitNav.text }} · {{ row.navDateText }} · {{ row.unitNav.sourceText }}
          </span>
        </template>
        <template #result="{ row }">
          <span v-if="row.kind === 'sell'" class="block font-mono tabular-nums">
            {{ row.realizedGain.text }}
          </span>
          <span v-if="row.kind === 'sell'" class="block text-xs text-(--td-text-color-secondary)">
            {{ row.realizedGainStatusText }}
          </span>
          <span v-else class="text-sm">{{ row.resultText }}</span>
          <span v-if="row.issueText" class="mt-1 block text-xs text-(--td-error-color)">
            {{ row.issueText }}
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
          <span v-else class="text-xs text-(--td-text-color-secondary)">只读</span>
        </template>
      </t-table>
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

.ledger-summary,
.ledger-reconciliation {
  @apply rounded-md border border-(--td-component-border) p-4;
}

.summary-grid {
  @apply grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6;
}

.summary-grid dt,
.reconciliation-grid p:first-child {
  @apply text-xs text-(--td-text-color-secondary);
}

.summary-grid dd {
  @apply mt-1 font-mono tabular-nums text-(--td-text-color-primary);
}

.reconciliation-grid {
  @apply grid gap-3 sm:grid-cols-3;
}
</style>
