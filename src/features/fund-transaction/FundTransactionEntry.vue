<script setup lang="ts">
import { computed, ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { fetchTiantianFundBasicInfo } from '@/domains/funds/services/tiantian/fetchTiantianFundBasicInfo.ts'
import type {
  PortfolioCoordinationStatus,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import {
  lookupExactUnitNav,
  type FundValue,
} from '@/domains/funds/services/tiantian/lookupExactUnitNav.ts'
import type {
  PortfolioBuyEvent,
  PortfolioEvent,
  PortfolioSellEvent,
  PortfolioTransactionEntryMode,
} from '@/domains/portfolio/models/index.ts'
import {
  deriveTransactionSchedule,
  getShanghaiMinute,
  isValidShanghaiMinute,
} from '@/domains/portfolio/services/tradingCalendar.ts'
import { useBreakpoints } from '@/shared/composables/useBreakpoints.ts'
import { createBuyDraft } from './models/buyDraft.ts'
import { createSellDraft } from './models/sellDraft.ts'
import {
  completeBuyEventWithExactNav,
  saveBuyDraft,
  updateBuyDraft,
} from './services/buyTransactionService.ts'
import {
  completeSellEventWithExactNav,
  saveSellDraft,
  updateSellDraft,
} from './services/sellTransactionService.ts'
import FundBuyForm from './components/FundBuyForm.vue'
import FundSellForm from './components/FundSellForm.vue'

type TransactionMode = 'buy' | 'sell'
type TransactionEvent = PortfolioBuyEvent | PortfolioSellEvent
type NavStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error'

const props = defineProps<{ portfolioCoordinator: PortfolioCoordinator }>()
const emit = defineEmits<{ saved: [] }>()

const mode = ref<TransactionMode>('buy')
const entryMode = ref<PortfolioTransactionEntryMode>('pending')
const visible = ref(false)
const fundCode = ref('')
const fundName = ref('')
const editingEvent = ref<TransactionEvent>()
const submittedAt = ref('')
const confirmedDate = ref('')
const totalAmountYuan = ref('')
const requestedUnits = ref('')
const actualUnits = ref('')
const actualPurchaseFeeYuan = ref('')
const actualRedemptionFeeYuan = ref('')
const purchaseFeePercent = ref<number | null>(null)
const purchaseFeePercentSource = ref<'fund-basic-info' | 'manual'>('fund-basic-info')
const purchaseConfirmationDays = ref<number | null>(null)
const redemptionConfirmationDays = ref<number | null>(null)
const basicInfoLoading = ref(false)
const basicInfoError = ref('')
const navValue = ref<FundValue | null>(null)
const navStatus = ref<NavStatus>('idle')
const navError = ref('')
const errors = ref<Readonly<Record<string, string>>>({})
const isSaving = ref(false)
const transactionForm = ref<{ validate: () => Promise<boolean> }>()
let openGeneration = 0
let navRequestGeneration = 0
const { isSmUp } = useBreakpoints()

const confirmationDays = computed(() =>
  mode.value === 'buy' ? purchaseConfirmationDays.value : redemptionConfirmationDays.value,
)
const schedule = computed(() => {
  if (!isValidShanghaiMinute(submittedAt.value)) return undefined
  try {
    return deriveTransactionSchedule({
      confirmationDays: confirmationDays.value,
      submittedAt: submittedAt.value,
    })
  } catch {
    return undefined
  }
})
const navDate = computed(() => schedule.value?.navDate ?? '')
const expectedConfirmationDate = computed(() =>
  entryMode.value === 'pending' ? (schedule.value?.expectedConfirmationDate ?? '') : '',
)
const hasConfirmedFacts = computed(
  () => confirmedDate.value.trim() !== '' && actualUnits.value.trim() !== '',
)
const transactionStatus = computed(() => {
  if (!hasConfirmedFacts.value) return '待确认'
  return navValue.value === null ? '已确认，净值待补全' : '已确认，净值已获取'
})
const transactionStatusTheme = computed<'default' | 'success' | 'warning'>(() => {
  if (!hasConfirmedFacts.value || navValue.value === null) return 'warning'
  return 'success'
})
const navStatusText = computed(() => {
  if (navStatus.value === 'loading') return '查询中'
  if (navStatus.value === 'ready') return '已获取精确历史净值'
  if (navStatus.value === 'missing') return '净值待补全'
  if (navStatus.value === 'error') return '查询失败，可重试'
  return '未查询'
})
const unitNavText = computed(() =>
  navValue.value === null ? '--' : navValue.value.unitNav.toFixed(4),
)
const navSourceText = computed(() => (navValue.value === null ? '' : '历史净值'))
const warnings = computed(() => {
  const result: string[] = []
  if (
    entryMode.value === 'pending' &&
    (confirmedDate.value.trim() === '') !== (actualUnits.value.trim() === '')
  ) {
    result.push('确认日期和确认份额需要同时填写；只填写一项时，记录仍按待确认处理。')
  }
  if (
    mode.value === 'sell' &&
    Number.isFinite(Number(actualUnits.value)) &&
    Number.isFinite(Number(requestedUnits.value)) &&
    Number(actualUnits.value) > Number(requestedUnits.value)
  ) {
    result.push('确认份额高于申请卖出份额，保存后请在成交记录中核对。')
  }
  return result
})
const grossAmountText = computed(() => {
  if (mode.value !== 'sell') return '--'
  const units = Number(actualUnits.value)
  if (Number.isFinite(units) && units > 0 && navValue.value !== null) {
    return formatYuan(units * navValue.value.unitNav)
  }
  const event = editingEvent.value
  return event?.kind === 'sell' && event.grossAmount.value !== null
    ? formatYuan(event.grossAmount.value / 100)
    : '--'
})
const netAmountText = computed(() => {
  if (mode.value !== 'sell' || grossAmountText.value === '--') return '--'
  const fee = parseMoneyYuan(actualRedemptionFeeYuan.value)
  if (fee === null) {
    const event = editingEvent.value
    return event?.kind === 'sell' && event.netAmount.value !== null
      ? formatYuan(event.netAmount.value / 100)
      : '--'
  }
  const gross = Number(grossAmountText.value.replace('¥', ''))
  return Number.isFinite(gross) ? `¥${Math.max(0, gross - fee).toFixed(2)}` : '--'
})

function open(code: string, name: string): void {
  openNewTransaction('buy', code, name)
}

function openSell(code: string, name: string): void {
  openNewTransaction('sell', code, name)
}

function openEdit(event: TransactionEvent, name: string): void {
  openGeneration += 1
  mode.value = event.kind
  entryMode.value = event.entryMode
  fundCode.value = event.fundCode
  fundName.value = name
  editingEvent.value = event
  submittedAt.value = event.submittedAt
  confirmedDate.value = event.confirmedDate ?? ''
  totalAmountYuan.value = event.kind === 'buy' ? formatCents(event.totalAmount.value) : ''
  requestedUnits.value = event.kind === 'sell' ? formatUnits(event.requestedUnits.value) : ''
  actualUnits.value = formatUnits(event.units.value)
  actualPurchaseFeeYuan.value =
    event.kind === 'buy' ? formatOptionalCents(event.purchaseFee.value) : ''
  actualRedemptionFeeYuan.value =
    event.kind === 'sell' ? formatOptionalCents(event.redemptionFee.value) : ''
  purchaseFeePercent.value = event.kind === 'buy' ? event.purchaseFeeRate.value : null
  purchaseFeePercentSource.value =
    event.kind === 'buy' && event.purchaseFeeRate.source === 'manual' ? 'manual' : 'fund-basic-info'
  purchaseConfirmationDays.value = null
  redemptionConfirmationDays.value = null
  basicInfoLoading.value = false
  basicInfoError.value = ''
  errors.value = {}
  setInitialNav(event)
  visible.value = true
  const generation = openGeneration
  void loadBasicInfo(event.fundCode, generation)
  void requestExactNav()
}

function close(): void {
  visible.value = false
  openGeneration += 1
  navRequestGeneration += 1
}

async function loadBasicInfo(code: string, generation: number): Promise<void> {
  basicInfoLoading.value = true
  basicInfoError.value = ''
  try {
    const basicInfo = await fetchTiantianFundBasicInfo(code)
    if (generation !== openGeneration) return
    purchaseConfirmationDays.value = basicInfo.purchaseConfirmationDays
    redemptionConfirmationDays.value = basicInfo.redemptionConfirmationDays
    if (editingEvent.value === undefined && basicInfo.purchaseFeePercent !== null) {
      purchaseFeePercent.value = basicInfo.purchaseFeePercent
      purchaseFeePercentSource.value = 'fund-basic-info'
    }
  } catch {
    if (generation === openGeneration) {
      basicInfoError.value = '基金基础资料加载失败，预计确认日暂不可用；仍可保存交易。'
    }
  } finally {
    if (generation === openGeneration) basicInfoLoading.value = false
  }
}

async function requestExactNav(shouldPersist = false): Promise<void> {
  const generation = ++navRequestGeneration
  const code = fundCode.value
  const date = navDate.value
  const eventId = editingEvent.value?.id
  const requestSubmittedAt = submittedAt.value
  if (!code || !date) {
    resetNavState()
    return
  }

  navStatus.value = 'loading'
  navError.value = ''
  try {
    const value = await lookupExactUnitNav(code, date)
    if (generation !== navRequestGeneration) return
    if (value === null) {
      navValue.value = null
      navStatus.value = 'missing'
      return
    }
    navValue.value = value
    navStatus.value = 'ready'
    if (shouldPersist && eventId !== undefined) {
      persistExactNav(eventId, requestSubmittedAt, date, value)
    }
  } catch {
    if (generation === navRequestGeneration) {
      navStatus.value = 'error'
      navError.value = '历史净值查询失败，请检查网络后重试。'
    }
  }
}

function persistExactNav(
  eventId: string,
  requestSubmittedAt: string,
  requestNavDate: string,
  value: FundValue,
): void {
  const event = props.portfolioCoordinator.getPortfolio().events.find(({ id }) => id === eventId)
  if (
    event === undefined ||
    (event.kind !== 'buy' && event.kind !== 'sell') ||
    event.submittedAt !== requestSubmittedAt ||
    event.navDate !== requestNavDate
  ) {
    return
  }
  const now = new Date().toISOString()
  const result =
    event.kind === 'buy'
      ? completeBuyEventWithExactNav(props.portfolioCoordinator, event, value, now)
      : completeSellEventWithExactNav(props.portfolioCoordinator, event, value, now)
  if ('reason' in result) {
    navError.value = '历史净值与交易日期不匹配，请重新查询。'
    return
  }
  if (isBlockingCoordinationStatus(result.status)) {
    navError.value = coordinationFailureText(
      result.status,
      result.failure?.persistence === 'partial',
    )
    return
  }
  emit('saved')
}

function retryNav(): void {
  void requestExactNav(true)
}

function updateSubmittedAt(value: string): void {
  submittedAt.value = value
  resetNavState()
  void requestExactNav()
}

function updateEntryMode(value: PortfolioTransactionEntryMode): void {
  if (value === 'pending' || value === 'historical') entryMode.value = value
}

function saveBuy(): void {
  const now = new Date().toISOString()
  const existing = editingEvent.value?.kind === 'buy' ? editingEvent.value : undefined
  const result = createBuyDraft(
    {
      actualPurchaseFeeYuan: actualPurchaseFeeYuan.value || undefined,
      actualUnits: actualUnits.value || undefined,
      confirmedDate: confirmedDate.value || undefined,
      entryMode: entryMode.value,
      fundCode: fundCode.value,
      id: existing?.id ?? createEventId(fundCode.value),
      purchaseFeePercent: purchaseFeePercent.value,
      purchaseFeePercentSource: purchaseFeePercentSource.value,
      submittedAt: submittedAt.value,
      totalAmountYuan: totalAmountYuan.value,
    },
    { confirmationDays: purchaseConfirmationDays.value, now },
  )
  if (!result.ok) {
    errors.value = result.errors
    return
  }

  const draft = preserveBuyFacts(result.draft, existing)
  const saveResult = existing
    ? updateBuyDraft(props.portfolioCoordinator, draft)
    : saveBuyDraft(props.portfolioCoordinator, draft)
  if (isBlockingCoordinationStatus(saveResult.status)) {
    handleTransactionSaveFailure(saveResult.status, saveResult.failure?.persistence === 'partial')
    return
  }
  completeSave(
    findTransactionEvent(saveResult.portfolio.events, draft.id) ?? draft,
    saveResult.status,
  )
}

function saveSell(): void {
  const now = new Date().toISOString()
  const existing = editingEvent.value?.kind === 'sell' ? editingEvent.value : undefined
  const result = createSellDraft(
    {
      actualRedemptionFeeYuan: actualRedemptionFeeYuan.value || undefined,
      actualUnits: actualUnits.value || undefined,
      confirmedDate: confirmedDate.value || undefined,
      entryMode: entryMode.value,
      fundCode: fundCode.value,
      id: existing?.id ?? createEventId(fundCode.value, 'sell'),
      requestedUnits: requestedUnits.value,
      submittedAt: submittedAt.value,
    },
    { confirmationDays: redemptionConfirmationDays.value, now },
  )
  if (!result.ok) {
    errors.value = result.errors
    return
  }

  const draft = preserveSellFacts(result.draft, existing)
  const saveResult = existing
    ? updateSellDraft(props.portfolioCoordinator, draft)
    : saveSellDraft(props.portfolioCoordinator, draft)
  if (isBlockingCoordinationStatus(saveResult.status)) {
    handleTransactionSaveFailure(saveResult.status, saveResult.failure?.persistence === 'partial')
    return
  }
  completeSave(
    findTransactionEvent(saveResult.portfolio.events, draft.id) ?? draft,
    saveResult.status,
  )
}

async function saveCurrentTransaction(): Promise<void> {
  if (isSaving.value || transactionForm.value === undefined) return
  if (!(await transactionForm.value.validate())) return
  isSaving.value = true
  try {
    if (mode.value === 'buy') saveBuy()
    else saveSell()
  } finally {
    isSaving.value = false
  }
}

function completeSave(event: TransactionEvent, status: PortfolioCoordinationStatus): void {
  editingEvent.value = event
  errors.value = {}
  if (status === 'synced') MessagePlugin.success('交易记录已保存，持仓已同步')
  else MessagePlugin.warning(coordinationStatusText(status))
  visible.value = false
  openGeneration += 1
  navRequestGeneration += 1
  emit('saved')
  if (event.unitNav.value === null) void requestExactNav(true)
}

function findTransactionEvent(
  events: readonly PortfolioEvent[],
  id: string,
): TransactionEvent | undefined {
  const event = events.find((candidate) => candidate.id === id)
  return event?.kind === 'buy' || event?.kind === 'sell' ? event : undefined
}

function preserveBuyFacts(
  draft: PortfolioBuyEvent,
  existing: PortfolioBuyEvent | undefined,
): PortfolioBuyEvent {
  const unitNav = resolveUnitNav(draft.navDate, existing)
  return {
    ...draft,
    ...(existing === undefined ? {} : { createdAt: existing.createdAt, id: existing.id }),
    ...(unitNav === undefined ? {} : { unitNav }),
  }
}

function preserveSellFacts(
  draft: PortfolioSellEvent,
  existing: PortfolioSellEvent | undefined,
): PortfolioSellEvent {
  const unitNav = resolveUnitNav(draft.navDate, existing)
  const preserveAmounts =
    existing?.navDate === draft.navDate &&
    existing.units.value === draft.units.value &&
    existing.redemptionFee.value === draft.redemptionFee.value &&
    unitNav !== undefined
  return {
    ...draft,
    ...(existing === undefined ? {} : { createdAt: existing.createdAt, id: existing.id }),
    ...(preserveAmounts
      ? { grossAmount: existing.grossAmount, netAmount: existing.netAmount }
      : {}),
    ...(unitNav === undefined ? {} : { unitNav }),
  }
}

function resolveUnitNav(
  date: string,
  existing: TransactionEvent | undefined,
): TransactionEvent['unitNav'] | undefined {
  if (navValue.value?.date === date) {
    return { confidence: 'actual', source: navValue.value.source, value: navValue.value.unitNav }
  }
  if (existing?.navDate === date) return existing.unitNav
  return undefined
}

function setInitialNav(event: TransactionEvent): void {
  navError.value = ''
  if (
    event.unitNav.value === null ||
    event.unitNav.confidence !== 'actual' ||
    event.unitNav.source !== 'nav-history'
  ) {
    resetNavState()
    return
  }
  navValue.value = { date: event.navDate, source: 'nav-history', unitNav: event.unitNav.value }
  navStatus.value = 'ready'
}

function resetNavState(): void {
  navValue.value = null
  navStatus.value = 'idle'
  navError.value = ''
}

function openNewTransaction(nextMode: TransactionMode, code: string, name: string): void {
  openGeneration += 1
  mode.value = nextMode
  entryMode.value = 'pending'
  fundCode.value = code
  fundName.value = name
  editingEvent.value = undefined
  submittedAt.value = getShanghaiMinute()
  confirmedDate.value = ''
  totalAmountYuan.value = ''
  requestedUnits.value = ''
  actualUnits.value = ''
  actualPurchaseFeeYuan.value = ''
  actualRedemptionFeeYuan.value = ''
  purchaseFeePercent.value = null
  purchaseFeePercentSource.value = 'fund-basic-info'
  purchaseConfirmationDays.value = null
  redemptionConfirmationDays.value = null
  basicInfoError.value = ''
  errors.value = {}
  resetNavState()
  visible.value = true
  const generation = openGeneration
  void loadBasicInfo(code, generation)
  void requestExactNav()
}

function createEventId(code: string, kind: 'buy' | 'sell' = 'buy'): string {
  return `${kind}:${code}:${globalThis.crypto.randomUUID()}`
}

function formatCents(value: number | null): string {
  return value === null ? '' : (value / 100).toFixed(2)
}

function formatOptionalCents(value: number | null): string {
  return value === null ? '' : (value / 100).toFixed(2)
}

function formatUnits(value: number | null): string {
  return value === null ? '' : value.toFixed(4)
}

function formatYuan(value: number): string {
  return `¥${value.toFixed(2)}`
}

function parseMoneyYuan(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isBlockingCoordinationStatus(status: PortfolioCoordinationStatus): boolean {
  return (
    status === 'ledger-error' ||
    status === 'portfolio-persistence-failed' ||
    status === 'holding-sync-failed'
  )
}

function coordinationStatusText(status: PortfolioCoordinationStatus): string {
  if (status === 'pending-confirmation') return '交易记录已保存，等待确认事实后同步持仓。'
  if (status === 'pending-exact-data') return '交易记录已保存，精确数据待补全。'
  if (status === 'ledger-error') return '账本异常，交易记录未能更新当前持仓，请重试。'
  if (status === 'holding-sync-failed') return '持仓同步失败，请重试。'
  return '交易记录已保存，持仓已同步。'
}

function coordinationFailureText(
  status: PortfolioCoordinationStatus,
  hasPartialPersistence: boolean,
): string {
  if (status === 'ledger-error') return '账本异常，交易记录未能更新当前持仓，请重试。'
  if (status === 'holding-sync-failed') {
    return hasPartialPersistence
      ? '持仓同步失败，数据可能已部分持久化，请重试并检查账本。'
      : '持仓同步失败，请重试。'
  }
  return hasPartialPersistence
    ? '交易记录可能已部分保存，请重试并检查账本。'
    : '交易记录保存失败，账本未改变，请重试。'
}

function handleTransactionSaveFailure(
  status: PortfolioCoordinationStatus,
  hasPartialPersistence: boolean,
): void {
  const message = coordinationFailureText(status, hasPartialPersistence)
  if (status === 'ledger-error' || hasPartialPersistence) {
    errors.value = { form: message }
    return
  }
  errors.value = {}
  MessagePlugin.error(message)
}

defineExpose({ open, openBuy: open, openEdit, openSell })
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
      :actual-units="actualUnits"
      :basic-info-error="basicInfoError"
      :basic-info-loading="basicInfoLoading"
      :confirmed-date="confirmedDate"
      :entry-mode="entryMode"
      :errors="errors"
      :expected-confirmation-date="expectedConfirmationDate"
      :fund-code="fundCode"
      :fund-name="fundName"
      :nav-date="navDate"
      :nav-error="navError"
      :nav-loading="navStatus === 'loading'"
      :nav-source-text="navSourceText"
      :nav-status="navStatus"
      :nav-status-text="navStatusText"
      :status-text="transactionStatus"
      :status-theme="transactionStatusTheme"
      :submitted-at="submittedAt"
      :total-amount-yuan="totalAmountYuan"
      :unit-nav-text="unitNavText"
      :warnings="warnings"
      @retry-nav="retryNav"
      @save="saveBuy"
      @update-actual-purchase-fee-yuan="actualPurchaseFeeYuan = $event"
      @update-actual-units="actualUnits = $event"
      @update-confirmed-date="confirmedDate = $event"
      @update-entry-mode="updateEntryMode"
      @update-submitted-at="updateSubmittedAt"
      @update-total-amount-yuan="totalAmountYuan = $event"
    />
    <FundSellForm
      v-else
      ref="transactionForm"
      :actual-redemption-fee-yuan="actualRedemptionFeeYuan"
      :actual-units="actualUnits"
      :basic-info-error="basicInfoError"
      :basic-info-loading="basicInfoLoading"
      :confirmed-date="confirmedDate"
      :entry-mode="entryMode"
      :errors="errors"
      :expected-confirmation-date="expectedConfirmationDate"
      :fund-code="fundCode"
      :fund-name="fundName"
      :gross-amount-text="grossAmountText"
      :nav-date="navDate"
      :nav-error="navError"
      :nav-loading="navStatus === 'loading'"
      :nav-source-text="navSourceText"
      :nav-status="navStatus"
      :nav-status-text="navStatusText"
      :net-amount-text="netAmountText"
      :requested-units="requestedUnits"
      :status-text="transactionStatus"
      :status-theme="transactionStatusTheme"
      :submitted-at="submittedAt"
      :unit-nav-text="unitNavText"
      :warnings="warnings"
      @retry-nav="retryNav"
      @save="saveSell"
      @update-actual-redemption-fee-yuan="actualRedemptionFeeYuan = $event"
      @update-actual-units="actualUnits = $event"
      @update-confirmed-date="confirmedDate = $event"
      @update-entry-mode="updateEntryMode"
      @update-requested-units="requestedUnits = $event"
      @update-submitted-at="updateSubmittedAt"
    />
    <template #footer>
      <div class="flex justify-end gap-2">
        <t-button type="button" variant="outline" @click="close">取消</t-button>
        <t-button type="button" theme="primary" :loading="isSaving" @click="saveCurrentTransaction">
          保存
        </t-button>
      </div>
    </template>
  </t-dialog>
  <t-drawer
    v-else
    v-model:visible="visible"
    attach="body"
    :showOverlay="false"
    :close-btn="false"
    :close-on-esc-keydown="false"
    :close-on-overlay-click="false"
    drawer-class-name="fund-transaction-drawer"
    :footer="false"
    placement="bottom"
    size="100dvh"
    :z-index="1600"
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
        <t-button
          class="justify-self-end"
          shape="square"
          size="large"
          theme="primary"
          variant="text"
          :loading="isSaving"
          @click="saveCurrentTransaction"
        >
          保存
        </t-button>
      </div>
    </template>
    <div class="fund-transaction-mobile-content">
      <FundBuyForm
        v-if="mode === 'buy'"
        ref="transactionForm"
        :actual-purchase-fee-yuan="actualPurchaseFeeYuan"
        :actual-units="actualUnits"
        :basic-info-error="basicInfoError"
        :basic-info-loading="basicInfoLoading"
        :confirmed-date="confirmedDate"
        :entry-mode="entryMode"
        :errors="errors"
        :expected-confirmation-date="expectedConfirmationDate"
        :fund-code="fundCode"
        :fund-name="fundName"
        :nav-date="navDate"
        :nav-error="navError"
        :nav-loading="navStatus === 'loading'"
        :nav-source-text="navSourceText"
        :nav-status="navStatus"
        :nav-status-text="navStatusText"
        :status-text="transactionStatus"
        :status-theme="transactionStatusTheme"
        :submitted-at="submittedAt"
        :total-amount-yuan="totalAmountYuan"
        :unit-nav-text="unitNavText"
        :warnings="warnings"
        @retry-nav="retryNav"
        @save="saveBuy"
        @update-actual-purchase-fee-yuan="actualPurchaseFeeYuan = $event"
        @update-actual-units="actualUnits = $event"
        @update-confirmed-date="confirmedDate = $event"
        @update-entry-mode="updateEntryMode"
        @update-submitted-at="updateSubmittedAt"
        @update-total-amount-yuan="totalAmountYuan = $event"
      />
      <FundSellForm
        v-else
        ref="transactionForm"
        :actual-redemption-fee-yuan="actualRedemptionFeeYuan"
        :actual-units="actualUnits"
        :basic-info-error="basicInfoError"
        :basic-info-loading="basicInfoLoading"
        :confirmed-date="confirmedDate"
        :entry-mode="entryMode"
        :errors="errors"
        :expected-confirmation-date="expectedConfirmationDate"
        :fund-code="fundCode"
        :fund-name="fundName"
        :gross-amount-text="grossAmountText"
        :nav-date="navDate"
        :nav-error="navError"
        :nav-loading="navStatus === 'loading'"
        :nav-source-text="navSourceText"
        :nav-status="navStatus"
        :nav-status-text="navStatusText"
        :net-amount-text="netAmountText"
        :requested-units="requestedUnits"
        :status-text="transactionStatus"
        :status-theme="transactionStatusTheme"
        :submitted-at="submittedAt"
        :unit-nav-text="unitNavText"
        :warnings="warnings"
        @retry-nav="retryNav"
        @save="saveSell"
        @update-actual-redemption-fee-yuan="actualRedemptionFeeYuan = $event"
        @update-actual-units="actualUnits = $event"
        @update-confirmed-date="confirmedDate = $event"
        @update-entry-mode="updateEntryMode"
        @update-requested-units="requestedUnits = $event"
        @update-submitted-at="updateSubmittedAt"
      />
    </div>
  </t-drawer>
</template>

<style scoped>
@reference '@/style.css';

:global(.fund-transaction-dialog .t-dialog__body) {
  @apply max-h-[calc(100dvh-176px)] overflow-y-auto scrollbar-none;
}

.fund-transaction-mobile-content {
  @apply min-h-0 overflow-y-auto pb-4;
}
</style>
