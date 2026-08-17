<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  getShanghaiDate,
  getShanghaiMinute,
  isTradingDay,
} from '@/domains/portfolio/services/tradingCalendar.ts'

type EntryMode = 'pending' | 'historical'
type NavStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error'

interface FormInstance {
  validate: (params?: { readonly showErrorMessage?: boolean }) => Promise<unknown>
}

interface FormSubmitContext {
  readonly validateResult: unknown
}

const props = defineProps<{
  actualRedemptionFeeYuan: string
  actualUnits: string
  basicInfoError: string
  basicInfoLoading: boolean
  confirmedDate: string
  entryMode: EntryMode
  errors: Readonly<Record<string, string>>
  fundCode: string
  fundName: string
  expectedConfirmationDate: string
  grossAmountText: string
  navDate: string
  navError: string
  navLoading: boolean
  navSourceText: string
  navStatus: NavStatus
  navStatusText: string
  netAmountText: string
  requestedUnits: string
  statusText: string
  statusTheme: 'default' | 'success' | 'warning'
  submittedAt: string
  unitNavText: string
  warnings: readonly string[]
}>()
const emit = defineEmits<{
  retryNav: []
  save: []
  updateActualRedemptionFeeYuan: [value: string]
  updateActualUnits: [value: string]
  updateConfirmedDate: [value: string]
  updateEntryMode: [value: EntryMode]
  updateRequestedUnits: [value: string]
  updateSubmittedAt: [value: string]
}>()

const formRef = ref<FormInstance>()
const formData = computed(() => ({
  actualRedemptionFeeYuan: props.actualRedemptionFeeYuan,
  actualUnits: props.actualUnits,
  confirmedDate: props.confirmedDate,
  entryMode: props.entryMode,
  requestedUnits: props.requestedUnits,
  submittedAt: props.submittedAt,
}))
const rules = computed(() => ({
  actualRedemptionFeeYuan: [
    {
      message: '实际赎回费最多两位小数',
      validator: (value: unknown) => isEmpty(value) || isMoney(value),
    },
  ],
  actualUnits: [
    {
      message: '确认份额最多四位小数',
      required: props.entryMode === 'historical',
      validator: (value: unknown) =>
        isEmpty(value) ? props.entryMode === 'pending' : isPositiveDecimal(value, 4),
    },
  ],
  confirmedDate: [
    {
      message: '请选择不早于净值日期、不晚于今天且为交易日的确认日期',
      required: props.entryMode === 'historical',
      validator: (value: unknown) =>
        isEmpty(value) ? props.entryMode === 'pending' : isHistoricalDate(value),
    },
  ],
  requestedUnits: [
    {
      message: '申请卖出份额必须是正数，且最多四位小数',
      required: true,
      validator: (value: unknown) => isPositiveDecimal(value, 4),
    },
  ],
  submittedAt: [
    {
      message: '提交时间必须是上海时区分钟值，且不能晚于当前时间',
      required: true,
      validator: (value: unknown) => isValidSubmissionMinute(value),
    },
  ],
}))

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
    new RegExp(String.raw`^\d+(?:\.\d{1,${maxDecimals}})?$`).test(normalized) &&
    Number(normalized) > 0
  )
}

function isValidSubmissionMinute(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return false
  return value <= getShanghaiMinute() && isValidDate(value.slice(0, 10))
}

function isHistoricalDate(value: unknown): boolean {
  const date = toIsoDate(value)
  return (
    date !== undefined && date >= props.navDate && date <= getShanghaiDate() && isTradingDay(date)
  )
}

function disableSubmissionDate(value: string | number | Date): boolean {
  const date = toIsoDate(value)
  return date === undefined || date > getShanghaiDate()
}

function disableSubmissionTime(value: Date): Partial<{
  hour: number[]
  minute: number[]
}> {
  const selectedMinute = getShanghaiMinute(value)
  const latestTransactionMinute = getShanghaiMinute()
  const latestTransactionDate = latestTransactionMinute.slice(0, 10)
  if (selectedMinute.slice(0, 10) !== latestTransactionDate) return {}

  const currentHour = Number(latestTransactionMinute.slice(11, 13))
  const currentMinute = Number(latestTransactionMinute.slice(14, 16))
  const selectedHour = Number(selectedMinute.slice(11, 13))
  return {
    hour: Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => hour > currentHour),
    minute:
      selectedHour === currentHour
        ? Array.from({ length: 60 }, (_, minute) => minute).filter(
            (minute) => minute > currentMinute,
          )
        : [],
  }
}

function disableConfirmedDate(value: string | number | Date): boolean {
  const date = toIsoDate(value)
  return (
    date === undefined || date < props.navDate || date > getShanghaiDate() || !isTradingDay(date)
  )
}

function toIsoDate(value: unknown): string | undefined {
  if (typeof value === 'string') return isValidDate(value) ? value : undefined
  const date =
    value instanceof Date ? value : typeof value === 'number' ? new Date(value) : undefined
  if (date === undefined || !Number.isFinite(date.getTime())) return undefined
  return getShanghaiDate(date)
}

function isValidDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
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

    <t-alert
      v-if="basicInfoLoading || basicInfoError"
      class="mb-4"
      :theme="basicInfoError ? 'warning' : 'info'"
    >
      <template #message>
        {{ basicInfoLoading ? '正在加载基金交易规则…' : basicInfoError }}
      </template>
    </t-alert>
    <t-alert v-if="errors.form" class="mb-4" theme="error" :message="errors.form" />

    <t-tabs
      size="medium"
      :value="entryMode"
      @update:value="emit('updateEntryMode', String($event) as EntryMode)"
    >
      <t-tab-panel label="待确认" value="pending" />
      <t-tab-panel label="历史补录" value="historical" />
    </t-tabs>

    <section class="flex flex-col mt-4" aria-labelledby="sell-facts-title">
      <h2 id="sell-facts-title" class="text-sm font-semibold mb-4">交易信息</h2>
      <div class="grid grid-cols-1 sm:gap-x-4 sm:grid-cols-2">
        <t-form-item
          label="提交时间"
          name="submittedAt"
          :status="errors.submittedAt ? 'error' : undefined"
          :tips="errors.submittedAt"
        >
          <t-date-picker
            :value="submittedAt"
            class="w-full"
            :disable-date="disableSubmissionDate"
            :disable-time="disableSubmissionTime"
            enable-time-picker
            format="YYYY-MM-DD HH:mm"
            placeholder="请选择提交时间"
            :time-picker-props="{ format: 'HH:mm', steps: [1, 1] }"
            value-type="YYYY-MM-DD HH:mm"
            @change="emit('updateSubmittedAt', toDraftValue($event))"
          />
        </t-form-item>
        <t-form-item
          label="申请卖出份额"
          name="requestedUnits"
          :status="errors.requestedUnits ? 'error' : undefined"
          :tips="errors.requestedUnits"
        >
          <t-input-number
            :value="requestedUnits"
            inputmode="decimal"
            :decimal-places="4"
            :min="0.0001"
            placeholder="例如 120.0000"
            step="0.0001"
            suffix="份"
            theme="normal"
            @change="emit('updateRequestedUnits', toDraftValue($event))"
          />
        </t-form-item>
      </div>
    </section>

    <section class="mt-4 flex flex-col" aria-labelledby="sell-confirmation-title">
      <div class="mb-4">
        <h2 id="sell-confirmation-title" class="text-sm font-semibold">
          {{ entryMode === 'historical' ? '确认信息（必填）' : '确认信息（可选）' }}
        </h2>
        <p class="mt-2 text-xs text-(--td-text-color-secondary)">
          确认费用可以未知；实际确认日期和确认份额都填写后，卖出才会参与 FIFO。
        </p>
      </div>
      <div class="grid grid-cols-1 sm:gap-x-4 sm:grid-cols-2">
        <t-form-item
          label="实际确认日期"
          name="confirmedDate"
          :status="errors.confirmedDate ? 'error' : undefined"
          :tips="errors.confirmedDate"
        >
          <t-date-picker
            :value="confirmedDate"
            class="w-full"
            :disable-date="disableConfirmedDate"
            format="YYYY-MM-DD"
            placeholder="可留空，确认后补录"
            value-type="YYYY-MM-DD"
            @change="emit('updateConfirmedDate', toDraftValue($event))"
          />
        </t-form-item>
        <t-form-item
          label="确认份额"
          name="actualUnits"
          :status="errors.actualUnits ? 'error' : undefined"
          :tips="errors.actualUnits"
        >
          <t-input-number
            :value="actualUnits"
            inputmode="decimal"
            :decimal-places="4"
            :min="0.0001"
            placeholder="可留空，确认后补录"
            step="0.0001"
            suffix="份"
            theme="normal"
            @change="emit('updateActualUnits', toDraftValue($event))"
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
            placeholder="可留空，未知不按 0 处理"
            step="0.01"
            suffix="元"
            theme="normal"
            @change="emit('updateActualRedemptionFeeYuan', toDraftValue($event))"
          />
        </t-form-item>
      </div>
    </section>

    <section class="mt-4" aria-labelledby="sell-result-title">
      <h2 id="sell-result-title" class="mb-3 text-sm font-semibold">规则、净值与金额</h2>
      <t-descriptions bordered size="small" :column="2">
        <t-descriptions-item label="净值日期">{{ navDate || '--' }}</t-descriptions-item>
        <t-descriptions-item label="预计确认日">
          {{ entryMode === 'pending' ? expectedConfirmationDate || '--' : '--' }}
        </t-descriptions-item>
        <t-descriptions-item label="单位净值">
          <t-skeleton v-if="navLoading" animation="gradient" />
          <span v-else class="font-mono tabular-nums">{{ unitNavText }}</span>
        </t-descriptions-item>
        <t-descriptions-item label="数据来源">{{ navSourceText || '--' }}</t-descriptions-item>
        <t-descriptions-item label="毛额 / 净额">
          <span class="font-mono tabular-nums">{{ grossAmountText }} / {{ netAmountText }}</span>
        </t-descriptions-item>
        <t-descriptions-item label="净值查询">{{ navStatusText }}</t-descriptions-item>
        <t-descriptions-item label="交易状态">
          <t-tag size="small" :theme="statusTheme" variant="light">{{ statusText }}</t-tag>
        </t-descriptions-item>
      </t-descriptions>
      <div v-if="navError || navStatus === 'missing'" class="mt-4">
        <t-alert theme="warning">
          <template #message>
            {{ navError || '指定净值日期暂无精确历史净值，记录仍可保存。' }}
          </template>
          <template #operation>
            <t-button size="small" variant="text" @click="emit('retryNav')">重试</t-button>
          </template>
        </t-alert>
      </div>
      <div v-if="warnings.length > 0" class="mt-4">
        <t-alert v-for="warning in warnings" :key="warning" theme="warning" :message="warning" />
      </div>
    </section>
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
