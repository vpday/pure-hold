<script setup lang="ts">
defineProps<{
  actualPurchaseFeeYuan: string
  actualUnitNav: string
  actualUnits: string
  confirmedDate: string
  errors: Readonly<Record<string, string>>
  fundCode: string
  fundName: string
  purchaseFeePercent: string
  totalAmountYuan: string
}>()
const emit = defineEmits<{
  save: []
  updateActualPurchaseFeeYuan: [value: string]
  updateActualUnitNav: [value: string]
  updateActualUnits: [value: string]
  updateConfirmedDate: [value: string]
  updatePurchaseFeePercent: [value: string]
  updateTotalAmountYuan: [value: string]
}>()
</script>

<template>
  <form class="flex min-w-0 flex-col gap-4" @submit.prevent="emit('save')">
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium">{{ fundName }}</span>
        <span class="fund-code-badge">{{ fundCode }}</span>
      </div>
      <p class="text-sm text-(--td-text-color-secondary)">只记录本地买入事实，不会提交真实交易。</p>
    </div>

    <section class="flex flex-col gap-3" aria-labelledby="buy-facts-title">
      <div>
        <h2 id="buy-facts-title" class="text-sm font-medium">交易事实</h2>
        <p class="mt-1 text-xs text-(--td-text-color-secondary)">记录确认日期、总额和申购费率。</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="flex min-w-0 flex-col gap-1 text-sm">
          <span>确认日期</span>
          <t-date-picker
            :value="confirmedDate"
            class="w-full"
            format="YYYY-MM-DD"
            placeholder="请选择确认日期"
            :status="errors.confirmedDate ? 'error' : undefined"
            value-type="YYYY-MM-DD"
            @change="emit('updateConfirmedDate', String($event))"
          />
          <span v-if="errors.confirmedDate" class="text-(--td-error-color)">
            {{ errors.confirmedDate }}
          </span>
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm">
          <span>含费总额</span>
          <t-input
            :value="totalAmountYuan"
            inputmode="decimal"
            placeholder="例如 100.00"
            :status="errors.totalAmountYuan ? 'error' : undefined"
            suffix="元"
            @change="emit('updateTotalAmountYuan', String($event))"
          />
          <span v-if="errors.totalAmountYuan" class="text-(--td-error-color)">
            {{ errors.totalAmountYuan }}
          </span>
        </label>
        <label class="flex flex-col gap-1 text-sm sm:col-span-2">
          <span>折后申购费率</span>
          <t-input
            :value="purchaseFeePercent"
            inputmode="decimal"
            placeholder="基础资料加载中，可留空"
            :status="errors.purchaseFeePercent ? 'error' : undefined"
            suffix="%"
            @change="emit('updatePurchaseFeePercent', String($event))"
          />
          <span v-if="errors.purchaseFeePercent" class="text-(--td-error-color)">
            {{ errors.purchaseFeePercent }}
          </span>
        </label>
      </div>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="buy-details-title">
      <div>
        <h2 id="buy-details-title" class="text-sm font-medium">净值与费用</h2>
        <p class="mt-1 text-xs text-(--td-text-color-secondary)">
          可选填写平台返回的实际值；留空时保留待确认状态。
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="flex min-w-0 flex-col gap-1 text-sm">
          <span>实际份额</span>
          <t-input
            :value="actualUnits"
            inputmode="decimal"
            :status="errors.actualUnits ? 'error' : undefined"
            suffix="份"
            @change="emit('updateActualUnits', String($event))"
          />
          <span v-if="errors.actualUnits" class="text-(--td-error-color)">
            {{ errors.actualUnits }}
          </span>
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm">
          <span>实际申购费</span>
          <t-input
            :value="actualPurchaseFeeYuan"
            inputmode="decimal"
            :status="errors.actualPurchaseFeeYuan ? 'error' : undefined"
            suffix="元"
            @change="emit('updateActualPurchaseFeeYuan', String($event))"
          />
          <span v-if="errors.actualPurchaseFeeYuan" class="text-(--td-error-color)">
            {{ errors.actualPurchaseFeeYuan }}
          </span>
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm">
          <span>实际单位净值</span>
          <t-input
            :value="actualUnitNav"
            inputmode="decimal"
            :status="errors.actualUnitNav ? 'error' : undefined"
            suffix="元/份"
            @change="emit('updateActualUnitNav', String($event))"
          />
          <span v-if="errors.actualUnitNav" class="text-(--td-error-color)">
            {{ errors.actualUnitNav }}
          </span>
        </label>
      </div>
    </section>
  </form>
</template>

<style scoped>
@reference '@/style.css';

.fund-code-badge {
  @apply rounded bg-(--td-bg-color-secondarycontainer) px-2 py-0.5 font-mono text-xs tabular-nums text-(--td-text-color-secondary);
}
</style>
