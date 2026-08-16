<script setup lang="ts">
import { ref } from 'vue'

import { fetchTiantianFundBasicInfo } from '@/domains/funds/services/tiantian/fetchTiantianFundBasicInfo.ts'
import { lookupExactUnitNav } from '@/domains/funds/services/tiantian/lookupExactUnitNav.ts'
import type {
  PortfolioBuyEvent,
  PortfolioInstallment,
  PortfolioPlan,
} from '@/domains/portfolio/models/index.ts'
import {
  deferPlanInstallment,
  ensurePlanInstallment,
  planBuyEventId,
} from '@/domains/portfolio/services/portfolioPlanService.ts'
import type { PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import { useBreakpoints } from '@/shared/composables/useBreakpoints.ts'
import { createBuyDraft } from './models/buyDraft.ts'
import { createSellDraft } from './models/sellDraft.ts'
import {
  completeBuyEventWithExactNav,
  completePlanBuyEventWithExactNav,
  saveBuyDraft,
  savePlanBuyDraft,
} from './services/buyTransactionService.ts'
import { saveSellDraft } from './services/sellTransactionService.ts'
import FundBuyForm from './components/FundBuyForm.vue'
import FundSellForm from './components/FundSellForm.vue'

const props = defineProps<{ portfolio: PortfolioStore }>()
const emit = defineEmits<{ saved: [] }>()
const mode = ref<'buy' | 'sell'>('buy')
const visible = ref(false)
const fundCode = ref('')
const fundName = ref('')
const confirmedDate = ref('')
const totalAmountYuan = ref('')
const purchaseFeePercent = ref('')
const purchaseFeePercentSource = ref<'fund-basic-info' | 'manual'>('fund-basic-info')
const actualUnits = ref('')
const actualPurchaseFeeYuan = ref('')
const actualUnitNav = ref('')
const sellUnits = ref('')
const actualNetAmountYuan = ref('')
const actualRedemptionFeeYuan = ref('')
const errors = ref<Readonly<Record<string, string>>>({})
const transactionForm = ref<{ validate: () => Promise<boolean> }>()
interface PlanBuyContext {
  readonly existingEvent?: PortfolioBuyEvent
  readonly installment?: PortfolioInstallment
  readonly plan: PortfolioPlan
  readonly plannedDate: string
}
const planBuyContext = ref<PlanBuyContext>()
let openGeneration = 0
const { isSmUp } = useBreakpoints()

export interface BuyTransactionOpenOptions {
  readonly existingEvent?: PortfolioBuyEvent
  readonly installment?: PortfolioInstallment
  readonly plan?: PortfolioPlan
  readonly plannedDate?: string
}

function open(code: string, name: string, options: BuyTransactionOpenOptions = {}): void {
  mode.value = 'buy'
  openGeneration += 1
  const generation = openGeneration
  fundCode.value = code
  fundName.value = name
  planBuyContext.value =
    options.plan === undefined
      ? undefined
      : {
          existingEvent: options.existingEvent,
          installment: options.installment,
          plan: options.plan,
          plannedDate:
            options.plannedDate ?? options.installment?.plannedDate ?? options.plan.startDate,
        }
  const existingEvent = options.existingEvent
  confirmedDate.value =
    existingEvent?.confirmedDate ?? planBuyContext.value?.plannedDate ?? defaultTransactionDate()
  totalAmountYuan.value = existingEvent
    ? formatCents(existingEvent.totalAmount.value)
    : options.plan
      ? formatCents(options.plan.amountCents)
      : ''
  purchaseFeePercent.value =
    existingEvent?.purchaseFeeRate.value?.toString() ??
    options.plan?.purchaseFeeRate?.toString() ??
    ''
  purchaseFeePercentSource.value = 'fund-basic-info'
  actualUnits.value = formatNumber(existingEvent?.units.value)
  actualPurchaseFeeYuan.value = formatCents(existingEvent?.purchaseFee.value)
  actualUnitNav.value = formatNumber(existingEvent?.unitNav.value)
  sellUnits.value = ''
  actualNetAmountYuan.value = ''
  actualRedemptionFeeYuan.value = ''
  errors.value = {}
  visible.value = true
  void loadPurchaseFee(code, generation)
}

function openSell(code: string, name: string): void {
  mode.value = 'sell'
  openGeneration += 1
  fundCode.value = code
  fundName.value = name
  confirmedDate.value = defaultTransactionDate()
  sellUnits.value = ''
  actualUnitNav.value = ''
  actualNetAmountYuan.value = ''
  actualRedemptionFeeYuan.value = ''
  planBuyContext.value = undefined
  errors.value = {}
  visible.value = true
}

function close(): void {
  visible.value = false
  planBuyContext.value = undefined
}

async function loadPurchaseFee(code: string, generation: number): Promise<void> {
  try {
    const basicInfo = await fetchTiantianFundBasicInfo(code)
    if (generation === openGeneration && basicInfo.purchaseFeePercent !== null) {
      purchaseFeePercent.value = String(basicInfo.purchaseFeePercent)
      purchaseFeePercentSource.value = 'fund-basic-info'
    }
  } catch {
    // The fee rate stays blank and the draft remains explicitly pending.
  }
}

function saveBuy(): void {
  const now = new Date().toISOString()
  const context = planBuyContext.value
  const ensured = context
    ? ensurePlanInstallment(
        props.portfolio,
        context.plan,
        context.installment?.plannedDate ?? context.plannedDate,
        now,
      )
    : undefined
  if (ensured !== undefined && !ensured.ok) {
    errors.value = { form: '定投期次保存失败，当前草稿未改变' }
    return
  }
  const installment = ensured?.ok ? ensured.installment : context?.installment
  const eventId =
    context && installment
      ? (context.existingEvent?.id ?? planBuyEventId(context.plan.id, installment.id))
      : createEventId(fundCode.value)
  const draft = createBuyDraft(
    {
      actualPurchaseFeeYuan: actualPurchaseFeeYuan.value || undefined,
      actualUnitNav: actualUnitNav.value || undefined,
      actualUnits: actualUnits.value || undefined,
      confirmedDate: confirmedDate.value,
      fundCode: fundCode.value,
      id: eventId,
      installmentId: context && installment ? installment.id : undefined,
      planId: context?.plan.id,
      purchaseFeePercent: purchaseFeePercent.value ? Number(purchaseFeePercent.value) : null,
      purchaseFeePercentSource: purchaseFeePercentSource.value,
      totalAmountYuan: totalAmountYuan.value,
    },
    { now, today: shanghaiDate() },
  )
  if (!draft.ok) {
    errors.value = draft.errors
    return
  }

  if (context && installment && confirmedDate.value !== installment.plannedDate) {
    const deferred = deferPlanInstallment(props.portfolio, installment.id, confirmedDate.value, now)
    if (!deferred.ok) {
      errors.value = { form: '顺延日期保存失败，当前草稿未改变' }
      return
    }
  }

  const result = context
    ? savePlanBuyDraft(props.portfolio, draft.draft)
    : saveBuyDraft(props.portfolio, draft.draft)
  if (!result.ok) {
    errors.value = { form: '保存失败，原有账本和当前草稿均未改变' }
    return
  }
  errors.value = {}
  visible.value = false
  emit('saved')
  if (draft.draft.unitNav.value === null) void completePendingBuy(draft.draft)
}

function saveSell(): void {
  const now = new Date().toISOString()
  const draft = createSellDraft(
    {
      actualNetAmountYuan: actualNetAmountYuan.value || undefined,
      actualRedemptionFeeYuan: actualRedemptionFeeYuan.value || undefined,
      actualUnitNav: actualUnitNav.value || undefined,
      confirmedDate: confirmedDate.value,
      fundCode: fundCode.value,
      id: createEventId(fundCode.value, 'sell'),
      units: sellUnits.value,
    },
    { now, today: shanghaiDate() },
  )
  if (!draft.ok) {
    errors.value = draft.errors
    return
  }

  const result = saveSellDraft(props.portfolio, draft.draft)
  if (!result.ok) {
    errors.value = { form: '保存失败，原有账本和当前草稿均未改变' }
    return
  }
  errors.value = {}
  visible.value = false
  emit('saved')
}

async function saveCurrentTransaction(): Promise<void> {
  if (transactionForm.value === undefined || !(await transactionForm.value.validate())) return
  if (mode.value === 'buy') saveBuy()
  else saveSell()
}

function updatePurchaseFeePercent(value: string): void {
  purchaseFeePercent.value = value
  purchaseFeePercentSource.value = 'manual'
}

async function completePendingBuy(event: Parameters<typeof completeBuyEventWithExactNav>[1]) {
  try {
    const value = await lookupExactUnitNav(event.fundCode, event.confirmedDate)
    if (value) {
      const now = new Date().toISOString()
      if (event.planId !== undefined && event.installmentId !== undefined) {
        completePlanBuyEventWithExactNav(props.portfolio, event, value, now)
      } else {
        completeBuyEventWithExactNav(props.portfolio, event, value, now)
      }
    }
  } catch {
    // Network and cancellation failures leave the saved event pending.
  }
}

function createEventId(code: string, kind: 'buy' | 'sell' = 'buy'): string {
  return `${kind}:${code}:${globalThis.crypto.randomUUID()}`
}

function formatCents(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : (value / 100).toFixed(2)
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
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

function defaultTransactionDate(now = new Date()): string {
  let value = shanghaiDate(now)
  while (isWeekend(value)) {
    const date = new Date(`${value}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() - 1)
    value = date.toISOString().slice(0, 10)
  }
  return value
}

function isWeekend(value: string): boolean {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay()
  return day === 0 || day === 6
}

defineExpose({ open, openBuy: open, openSell })
</script>

<template>
  <t-dialog
    v-if="isSmUp"
    v-model:visible="visible"
    attach="body"
    :close-on-esc-keydown="false"
    :close-on-overlay-click="false"
    dialog-class-name="fund-transaction-dialog"
    :header="mode === 'buy' ? '记录买入' : '记录卖出'"
    :prevent-scroll-through="true"
    width="min(560px, calc(100vw - 32px))"
    placement="center"
  >
    <FundBuyForm
      v-if="mode === 'buy'"
      ref="transactionForm"
      :actual-purchase-fee-yuan="actualPurchaseFeeYuan"
      :actual-unit-nav="actualUnitNav"
      :actual-units="actualUnits"
      :confirmed-date="confirmedDate"
      :errors="errors"
      :fund-code="fundCode"
      :fund-name="fundName"
      :purchase-fee-percent="purchaseFeePercent"
      :total-amount-yuan="totalAmountYuan"
      @save="saveBuy"
      @update-actual-purchase-fee-yuan="actualPurchaseFeeYuan = $event"
      @update-actual-unit-nav="actualUnitNav = $event"
      @update-actual-units="actualUnits = $event"
      @update-confirmed-date="confirmedDate = $event"
      @update-purchase-fee-percent="updatePurchaseFeePercent($event)"
      @update-total-amount-yuan="totalAmountYuan = $event"
    />
    <FundSellForm
      v-else
      ref="transactionForm"
      :actual-net-amount-yuan="actualNetAmountYuan"
      :actual-redemption-fee-yuan="actualRedemptionFeeYuan"
      :actual-unit-nav="actualUnitNav"
      :confirmed-date="confirmedDate"
      :errors="errors"
      :fund-code="fundCode"
      :fund-name="fundName"
      :units="sellUnits"
      @save="saveSell"
      @update-actual-net-amount-yuan="actualNetAmountYuan = $event"
      @update-actual-redemption-fee-yuan="actualRedemptionFeeYuan = $event"
      @update-actual-unit-nav="actualUnitNav = $event"
      @update-confirmed-date="confirmedDate = $event"
      @update-units="sellUnits = $event"
    />
    <template #footer>
      <div class="flex justify-end gap-2">
        <t-button type="button" variant="outline" @click="close">取消</t-button>
        <t-button type="button" theme="primary" @click="saveCurrentTransaction">确认</t-button>
      </div>
    </template>
  </t-dialog>
  <t-drawer
    v-else
    v-model:visible="visible"
    attach="body"
    :close-btn="false"
    :close-on-esc-keydown="false"
    :close-on-overlay-click="false"
    drawer-class-name="fund-transaction-drawer"
    placement="bottom"
    size="100dvh"
  >
    <template #header>
      <div class="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <t-button
          :aria-label="mode === 'buy' ? '关闭记录买入' : '关闭记录卖出'"
          shape="circle"
          variant="text"
          @click="close"
        >
          <template #icon><t-icon name="close" /></template>
        </t-button>
        <span class="text-lg font-medium">{{ mode === 'buy' ? '记录买入' : '记录卖出' }}</span>
        <span aria-hidden="true" />
      </div>
    </template>
    <div class="fund-transaction-mobile-content">
      <FundBuyForm
        v-if="mode === 'buy'"
        ref="transactionForm"
        :actual-purchase-fee-yuan="actualPurchaseFeeYuan"
        :actual-unit-nav="actualUnitNav"
        :actual-units="actualUnits"
        :confirmed-date="confirmedDate"
        :errors="errors"
        :fund-code="fundCode"
        :fund-name="fundName"
        :purchase-fee-percent="purchaseFeePercent"
        :total-amount-yuan="totalAmountYuan"
        @save="saveBuy"
        @update-actual-purchase-fee-yuan="actualPurchaseFeeYuan = $event"
        @update-actual-unit-nav="actualUnitNav = $event"
        @update-actual-units="actualUnits = $event"
        @update-confirmed-date="confirmedDate = $event"
        @update-purchase-fee-percent="updatePurchaseFeePercent($event)"
        @update-total-amount-yuan="totalAmountYuan = $event"
      />
      <FundSellForm
        v-else
        ref="transactionForm"
        :actual-net-amount-yuan="actualNetAmountYuan"
        :actual-redemption-fee-yuan="actualRedemptionFeeYuan"
        :actual-unit-nav="actualUnitNav"
        :confirmed-date="confirmedDate"
        :errors="errors"
        :fund-code="fundCode"
        :fund-name="fundName"
        :units="sellUnits"
        @save="saveSell"
        @update-actual-net-amount-yuan="actualNetAmountYuan = $event"
        @update-actual-redemption-fee-yuan="actualRedemptionFeeYuan = $event"
        @update-actual-unit-nav="actualUnitNav = $event"
        @update-confirmed-date="confirmedDate = $event"
        @update-units="sellUnits = $event"
      />
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
        <t-button type="button" variant="outline" @click="close">取消</t-button>
        <t-button type="button" theme="primary" @click="saveCurrentTransaction">确认</t-button>
      </div>
    </template>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

:global(.fund-transaction-dialog .t-dialog__body),
:global(.fund-transaction-drawer .t-drawer__body) {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.fund-transaction-mobile-content {
  @apply min-h-0 overflow-y-auto pb-4;
}

:global(.fund-transaction-drawer .t-drawer__body) {
  overflow: hidden;
}
</style>
