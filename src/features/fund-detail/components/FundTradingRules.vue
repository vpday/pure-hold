<script setup lang="ts">
import { useBreakpoints } from '@/shared/composables/useBreakpoints'

import type {
  FundTradingRulesViewModel,
  FundTradingStatusTone,
} from '../models/fundDetailViewModel'

defineProps<{
  rules: FundTradingRulesViewModel
}>()

const { isSmUp } = useBreakpoints()

function statusClass(tone: FundTradingStatusTone): string {
  if (tone === 'success') return 'text-(--td-success-color)'
  if (tone === 'warning') return 'text-(--td-warning-color)'
  if (tone === 'error') return 'text-(--td-error-color)'
  return 'text-(--td-text-color-primary)'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <t-descriptions
      bordered
      size="small"
      :column="isSmUp ? 4 : 2"
      item-layout="vertical"
      title="交易状态"
    >
      <t-descriptions-item label="申购状态">
        <span class="font-medium" :class="statusClass(rules.purchaseStatusTone)">
          {{ rules.purchaseStatusText }}
        </span>
      </t-descriptions-item>
      <t-descriptions-item label="赎回状态">
        <span class="font-medium" :class="statusClass(rules.redemptionStatusTone)">
          {{ rules.redemptionStatusText }}
        </span>
      </t-descriptions-item>
      <t-descriptions-item label="申购起点">
        <span class="font-medium">{{ rules.minimumPurchaseAmountText }}</span>
      </t-descriptions-item>
      <t-descriptions-item label="日累计申购限额">
        <span class="font-medium">{{ rules.dailyPurchaseLimitText }}</span>
      </t-descriptions-item>
    </t-descriptions>

    <t-descriptions
      bordered
      size="small"
      :column="isSmUp ? 4 : 2"
      item-layout="vertical"
      title="运作费用"
    >
      <t-descriptions-item label="申购费率">
        <span class="fee-value">
          <span>{{ rules.purchaseFeeText }}</span>
          <s v-if="rules.standardPurchaseFeeText" class="standard-fee">
            {{ rules.standardPurchaseFeeText }}
          </s>
          <span v-if="rules.purchaseDiscountText" class="discount">
            {{ rules.purchaseDiscountText }}
          </span>
        </span>
      </t-descriptions-item>
      <t-descriptions-item label="管理费率">
        <span class="font-medium">{{ rules.managementFeeText }}</span>
      </t-descriptions-item>
      <t-descriptions-item label="托管费率">
        <span class="font-medium">{{ rules.custodyFeeText }}</span>
      </t-descriptions-item>
      <t-descriptions-item label="销售服务费率">
        <span class="font-medium">{{ rules.salesServiceFeeText }}</span>
      </t-descriptions-item>
    </t-descriptions>

    <t-descriptions
      bordered
      size="small"
      :column="isSmUp ? 3 : 2"
      item-layout="vertical"
      title="交易确认日"
    >
      <t-descriptions-item label="申购确认">
        <span class="font-medium">{{ rules.purchaseConfirmationText }}</span>
      </t-descriptions-item>
      <t-descriptions-item label="赎回确认">
        <span class="font-medium">{{ rules.redemptionConfirmationText }}</span>
      </t-descriptions-item>
      <t-descriptions-item label="赎回资金到账">
        <span class="font-medium">{{ rules.redemptionFundsArrivalText }}</span>
      </t-descriptions-item>
      <t-descriptions-item label="说明" :span="isSmUp ? 3 : 2">
        T日指交易日，15:00前提交的申请按当日净值计算，15:00后按下一交易日计算。
      </t-descriptions-item>
    </t-descriptions>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.fee-value {
  @apply flex flex-wrap items-baseline gap-2 font-medium text-(--td-text-color-primary);
}

.standard-fee {
  @apply text-xs font-normal text-(--td-text-color-secondary);
}

.discount {
  @apply rounded-sm bg-(--td-warning-color-light-9) px-1.5 py-0.5 text-xs text-(--td-warning-color);
}
</style>
