<script setup lang="ts">
import { computed, ref } from 'vue'

interface FormInstance {
  validate: (params?: { readonly showErrorMessage?: boolean }) => Promise<unknown>
}

interface FormSubmitContext {
  readonly validateResult: unknown
}

const props = defineProps<{
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

const formRef = ref<FormInstance>()
const formData = computed(() => ({
  actualNetAmountYuan: props.actualNetAmountYuan,
  actualRedemptionFeeYuan: props.actualRedemptionFeeYuan,
  actualUnitNav: props.actualUnitNav,
  confirmedDate: props.confirmedDate,
  units: props.units,
}))
const latestTransactionDate = shanghaiDate()
const rules = {
  actualNetAmountYuan: [
    {
      message: '实际到账金额最多两位小数',
      validator: (value: unknown) => isEmpty(value) || isMoney(value),
    },
  ],
  actualRedemptionFeeYuan: [
    {
      message: '实际赎回费最多两位小数',
      validator: (value: unknown) => isEmpty(value) || isMoney(value),
    },
  ],
  actualUnitNav: [
    {
      message: '单位净值必须是正数，且最多四位小数',
      validator: (value: unknown) => isEmpty(value) || isPositiveDecimal(value, 4),
    },
  ],
  confirmedDate: [
    {
      message: '请选择不晚于今天且非周末的确认日期',
      required: true,
      validator: (value: unknown) => isHistoricalDate(value),
    },
  ],
  units: [
    {
      message: '卖出份额必须是正数，且最多四位小数',
      required: true,
      validator: (value: unknown) => isPositiveDecimal(value, 4),
    },
  ],
}

function toDraftValue(value: unknown): string {
  return value === undefined || value === null || value === '' ? '' : String(value)
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || String(value).trim() === ''
}

function isMoney(value: unknown): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(String(value).trim())
}

function isPositiveDecimal(value: unknown, maxDecimals: number): boolean {
  const normalized = String(value ?? '').trim()
  return (
    new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`).test(normalized) && Number(normalized) > 0
  )
}

function isHistoricalDate(value: unknown): boolean {
  const date = toIsoDate(value)
  return date !== undefined && date <= latestTransactionDate && !isWeekend(date)
}

function disableTransactionDate(value: string | number | Date): boolean {
  const date = toIsoDate(value)
  return date === undefined || date > latestTransactionDate || isWeekend(date)
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

function formatLocalDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function isWeekend(value: string): boolean {
  return [0, 6].includes(new Date(`${value}T00:00:00.000Z`).getUTCDay())
}

function shanghaiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function handleSubmit(context: FormSubmitContext): void {
  if (context.validateResult === true) emit('save')
}

async function validate(): Promise<boolean> {
  return (await formRef.value?.validate({ showErrorMessage: true })) === true
}

defineExpose({ validate })
</script>

<template>
  <t-form
    ref="formRef"
    label-align="top"
    layout="vertical"
    :data="formData"
    :rules="rules"
    @submit="handleSubmit"
  >
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="flex-1 font-medium">{{ fundName }}</span>
        <t-tag size="small" variant="light">{{ fundCode }}</t-tag>
      </div>
      <p class="text-xs text-(--td-text-color-secondary)">只记录本地卖出信息，不会提交真实交易。</p>
    </div>

    <div class="border-t border-(--td-component-stroke) my-4" />

    <section class="flex flex-col" aria-labelledby="sell-facts-title">
      <h2 id="sell-facts-title" class="text-sm font-semibold mb-4">交易信息</h2>
      <div class="grid sm:gap-x-4 sm:grid-cols-2">
        <t-form-item
          label="确认日期"
          name="confirmedDate"
          :status="errors.confirmedDate ? 'error' : undefined"
          :tips="errors.confirmedDate"
        >
          <t-date-picker
            :value="confirmedDate"
            class="w-full"
            :disable-date="disableTransactionDate"
            format="YYYY-MM-DD"
            placeholder="请选择确认日期"
            value-type="YYYY-MM-DD"
            @change="emit('updateConfirmedDate', toDraftValue($event))"
          />
        </t-form-item>
        <t-form-item
          label="卖出份额"
          name="units"
          :status="errors.units ? 'error' : undefined"
          :tips="errors.units"
        >
          <t-input-number
            :value="units"
            inputmode="decimal"
            :decimal-places="4"
            :min="0.0001"
            placeholder="例如 120.0000"
            step="0.0001"
            suffix="份"
            theme="normal"
            @change="emit('updateUnits', toDraftValue($event))"
          />
        </t-form-item>
      </div>
    </section>

    <section class="flex flex-col" aria-labelledby="sell-details-title">
      <div class="mb-4">
        <h2 id="sell-details-title" class="text-sm font-semibold">到账与费用</h2>
        <p class="mt-2 text-xs text-(--td-text-color-secondary)">
          可选填写平台返回的实际值；未填写实际赎回费时保持未知，不按 0 估算。
        </p>
      </div>
      <div class="grid sm:gap-x-4 sm:grid-cols-2">
        <t-form-item
          label="实际单位净值"
          name="actualUnitNav"
          :status="errors.actualUnitNav ? 'error' : undefined"
          :tips="errors.actualUnitNav"
        >
          <t-input-number
            :value="actualUnitNav"
            inputmode="decimal"
            :decimal-places="4"
            :min="0.0001"
            placeholder="可填 0.0000"
            step="0.0001"
            suffix="元/份"
            theme="normal"
            @change="emit('updateActualUnitNav', toDraftValue($event))"
          />
        </t-form-item>
        <t-form-item
          label="实际到账"
          name="actualNetAmountYuan"
          :status="errors.actualNetAmountYuan ? 'error' : undefined"
          :tips="errors.actualNetAmountYuan"
        >
          <t-input-number
            :value="actualNetAmountYuan"
            inputmode="decimal"
            :decimal-places="2"
            min="0"
            placeholder="可填 0.00"
            step="0.01"
            suffix="元"
            theme="normal"
            @change="emit('updateActualNetAmountYuan', toDraftValue($event))"
          />
        </t-form-item>
        <t-form-item
          label="实际赎回费"
          name="actualRedemptionFeeYuan"
          :status="errors.actualRedemptionFeeYuan ? 'error' : undefined"
          :tips="errors.actualRedemptionFeeYuan"
        >
          <t-input-number
            :value="actualRedemptionFeeYuan"
            inputmode="decimal"
            :decimal-places="2"
            min="0"
            placeholder="可填 0.00"
            step="0.01"
            suffix="元"
            theme="normal"
            @change="emit('updateActualRedemptionFeeYuan', toDraftValue($event))"
          />
        </t-form-item>
      </div>
    </section>
  </t-form>
</template>

<style scoped>
:deep(.t-input-number) {
  width: 100%;
}
</style>
