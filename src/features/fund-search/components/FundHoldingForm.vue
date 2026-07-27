<script setup lang="ts">
import type {
  FundHoldingDraft,
  FundHoldingDraftErrors,
  FundHoldingTimeMode,
} from '../models/fundHoldingDraft'

defineProps<{
  drafts: FundHoldingDraft[]
  errors: Readonly<Record<string, FundHoldingDraftErrors>>
}>()

function changeMode(draft: FundHoldingDraft, mode: FundHoldingTimeMode): void {
  draft.timeMode = mode
  if (mode === 'date') draft.holdingDays = ''
  else draft.purchaseDate = ''
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-3 overflow-y-auto scrollbar-gutter-stable scrollbar-thin">
    <t-card v-for="draft in drafts" :key="draft.code" size="small" :bordered="true">
      <template #title>{{ draft.name }}</template>
      <template #subtitle>{{ draft.code }}</template>
      <div class="flex flex-col gap-5 pb-3">
        <t-input-number
          v-model="draft.units"
          theme="column"
          align="right"
          label="持有份额："
          placeholder="大于 0，最多 4 位小数"
          :status="errors[draft.code]?.units ? 'error' : 'default'"
          :tips="errors[draft.code]?.units"
        />
        <t-input-number
          v-model="draft.costPrice"
          theme="column"
          align="right"
          placeholder="大于 0，最多 4 位小数"
          label="持仓成本价："
          :status="errors[draft.code]?.costPrice ? 'error' : undefined"
          :tips="errors[draft.code]?.costPrice"
        />
        <div>
          <div class="flex w-full items-center justify-between">
            <span class="ml-2">{{ draft.timeMode === 'date' ? '购买日期' : '持有天数' }}</span>
            <t-button
              size="small"
              variant="text"
              @click="changeMode(draft, draft.timeMode === 'date' ? 'days' : 'date')"
            >
              <template #icon><t-icon name="swap" /></template>
              {{ draft.timeMode === 'date' ? '按天数' : '按日期' }}
            </t-button>
          </div>
          <t-date-picker
            v-if="draft.timeMode === 'date'"
            v-model="draft.purchaseDate"
            class="w-full"
            format="YYYY-MM-DD"
            value-type="YYYY-MM-DD"
            placeholder="请选择购买日期"
            :status="errors[draft.code]?.time ? 'error' : undefined"
            :tips="errors[draft.code]?.time"
          />
          <t-input-number
            v-else
            v-model="draft.holdingDays"
            theme="column"
            align="right"
            placeholder="请输入持有天数：正整数，1 表示昨天"
            :status="errors[draft.code]?.time ? 'error' : undefined"
            :tips="errors[draft.code]?.time"
          />
        </div>
      </div>
    </t-card>
  </div>
</template>

<style scoped>
:deep(.t-input-number) {
  width: 100%;
}
</style>
