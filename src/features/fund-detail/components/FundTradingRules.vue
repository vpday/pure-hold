<script setup lang="ts">
import type {
  FundTradingRulesViewModel,
  FundTradingStatusTone,
} from '../models/fundDetailViewModel'

defineProps<{
  rules: FundTradingRulesViewModel
}>()

function statusClass(tone: FundTradingStatusTone): string {
  if (tone === 'success') return 'text-(--td-success-color)'
  if (tone === 'warning') return 'text-(--td-warning-color)'
  if (tone === 'error') return 'text-(--td-error-color)'
  return 'text-(--td-text-color-primary)'
}
</script>

<template>
  <div class="space-y-4">
    <section class="rules-card" aria-labelledby="trading-limits-title">
      <h3 id="trading-limits-title" class="rules-heading">交易状态</h3>
      <dl class="limits-grid">
        <div>
          <dt class="rule-label">申购状态</dt>
          <dd class="rule-value" :class="statusClass(rules.purchaseStatusTone)">
            {{ rules.purchaseStatusText }}
          </dd>
        </div>
        <div>
          <dt class="rule-label">赎回状态</dt>
          <dd class="rule-value" :class="statusClass(rules.redemptionStatusTone)">
            {{ rules.redemptionStatusText }}
          </dd>
        </div>
        <div>
          <dt class="rule-label">申购起点</dt>
          <dd class="rule-value">{{ rules.minimumPurchaseAmountText }}</dd>
        </div>
        <div>
          <dt class="rule-label">日累计申购限额</dt>
          <dd class="rule-value">{{ rules.dailyPurchaseLimitText }}</dd>
        </div>
      </dl>
    </section>

    <section class="rules-card" aria-labelledby="trading-cost-title">
      <h3 id="trading-cost-title" class="rules-heading">运作费用</h3>
      <dl class="cost-grid">
        <div>
          <dt class="rule-label">申购费率</dt>
          <dd class="fee-value">
            <span>{{ rules.purchaseFeeText }}</span>
            <s v-if="rules.standardPurchaseFeeText" class="standard-fee">
              {{ rules.standardPurchaseFeeText }}
            </s>
            <span v-if="rules.purchaseDiscountText" class="discount">
              {{ rules.purchaseDiscountText }}
            </span>
          </dd>
        </div>
        <div>
          <dt class="rule-label">管理费率</dt>
          <dd class="rule-value">{{ rules.managementFeeText }}</dd>
        </div>
        <div>
          <dt class="rule-label">托管费率</dt>
          <dd class="rule-value">{{ rules.custodyFeeText }}</dd>
        </div>
        <div>
          <dt class="rule-label">销售服务费率</dt>
          <dd class="rule-value">{{ rules.salesServiceFeeText }}</dd>
        </div>
      </dl>
    </section>

    <section class="rules-card" aria-labelledby="trading-confirmation-title">
      <h3 id="trading-confirmation-title" class="rules-heading">交易确认日</h3>
      <dl class="confirmation-grid">
        <div>
          <dt class="rule-label">申购确认</dt>
          <dd class="rule-value">{{ rules.purchaseConfirmationText }}</dd>
        </div>
        <div>
          <dt class="rule-label">赎回确认</dt>
          <dd class="rule-value">{{ rules.redemptionConfirmationText }}</dd>
        </div>
        <div>
          <dt class="rule-label">赎回资金到账</dt>
          <dd class="rule-value">{{ rules.redemptionFundsArrivalText }}</dd>
        </div>
      </dl>
      <p class="confirmation-note">
        注：T日指交易日，15:00前提交的申请按当日净值计算，15:00后按下一交易日计算。
      </p>
    </section>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.rules-card {
  @apply rounded-md border border-(--td-component-border) bg-(--td-bg-color-container) p-4;
}

.rules-heading {
  @apply mb-4 text-base font-medium text-(--td-text-color-primary);
}

.cost-grid,
.limits-grid {
  @apply grid grid-cols-1 gap-4 sm:grid-cols-4;
}

.confirmation-grid {
  @apply grid grid-cols-1 gap-4 sm:grid-cols-3;
}

.rule-label {
  @apply text-xs text-(--td-text-color-secondary);
}

.rule-value {
  @apply mt-1 wrap-break-word font-medium;
}

.fee-value {
  @apply mt-1 flex flex-wrap items-baseline gap-2 font-medium text-(--td-text-color-primary);
}

.standard-fee {
  @apply text-xs font-normal text-(--td-text-color-secondary);
}

.discount {
  @apply rounded-sm bg-(--td-warning-color-light-9) px-1.5 py-0.5 text-xs text-(--td-warning-color);
}

.confirmation-note {
  @apply mt-4 border-t border-(--td-component-stroke) pt-3 text-xs text-(--td-text-color-secondary);
}
</style>
