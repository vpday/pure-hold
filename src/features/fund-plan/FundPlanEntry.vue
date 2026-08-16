<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import type { PortfolioPlan } from '@/domains/portfolio/models/index.ts'
import { deletePortfolioPlan } from '@/domains/portfolio/services/portfolioPlanService.ts'
import type { PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import FundPlanForm from './components/FundPlanForm.vue'
import FundPlanDesktopDialog from './components/FundPlanDesktopDialog.vue'
import FundPlanMobileDrawer from './components/FundPlanMobileDrawer.vue'
import { submitPortfolioPlanDraft, type PortfolioPlanDraft } from './models/portfolioPlanDraft.ts'

const props = defineProps<{ portfolio: PortfolioStore }>()
const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const visible = ref(false)
const fundCode = ref('')
const fundName = ref('')
const plan = ref<PortfolioPlan>()
const planError = ref('')
const planForm = ref<InstanceType<typeof FundPlanForm>>()

function open(code: string, name: string): void {
  close()
  const snapshot = store.snapshotsByCode[code]
  if (!store.fundOrder.includes(code) || !snapshot) {
    MessagePlugin.error('基金不存在，无法编辑定投计划')
    return
  }
  fundCode.value = code
  fundName.value = name
  plan.value = props.portfolio.getPortfolio().plans.find(({ fundCode }) => fundCode === code)
  planError.value = ''
  visible.value = true
}

function close(): void {
  visible.value = false
  fundCode.value = ''
  fundName.value = ''
  plan.value = undefined
  planError.value = ''
}

function savePlan(planDraft: PortfolioPlanDraft): void {
  const result = submitPortfolioPlanDraft(planDraft, {
    now: new Date().toISOString(),
    today: shanghaiDate(),
  })
  if (!result.ok) {
    planError.value = Object.values(result.errors)[0] ?? '定投计划填写有误'
    return
  }
  const command = plan.value
    ? props.portfolio.updatePlan(result.plan)
    : props.portfolio.addPlan(result.plan)
  if (!command.ok) {
    planError.value = '定投计划保存失败，原有账本未改变'
    return
  }
  plan.value = command.portfolio.plans.find(({ id }) => id === result.plan.id)
  planError.value = ''
  MessagePlugin.success('定投计划已保存')
}

async function submitPlan(): Promise<void> {
  await planForm.value?.submit()
}

function updatePlanStatus(status: PortfolioPlan['status']): void {
  if (!plan.value) return
  const result = props.portfolio.updatePlan({
    ...plan.value,
    status,
    updatedAt: new Date().toISOString(),
  })
  if (!result.ok) {
    planError.value = '定投计划状态保存失败'
    return
  }
  plan.value = result.portfolio.plans.find(({ id }) => id === plan.value?.id)
  planError.value = ''
  MessagePlugin.success(status === 'active' ? '定投计划已恢复' : '定投计划已暂停')
}

function deletePlan(): void {
  if (!plan.value) return
  const result = deletePortfolioPlan(props.portfolio, plan.value.id, new Date().toISOString())
  if (!result.ok) {
    planError.value = '定投计划删除失败，历史交易未改变'
    return
  }
  plan.value = undefined
  planError.value = ''
  MessagePlugin.success('定投计划已删除，历史交易已保留')
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

defineExpose({ open })
</script>

<template>
  <FundPlanDesktopDialog v-if="isSmUp" v-model:visible="visible" @close="close">
    <div v-if="fundCode" class="flex flex-col gap-4">
      <header class="flex flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="min-w-0 flex-1 font-medium text-(--td-text-color-primary)">{{ fundName }}</h3>
          <t-tag variant="light">{{ fundCode }}</t-tag>
        </div>
        <p class="text-xs text-(--td-text-color-secondary)">
          只记录本地定投计划，不会自动扣款或访问基金平台。
        </p>
      </header>
      <FundPlanForm
        ref="planForm"
        :error="planError"
        :fund-code="fundCode"
        :plan="plan"
        standalone
        @delete="deletePlan"
        @pause="updatePlanStatus('paused')"
        @resume="updatePlanStatus('active')"
        @save="savePlan"
      />
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <t-button type="button" variant="outline" @click="close">取消</t-button>
        <t-button type="button" theme="primary" @click="submitPlan">确认</t-button>
      </div>
    </template>
  </FundPlanDesktopDialog>

  <FundPlanMobileDrawer v-else v-model:visible="visible" @close="close">
    <div v-if="fundCode" class="fund-plan-mobile-content">
      <header class="flex flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="min-w-0 flex-1 font-medium text-(--td-text-color-primary)">{{ fundName }}</h3>
          <t-tag variant="light">{{ fundCode }}</t-tag>
        </div>
        <p class="text-xs text-(--td-text-color-secondary)">
          只记录本地定投计划，不会自动扣款或访问基金平台。
        </p>
      </header>
      <FundPlanForm
        ref="planForm"
        :error="planError"
        :fund-code="fundCode"
        :plan="plan"
        standalone
        @delete="deletePlan"
        @pause="updatePlanStatus('paused')"
        @resume="updatePlanStatus('active')"
        @save="savePlan"
      />
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <t-button type="button" variant="outline" @click="close">取消</t-button>
        <t-button type="button" theme="primary" @click="submitPlan">确认</t-button>
      </div>
    </template>
  </FundPlanMobileDrawer>
</template>

<style scoped>
@reference '@/style.css';

.fund-plan-mobile-content {
  @apply flex min-h-full flex-col gap-4;
}
</style>
