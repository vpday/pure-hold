<script setup lang="ts">
import { computed, ref } from 'vue'

interface FormInstance {
  validate: (params?: { readonly showErrorMessage?: boolean }) => Promise<unknown>
}

interface FormSubmitContext {
  readonly validateResult: unknown
}

const props = defineProps<{
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

const formRef = ref<FormInstance>()
const formData = computed(() => ({
  actualPurchaseFeeYuan: props.actualPurchaseFeeYuan,
  actualUnitNav: props.actualUnitNav,
  actualUnits: props.actualUnits,
  confirmedDate: props.confirmedDate,
  purchaseFeePercent: props.purchaseFeePercent,
  totalAmountYuan: props.totalAmountYuan,
}))
const latestTransactionDate = shanghaiDate()
const rules = {
  actualPurchaseFeeYuan: [
    {
      message: '实际申购费最多两位小数',
      validator: (value: unknown) => isEmpty(value) || isMoney(value),
    },
  ],
  actualUnitNav: [
    {
      message: '实际单位净值必须是正数，且最多四位小数',
      validator: (value: unknown) => isEmpty(value) || isPositiveDecimal(value, 4),
    },
  ],
  actualUnits: [
    {
      message: '实际份额最多四位小数',
      validator: (value: unknown) => isEmpty(value) || isNonNegativeDecimal(value, 4),
    },
  ],
  confirmedDate: [
    {
      message: '请选择不晚于今天且非周末的确认日期',
      required: true,
      validator: (value: unknown) => isHistoricalDate(value),
    },
  ],
  purchaseFeePercent: [
    {
      message: '申购费率应为 0 至 100 的数字，最多四位小数',
      validator: (value: unknown) => isEmpty(value) || isRate(value),
    },
  ],
  totalAmountYuan: [
    {
      message: '含费总额必须是正数，且最多两位小数',
      required: true,
      validator: (value: unknown) => isPositiveMoney(value),
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

function isPositiveMoney(value: unknown): boolean {
  return isMoney(value) && Number(String(value).trim()) > 0
}

function isNonNegativeDecimal(value: unknown, maxDecimals: number): boolean {
  const normalized = String(value ?? '').trim()
  return new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`).test(normalized)
}

function isPositiveDecimal(value: unknown, maxDecimals: number): boolean {
  return isNonNegativeDecimal(value, maxDecimals) && Number(String(value).trim()) > 0
}

function isRate(value: unknown): boolean {
  const normalized = String(value ?? '').trim()
  return (
    /^\d+(?:\.\d{1,4})?$/.test(normalized) && Number(normalized) >= 0 && Number(normalized) <= 100
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
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="flex-1 font-medium">{{ fundName }}</span>
        <t-tag size="small" variant="light">{{ fundCode }}</t-tag>
      </div>
      <p class="text-xs text-(--td-text-color-secondary)">只记录本地买入信息，不会提交真实交易。</p>
    </div>

    <div class="border-t border-(--td-component-stroke) my-4" />

    <section class="flex flex-col" aria-labelledby="buy-facts-title">
      <h2 id="buy-facts-title" class="text-sm font-semibold mb-4">交易信息</h2>
      <div class="grid grid-cols-1 sm:gap-x-4 sm:grid-cols-2">
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
          label="含费总额"
          name="totalAmountYuan"
          :status="errors.totalAmountYuan ? 'error' : undefined"
          :tips="errors.totalAmountYuan"
        >
          <t-input-number
            :value="totalAmountYuan"
            inputmode="decimal"
            :decimal-places="2"
            :min="0.01"
            placeholder="例如 100.00"
            step="0.01"
            suffix="元"
            theme="normal"
            @change="emit('updateTotalAmountYuan', toDraftValue($event))"
          />
        </t-form-item>
        <t-form-item
          label="申购费率"
          name="purchaseFeePercent"
          :status="errors.purchaseFeePercent ? 'error' : undefined"
          :tips="errors.purchaseFeePercent"
        >
          <t-input-number
            :value="purchaseFeePercent"
            inputmode="decimal"
            :decimal-places="4"
            :max="100"
            min="0"
            placeholder="可留空"
            step="0.0001"
            suffix="%"
            theme="normal"
            @change="emit('updatePurchaseFeePercent', toDraftValue($event))"
          />
        </t-form-item>
      </div>
    </section>

    <section class="flex flex-col" aria-labelledby="buy-details-title">
      <div class="mb-4">
        <h2 id="buy-details-title" class="text-sm font-semibold">净值与费用</h2>
        <p class="mt-2 text-xs text-(--td-text-color-secondary)">
          可选填写平台返回的实际值；留空时保留待确认状态。
        </p>
      </div>
      <div class="grid sm:gap-x-4 sm:grid-cols-2">
        <t-form-item
          label="实际份额"
          name="actualUnits"
          :status="errors.actualUnits ? 'error' : undefined"
          :tips="errors.actualUnits"
        >
          <t-input-number
            :value="actualUnits"
            inputmode="decimal"
            :decimal-places="4"
            min="0"
            placeholder="可填 0.0000"
            step="0.0001"
            suffix="份"
            theme="normal"
            @change="emit('updateActualUnits', toDraftValue($event))"
          />
        </t-form-item>
        <t-form-item
          label="实际申购费"
          name="actualPurchaseFeeYuan"
          :status="errors.actualPurchaseFeeYuan ? 'error' : undefined"
          :tips="errors.actualPurchaseFeeYuan"
        >
          <t-input-number
            :value="actualPurchaseFeeYuan"
            inputmode="decimal"
            :decimal-places="2"
            min="0"
            placeholder="可填 0.00"
            step="0.01"
            suffix="元"
            theme="normal"
            @change="emit('updateActualPurchaseFeeYuan', toDraftValue($event))"
          />
        </t-form-item>
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
      </div>
    </section>
  </t-form>
</template>

<style scoped>
:deep(.t-input-number) {
  width: 100%;
}
</style>
