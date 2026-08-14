<script setup lang="ts">
import type {
  FundHoldingDraft,
  FundHoldingDraftErrors,
  FundHoldingTimeMode,
} from '../models/fundHoldingDraft'

interface FundHoldingGroupOption {
  readonly label: string
  readonly value: string
}

const props = defineProps<{
  draft: FundHoldingDraft
  errors: FundHoldingDraftErrors
  groupOptions?: readonly FundHoldingGroupOption[]
}>()
const selectedGroupIds = defineModel<string[]>('selectedGroupIds', { default: () => [] })

const dividendOptions = [
  { label: '红利再投资', value: 'reinvest' },
  { label: '现金分红', value: 'cash' },
]
const today = new Date()
const latestPurchaseDate = [
  String(today.getFullYear()).padStart(4, '0'),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-')

function changeMode(mode: FundHoldingTimeMode): void {
  props.draft.timeMode = mode
  if (mode === 'date') props.draft.holdingDays = ''
  else props.draft.purchaseDate = ''
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-if="groupOptions">
      <label v-if="groupOptions.length > 0" class="flex flex-col gap-1">
        <span class="text-sm font-medium">自定义分组</span>
        <t-select
            v-model="selectedGroupIds"
            clearable
            :min-collapsed-num="2"
            multiple
            :options="groupOptions"
            placeholder="请选择自定义分组"
        />
      </label>
      <p v-else class="text-sm text-(--td-text-color-secondary)">暂无自定义分组</p>
    </template>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">
      <label class="flex min-w-0 flex-col gap-1">
        <span class="text-sm font-medium">持有份额</span>
        <t-input-number
          v-model="draft.units"
          theme="normal"
          align="right"
          min="0"
          placeholder="0.00"
          suffix="份"
          :status="errors.units ? 'error' : 'default'"
          :tips="errors.units"
        />
      </label>
      <label class="flex min-w-0 flex-col gap-1">
        <span class="text-sm font-medium">持仓成本价</span>
        <t-input-number
          v-model="draft.costPrice"
          theme="normal"
          align="right"
          min="0"
          placeholder="0.0000"
          suffix="元"
          :status="errors.costPrice ? 'error' : undefined"
          :tips="errors.costPrice"
        />
      </label>
    </div>
    <div class="flex flex-col gap-1">
      <div class="flex w-full items-center justify-between gap-2">
        <span class="text-sm font-medium">
          {{ draft.timeMode === 'date' ? '购买日期' : '持有天数' }}
        </span>
        <t-button
          size="small"
          theme="default"
          variant="text"
          @click="changeMode(draft.timeMode === 'date' ? 'days' : 'date')"
        >
          <template #icon><t-icon name="swap" /></template>
          {{ draft.timeMode === 'date' ? '按天数' : '按日期' }}
        </t-button>
      </div>
      <label>
        <span class="sr-only">{{ draft.timeMode === 'date' ? '购买日期' : '持有天数' }}</span>
        <t-date-picker
          v-if="draft.timeMode === 'date'"
          v-model="draft.purchaseDate"
          class="w-full"
          :disable-date="{ after: latestPurchaseDate }"
          format="YYYY-MM-DD"
          value-type="YYYY-MM-DD"
          placeholder="请选择购买日期"
          :status="errors.time ? 'error' : undefined"
          :tips="errors.time"
        />
        <t-input-number
          v-else
          v-model="draft.holdingDays"
          theme="normal"
          align="right"
          min="0"
          placeholder="请输入正整数"
          suffix="天"
          :status="errors.time ? 'error' : undefined"
          :tips="errors.time"
        />
      </label>
    </div>
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">分红方式</span>
      <t-select
        v-model="draft.dividendMode"
        placeholder="请选择分红方式"
        :options="dividendOptions"
        :status="errors.dividendMode ? 'error' : undefined"
        :tips="errors.dividendMode"
      />
    </label>
  </div>
</template>

<style scoped>
:deep(.t-input-number) {
  width: 100%;
}
</style>
