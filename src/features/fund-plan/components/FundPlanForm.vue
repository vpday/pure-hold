<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { PortfolioPlan } from '@/domains/portfolio/models/index.ts'
import { createPortfolioPlanDraft, type PortfolioPlanDraft } from '../models/portfolioPlanDraft.ts'

interface FormInstance {
  validate: (params?: { readonly showErrorMessage?: boolean }) => Promise<unknown>
}

interface FormSubmitContext {
  readonly validateResult: unknown
}

type PortfolioPlanDraftState = {
  -readonly [Key in keyof PortfolioPlanDraft]: PortfolioPlanDraft[Key]
}

const props = defineProps<{
  error: string
  fundCode: string
  plan?: PortfolioPlan
  standalone?: boolean
}>()
const emit = defineEmits<{
  delete: []
  pause: []
  resume: []
  save: [draft: PortfolioPlanDraft]
}>()

const editing = ref(props.standalone || props.plan !== undefined)
const draft = ref<PortfolioPlanDraftState>(
  createPortfolioPlanDraft(props.plan, props.fundCode, shanghaiDate()),
)
const formRef = ref<FormInstance>()
const formData = computed(() => draft.value)
const latestPlanDate = shanghaiDate()
const rules = computed(() => ({
  amountYuan: [
    {
      message: '每期含费总额必须是正数，且最多两位小数',
      required: true,
      validator: (value: unknown) => isPositiveMoney(value),
    },
  ],
  cycle: [{ enum: ['weekly', 'monthly', 'daily'], message: '请选择执行周期', required: true }],
  endDate: [
    {
      message: '结束日期必须是有效的非周末日期，且不早于开始日期',
      validator: (value: unknown, context?: { readonly formData?: Record<string, unknown> }) => {
        if (isEmpty(value)) return true
        const date = toIsoDate(value)
        const startDate = toIsoDate(context?.formData?.startDate)
        return (
          date !== undefined && !isWeekend(date) && (startDate === undefined || date >= startDate)
        )
      },
    },
  ],
  executionDay: [
    {
      message: '执行日必须符合当前周期范围',
      required: true,
      validator: (value: unknown) => isExecutionDay(value, draft.value.cycle),
    },
  ],
  executionMode: [{ enum: ['manual', 'local-draft'], message: '请选择执行方式', required: true }],
  purchaseFeePercent: [
    {
      message: '申购费率应为 0 至 100 的数字，最多四位小数',
      validator: (value: unknown) => isEmpty(value) || isRate(value),
    },
  ],
  startDate: [
    {
      message: '开始日期必须是不晚于今天的非周末日期',
      required: true,
      validator: (value: unknown) => {
        const date = toIsoDate(value)
        return date !== undefined && date <= latestPlanDate && !isWeekend(date)
      },
    },
  ],
}))

watch(
  () => [props.plan, props.fundCode] as const,
  ([plan, fundCode]) => {
    draft.value = createPortfolioPlanDraft(plan, fundCode, shanghaiDate())
    editing.value = props.standalone || plan !== undefined
  },
)

watch(
  () => draft.value.cycle,
  (cycle) => {
    if (cycle === 'daily') draft.value.executionDay = '1'
  },
  { immediate: true },
)

function startEditing(): void {
  editing.value = true
}

function updateDraftValue(
  key: 'amountYuan' | 'executionDay' | 'purchaseFeePercent',
  value: unknown,
): void {
  draft.value[key] = toDraftValue(value)
}

function toDraftValue(value: unknown): string {
  return value === undefined || value === null || value === '' ? '' : String(value)
}

async function validate(): Promise<boolean> {
  return (await formRef.value?.validate({ showErrorMessage: true })) === true
}

async function submit(): Promise<void> {
  if (await validate()) emit('save', draft.value)
}

function handleSubmit(context: FormSubmitContext): void {
  if (context.validateResult === true) emit('save', draft.value)
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || String(value).trim() === ''
}

function isPositiveMoney(value: unknown): boolean {
  const normalized = String(value ?? '').trim()
  return /^\d+(?:\.\d{1,2})?$/.test(normalized) && Number(normalized) > 0
}

function isRate(value: unknown): boolean {
  const normalized = String(value ?? '').trim()
  return (
    /^\d+(?:\.\d{1,4})?$/.test(normalized) && Number(normalized) >= 0 && Number(normalized) <= 100
  )
}

function isExecutionDay(value: unknown, cycle: PortfolioPlanDraft['cycle']): boolean {
  const normalized = String(value ?? '').trim()
  if (!/^\d+$/.test(normalized)) return false
  const executionDay = Number(normalized)
  return cycle === 'weekly'
    ? executionDay >= 1 && executionDay <= 7
    : cycle === 'monthly'
      ? executionDay >= 1 && executionDay <= 31
      : executionDay === 1
}

function isWeekend(value: string): boolean {
  return [0, 6].includes(new Date(`${value}T00:00:00.000Z`).getUTCDay())
}

