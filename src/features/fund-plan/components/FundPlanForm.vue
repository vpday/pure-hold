<script setup lang="ts">
import { ref, watch } from 'vue'

import type { PortfolioPlan } from '@/domains/portfolio/models/index.ts'
import { createPortfolioPlanDraft, type PortfolioPlanDraft } from '../models/portfolioPlanDraft.ts'

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

const editing = ref(props.standalone === true || props.plan !== undefined)
const draft = ref(createPortfolioPlanDraft(props.plan, props.fundCode, shanghaiDate()))

watch(
  () => [props.plan, props.fundCode] as const,
  ([plan, fundCode]) => {
    draft.value = createPortfolioPlanDraft(plan, fundCode, shanghaiDate())
    editing.value = props.standalone === true || plan !== undefined
  },
)

function startEditing(): void {
  editing.value = true
}

function submit(): void {
  emit('save', draft.value)
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

defineExpose({ submit })
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

    <form v-if="editing" class="mt-4 flex flex-col gap-3" @submit.prevent="submit">
      <t-alert v-if="error" theme="error" :message="error" />
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1 text-sm">
          <span>每期含费总额</span>
          <t-input v-model="draft.amountYuan" suffix="元" placeholder="例如 500.00" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>申购费率覆盖（可选）</span>
          <t-input v-model="draft.purchaseFeePercent" suffix="%" placeholder="跟随基金资料" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>执行周期</span>
          <t-select v-model="draft.cycle">
            <t-option value="weekly" label="每周" />
            <t-option value="monthly" label="每月" />
          </t-select>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>{{ draft.cycle === 'weekly' ? '执行星期（1=周一）' : '执行日期（1 至 31）' }}</span>
          <t-input v-model="draft.executionDay" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>开始日期</span>
          <t-input v-model="draft.startDate" placeholder="YYYY-MM-DD" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>结束日期（可选）</span>
          <t-input v-model="draft.endDate" placeholder="YYYY-MM-DD" />
        </label>
        <label class="flex flex-col gap-1 text-sm sm:col-span-2">
          <span>执行方式</span>
          <t-select v-model="draft.executionMode">
            <t-option value="manual" label="手动执行" />
            <t-option value="local-draft" label="本地生成待处理记录" />
          </t-select>
          <span class="text-xs text-(--td-text-color-secondary)">
            手动模式不会生成首期；本地模式仅在应用打开时生成到期的待处理记录。
          </span>
        </label>
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
    </form>
  </section>
</template>

<style scoped>
@reference '@/style.css';

.plan-actions {
  @apply flex flex-wrap items-center gap-2 border-t border-(--td-component-stroke) pt-3;
}
</style>
