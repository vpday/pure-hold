<script setup lang="ts">
defineProps<{
  actualNetAmountYuan: string
  actualRedemptionFeeYuan: string
  actualUnitNav: string
  confirmedDate: string
  errors: Readonly<Record<string, string>>
  fundCode: string
  fundName: string
  units: string
}>()
const emit = defineEmits<{
  save: []
  updateActualNetAmountYuan: [value: string]
  updateActualRedemptionFeeYuan: [value: string]
  updateActualUnitNav: [value: string]
  updateConfirmedDate: [value: string]
  updateUnits: [value: string]
}>()
</script>

<template>
  <form class="flex min-w-0 flex-col gap-4" @submit.prevent="emit('save')">
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium">{{ fundName }}</span>
        <span class="fund-code-badge">{{ fundCode }}</span>
      </div>
      <p class="text-sm text-(--td-text-color-secondary)">只记录本地卖出事实，不会提交真实交易。</p>
    </div>

    <section class="flex flex-col gap-3" aria-labelledby="sell-facts-title">
      <div>
        <h2 id="sell-facts-title" class="text-sm font-medium">交易事实</h2>
        <p class="mt-1 text-xs text-(--td-text-color-secondary)">记录确认日期和卖出份额。</p>
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
          <span>卖出份额</span>
          <t-input
            :value="units"
            inputmode="decimal"
            placeholder="例如 120.0000"
            :status="errors.units ? 'error' : undefined"
            suffix="份"
            @change="emit('updateUnits', String($event))"
          />
          <span v-if="errors.units" class="text-(--td-error-color)">{{ errors.units }}</span>
        </label>
      </div>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="sell-details-title">
      <div>
        <h2 id="sell-details-title" class="text-sm font-medium">到账与费用</h2>
        <p class="mt-1 text-xs text-(--td-text-color-secondary)">
          可选填写平台返回的实际值；未填写实际赎回费时保持未知，不按 0 估算。
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
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
        <label class="flex min-w-0 flex-col gap-1 text-sm">
          <span>实际到账</span>
          <t-input
            :value="actualNetAmountYuan"
            inputmode="decimal"
            placeholder="可填 0.00"
            :status="errors.actualNetAmountYuan ? 'error' : undefined"
            suffix="元"
            @change="emit('updateActualNetAmountYuan', String($event))"
          />
          <span v-if="errors.actualNetAmountYuan" class="text-(--td-error-color)">
            {{ errors.actualNetAmountYuan }}
          </span>
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm">
          <span>实际赎回费</span>
          <t-input
            :value="actualRedemptionFeeYuan"
            inputmode="decimal"
            :status="errors.actualRedemptionFeeYuan ? 'error' : undefined"
            suffix="元"
            @change="emit('updateActualRedemptionFeeYuan', String($event))"
          />
          <span v-if="errors.actualRedemptionFeeYuan" class="text-(--td-error-color)">
            {{ errors.actualRedemptionFeeYuan }}
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