function disablePlanStartDate(value: string | number | Date): boolean {
  const date = toIsoDate(value)
  return date === undefined || date > latestPlanDate || isWeekend(date)
}

function disablePlanEndDate(value: string | number | Date): boolean {
  const date = toIsoDate(value)
  return date === undefined || isWeekend(date)
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

defineExpose({ submit, validate })
</script>

<template>
  <section class="border-t border-(--td-component-stroke) pt-4">
    <header class="flex flex-wrap items-center justify-end gap-2">
      <t-tag v-if="plan" size="small" variant="light">
        {{ plan.status === 'active' ? '运行中' : '已暂停' }}
      </t-tag>
      <t-button v-if="!editing" type="button" size="small" variant="outline" @click="startEditing">
        添加定投计划
      </t-button>
    </header>

    <t-form
      v-if="editing"
      ref="formRef"
      label-align="top"
      layout="vertical"
      :data="formData"
      :rules="rules"
      @submit="handleSubmit"
    >
      <t-alert v-if="error" theme="error" :message="error" />
      <div class="grid gap-x-3 sm:grid-cols-2">
        <t-form-item
          label="每期含费总额"
          name="amountYuan"
          :status="error && !isPositiveMoney(draft.amountYuan) ? 'error' : undefined"
          :tips="!isPositiveMoney(draft.amountYuan) && error ? error : undefined"
        >
          <t-input-number
            :value="draft.amountYuan"
            inputmode="decimal"
            :decimal-places="2"
            :min="0.01"
            placeholder="例如 500.00"
            step="0.01"
            suffix="元"
            theme="normal"
            @change="updateDraftValue('amountYuan', $event)"
          />
        </t-form-item>
        <t-form-item label="申购费率覆盖（可选）" name="purchaseFeePercent">
          <t-input-number
            :value="draft.purchaseFeePercent"
            inputmode="decimal"
            :decimal-places="4"
            :max="100"
            min="0"
            placeholder="跟随基金资料"
            step="0.0001"
            suffix="%"
            theme="normal"
            @change="updateDraftValue('purchaseFeePercent', $event)"
          />
        </t-form-item>
        <t-form-item label="执行周期" name="cycle">
          <t-radio-group v-model="draft.cycle">
            <t-radio value="weekly">每周</t-radio>
            <t-radio value="monthly">每月</t-radio>
            <t-radio value="daily">每天</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item
          :label="
            draft.cycle === 'weekly'
              ? '执行星期（1=周一）'
              : draft.cycle === 'monthly'
                ? '执行日期（1 至 31）'
                : '执行日（每天固定为 1）'
          "
          name="executionDay"
        >
          <t-input-number
            :value="draft.executionDay"
            :disabled="draft.cycle === 'daily'"
            :max="draft.cycle === 'weekly' ? 7 : draft.cycle === 'monthly' ? 31 : 1"
            :min="1"
            :decimal-places="0"
            step="1"
            theme="normal"
            @change="updateDraftValue('executionDay', $event)"
          />
        </t-form-item>
        <t-form-item label="开始日期" name="startDate">
          <t-date-picker
            v-model="draft.startDate"
            class="w-full"
            :disable-date="disablePlanStartDate"
            format="YYYY-MM-DD"
            placeholder="请选择开始日期"
            value-type="YYYY-MM-DD"
          />
        </t-form-item>
        <t-form-item label="结束日期（可选）" name="endDate">
          <t-date-picker
            v-model="draft.endDate"
            class="w-full"
            clearable
            :disable-date="disablePlanEndDate"
            format="YYYY-MM-DD"
            placeholder="可留空"
            value-type="YYYY-MM-DD"
          />
        </t-form-item>
        <t-form-item class="sm:col-span-2" label="执行方式" name="executionMode">
          <div class="flex flex-col">
            <t-radio-group v-model="draft.executionMode">
              <t-radio value="manual">手动执行</t-radio>
              <t-radio value="local-draft">本地生成待处理记录</t-radio>
            </t-radio-group>
            <p class="mt-1 text-xs text-(--td-text-color-secondary)">
              手动模式不会生成首期；本地模式仅在应用打开时生成到期的待处理记录。
            </p>
          </div>
        </t-form-item>
      </div>

      <div class="plan-actions">
        <t-button
          v-if="plan && plan.status === 'active'"
          type="button"
          variant="outline"
          @click="emit('pause')"
        >
          暂停计划
        </t-button>
        <t-button v-else-if="plan" type="button" variant="outline" @click="emit('resume')">
          恢复计划
        </t-button>
        <t-popconfirm
          v-if="plan"
          content="删除计划不会删除历史买入记录，确认继续？"
          @confirm="emit('delete')"
        >
          <t-button type="button" theme="danger" variant="text">删除计划</t-button>
        </t-popconfirm>
      </div>
    </t-form>
  </section>
</template>

<style scoped>
@reference '@/style.css';

.plan-actions {
  @apply flex flex-wrap items-center gap-2 border-t border-(--td-component-stroke) pt-3;
}

:deep(.t-input-number) {
  width: 100%;
}
</style>
