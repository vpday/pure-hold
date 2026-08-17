<script setup lang="ts">
import { computed, ref } from 'vue'

import type {
  FundHoldingDraft,
  FundHoldingDraftErrors,
  FundHoldingTimeMode,
} from '../models/fundHoldingDraft'

interface FundHoldingGroupOption {
  readonly label: string
  readonly value: string
}

interface FormInstance {
  validate: (params?: { readonly showErrorMessage?: boolean }) => Promise<unknown>
}

const props = defineProps<{
  draft: FundHoldingDraft
  errors: FundHoldingDraftErrors
  groupOptions?: readonly FundHoldingGroupOption[]
}>()
const selectedGroupIds = defineModel<string[]>('selectedGroupIds', { default: () => [] })
const formRef = ref<FormInstance>()
const formData = computed(() => props.draft)

const dividendOptions = [
  { label: '红利再投资', value: 'reinvest' },
  { label: '现金分红', value: 'cash' },
]
const latestPurchaseDate = formatLocalDate(new Date())
const rules = {
  costPrice: [
    {
      message: '请输入大于 0、最多 4 位小数的成本价',
      required: true,
      validator: (value: unknown) => isPositiveDecimal(value, 4),
    },
  ],
  dividendMode: [{ enum: ['cash', 'reinvest'], message: '请选择分红方式', required: true }],
  holdingDays: [
    {
      message: '请输入正整数持仓天数',
      required: true,
      validator: (value: unknown) => /^[1-9]\d*$/.test(String(value ?? '').trim()),
    },
  ],
  purchaseDate: [
    {
      message: '请选择不晚于今天且非周末的购买日期',
      required: true,
      validator: (value: unknown) => isValidPurchaseDate(value),
    },
  ],
  units: [
    {
      message: '请输入大于 0、最多 4 位小数的份额',
      required: true,
      validator: (value: unknown) => isPositiveDecimal(value, 4),
    },
  ],
}

function changeMode(mode: FundHoldingTimeMode): void {
  props.draft.timeMode = mode
  if (mode === 'date') props.draft.holdingDays = ''
  else props.draft.purchaseDate = ''
}

function updateDraftValue(key: 'costPrice' | 'holdingDays' | 'units', value: unknown): void {
  props.draft[key] = toDraftValue(value)
}

function toDraftValue(value: unknown): string {
  return value === undefined || value === null || value === '' ? '' : String(value)
}

function isPositiveDecimal(value: unknown, maxDecimals: number): boolean {
  const normalized = String(value ?? '').trim()
  return (
    new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`).test(normalized) && Number(normalized) > 0
  )
}

function isValidPurchaseDate(value: unknown): boolean {
  const date = toIsoDate(value)
  return date !== undefined && date <= latestPurchaseDate && !isWeekend(date)
}

function disablePurchaseDate(value: string | number | Date): boolean {
  const date = toIsoDate(value)
  return date === undefined || date > latestPurchaseDate || isWeekend(date)
}

function toIsoDate(value: unknown): string | undefined {
  if (typeof value === 'string') return isValidDate(value) ? value : undefined
  const date =
    value instanceof Date ? value : typeof value === 'number' ? new Date(value) : undefined
  if (date === undefined || !Number.isFinite(date.getTime())) return undefined
  return formatLocalDate(date)
}

function isValidDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isWeekend(value: string): boolean {
  return [0, 6].includes(new Date(`${value}T00:00:00.000Z`).getUTCDay())
}

function formatLocalDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

async function validate(): Promise<boolean> {
  return (await formRef.value?.validate({ showErrorMessage: true })) === true
}

defineExpose({ validate })
</script>

<template>
  <t-form ref="formRef" label-align="top" layout="vertical" :data="formData" :rules="rules">
    <t-form-item v-if="groupOptions" label="自定义分组">
      <t-select
        v-if="groupOptions.length > 0"
        v-model="selectedGroupIds"
        clearable
        :min-collapsed-num="2"
        multiple
        :options="groupOptions"
        placeholder="请选择自定义分组"
      />
      <span v-else class="text-sm text-(--td-text-color-secondary)">暂无自定义分组</span>
    </t-form-item>

    <div class="grid grid-cols-1 sm:gap-x-4 sm:grid-cols-2">
      <t-form-item
        label="持有份额"
        name="units"
        :status="errors.units ? 'error' : undefined"
        :tips="errors.units"
      >
        <t-input-number
          :value="draft.units"
          align="right"
          :decimal-places="4"
          :min="0.0001"
          placeholder="0.0000"
          step="0.0001"
          suffix="份"
          theme="normal"
          @change="updateDraftValue('units', $event)"
        />
      </t-form-item>
      <t-form-item
        label="持仓成本价"
        name="costPrice"
        :status="errors.costPrice ? 'error' : undefined"
        :tips="errors.costPrice"
      >
        <t-input-number
          :value="draft.costPrice"
          align="right"
          :decimal-places="4"
          :min="0.0001"
          placeholder="0.0000"
          step="0.0001"
          suffix="元"
          theme="normal"
          @change="updateDraftValue('costPrice', $event)"
        />
      </t-form-item>
      <t-form-item
        :name="draft.timeMode === 'date' ? 'purchaseDate' : 'holdingDays'"
        :status="errors.time ? 'error' : undefined"
        :tips="errors.time"
      >
        <template #label>
          <span>
            <span>{{ draft.timeMode === 'date' ? '购买日期' : '持有天数' }}</span>
            <t-button
              size="small"
              theme="default"
              variant="text"
              @click="changeMode(draft.timeMode === 'date' ? 'days' : 'date')"
            >
              <template #icon><t-icon name="swap" /></template>
              {{ draft.timeMode === 'date' ? '按天数' : '按日期' }}
            </t-button>
          </span>
        </template>
        <t-date-picker
          v-if="draft.timeMode === 'date'"
          v-model="draft.purchaseDate"
          class="w-full"
          :disable-date="disablePurchaseDate"
          format="YYYY-MM-DD"
          placeholder="请选择购买日期"
          value-type="YYYY-MM-DD"
        />
        <t-input-number
          v-else
          :value="draft.holdingDays"
          align="right"
          :decimal-places="0"
          :min="1"
          placeholder="请输入正整数"
          step="1"
          suffix="天"
          theme="normal"
          @change="updateDraftValue('holdingDays', $event)"
        />
      </t-form-item>
      <t-form-item
        label="分红方式"
        name="dividendMode"
        :status="errors.dividendMode ? 'error' : undefined"
        :tips="errors.dividendMode"
      >
        <t-radio-group v-model="draft.dividendMode">
          <t-radio v-for="option in dividendOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </t-radio>
        </t-radio-group>
      </t-form-item>
    </div>
  </t-form>
</template>

<style scoped>
:deep(.t-input-number) {
  width: 100%;
}

:deep(.t-form__item) {
  margin-bottom: var(--td-comp-margin-l);
}
</style>
