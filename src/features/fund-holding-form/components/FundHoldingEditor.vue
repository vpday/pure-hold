<script setup lang="ts">
import { computed, ref } from 'vue'

import type {
  FundHoldingDraft,
  FundHoldingDraftErrors,
  FundHoldingTimeMode,
} from '../models/fundHoldingDraft'
import {
  holdingDaysFromPurchaseDate,
  purchaseDateFromHoldingDays,
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
  holdingFactsReadonly?: boolean
}>()
const selectedGroupIds = defineModel<string[]>('selectedGroupIds', { default: () => [] })
const formRef = ref<FormInstance>()
const formData = computed(() => props.draft)

const dividendOptions = [
  { label: '红利再投资', value: 'reinvest' },
  { label: '现金分红', value: 'cash' },
]
const latestPurchaseDate = formatLocalDate(yesterday())
const rules = computed(() => ({
  holdingAmountYuan: props.holdingFactsReadonly
    ? []
    : [
        {
          message: '请输入大于 0、最多 2 位小数的持仓金额',
          required: true,
          validator: (value: unknown) => isPositiveDecimal(value, 2),
        },
      ],
  dividendMode: [{ enum: ['cash', 'reinvest'], message: '请选择分红方式', required: true }],
  holdingDays: [
    {
      message: '请输入正整数持仓天数，且换算后的购买日期须早于今天且非周末',
      required: true,
      validator: (value: unknown) => isValidHoldingDays(value),
    },
  ],
  holdingIncomeYuan: props.holdingFactsReadonly
    ? []
    : [
        {
          message: '请输入可带负号、最多 2 位小数的持仓收益',
          required: true,
          validator: (value: unknown) => isSignedDecimal(value, 2),
        },
      ],
  purchaseDate: [
    {
      message: '请选择早于今天且非周末的购买日期',
      required: true,
      validator: (value: unknown) => isValidPurchaseDate(value),
    },
  ],
  units: props.holdingFactsReadonly
    ? []
    : [
        {
          message: '请输入大于 0、最多 4 位小数的份额',
          required: true,
          validator: (value: unknown) => isPositiveDecimal(value, 4),
        },
      ],
}))

function changeMode(mode: FundHoldingTimeMode): void {
  if (mode === props.draft.timeMode) return
  if (mode === 'date') {
    props.draft.purchaseDate = purchaseDateFromHoldingDays(props.draft.holdingDays) ?? ''
  } else {
    props.draft.holdingDays = holdingDaysFromPurchaseDate(props.draft.purchaseDate) ?? ''
  }
  props.draft.timeMode = mode
}

function updateDraftValue(
  key: 'holdingAmountYuan' | 'holdingDays' | 'holdingIncomeYuan' | 'units',
  value: unknown,
): void {
  if (
    props.holdingFactsReadonly &&
    (key === 'holdingAmountYuan' || key === 'holdingIncomeYuan' || key === 'units')
  ) {
    return
  }
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

function isSignedDecimal(value: unknown, maxDecimals: number): boolean {
  const normalized = String(value ?? '').trim()
  return new RegExp(`^-?\\d+(?:\\.\\d{1,${maxDecimals}})?$`).test(normalized)
}

function isValidPurchaseDate(value: unknown): boolean {
  const date = toIsoDate(value)
  return date !== undefined && date <= latestPurchaseDate && !isWeekend(date)
}

function isValidHoldingDays(value: unknown): boolean {
  const purchaseDate = purchaseDateFromHoldingDays(String(value ?? '').trim())
  return isValidPurchaseDate(purchaseDate)
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

function yesterday(): Date {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date
}

async function validate(): Promise<boolean> {
  return (await formRef.value?.validate({ showErrorMessage: true })) === true
}

defineExpose({ validate })
</script>

<template>
  <t-form ref="formRef" label-align="top" layout="vertical" :data="formData" :rules="rules">
    <t-alert
      v-if="holdingFactsReadonly"
      class="mb-4"
      theme="info"
      message="该基金已有成交记录，份额、持仓金额和持仓收益由成交记录自动计算，只能通过交易或手工修正改变。"
    />
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
        label="持仓金额"
        name="holdingAmountYuan"
        :status="errors.holdingAmountYuan ? 'error' : undefined"
        :tips="errors.holdingAmountYuan"
      >
        <t-input-number
          :value="draft.holdingAmountYuan"
          :decimal-places="2"
          :min="holdingFactsReadonly ? undefined : 0.01"
          placeholder="0.00"
          step="0.01"
          suffix="元"
          theme="normal"
          :readonly="holdingFactsReadonly"
          @change="updateDraftValue('holdingAmountYuan', $event)"
        />
      </t-form-item>
      <t-form-item
        label="持仓收益"
        name="holdingIncomeYuan"
        :status="errors.holdingIncomeYuan ? 'error' : undefined"
        :tips="errors.holdingIncomeYuan"
      >
        <t-input-number
          :value="draft.holdingIncomeYuan"
          :decimal-places="2"
          :min="undefined"
          placeholder="0.00"
          step="0.01"
          suffix="元"
          theme="normal"
          :readonly="holdingFactsReadonly"
          @change="updateDraftValue('holdingIncomeYuan', $event)"
        />
      </t-form-item>
      <t-form-item
        label="持有份额"
        name="units"
        :status="errors.units ? 'error' : undefined"
        :tips="errors.units"
      >
        <t-input-number
          :value="draft.units"
          :decimal-places="4"
          :min="0.0001"
          placeholder="0.0000"
          step="0.0001"
          suffix="份"
          theme="normal"
          :readonly="holdingFactsReadonly"
          @change="updateDraftValue('units', $event)"
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
          allow-input
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
