<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import type {
  PortfolioCoordinationStatus,
  PortfolioCoordinator,
} from '@/app/portfolio/portfolioCoordinator.ts'
import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import FundEditContent from './components/FundEditContent.vue'
import FundEditDesktopDialog from './components/FundEditDesktopDialog.vue'
import FundEditMobileDrawer from './components/FundEditMobileDrawer.vue'
import {
  createFundEditDraft,
  type FundEditDraft,
  type FundEditSubmitResult,
  type EnsureFundLedger,
  hasSubsequentFundEvents,
  submitFundEditDraft,
} from './models/fundEditDraft'
import type { FundHoldingDraftErrors } from '../fund-holding-form/models/fundHoldingDraft'

const props = defineProps<{ portfolioCoordinator: PortfolioCoordinator }>()
const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const visible = ref(false)
const draft = ref<FundEditDraft>()
const errors = ref<FundHoldingDraftErrors>({})
const submitError = ref('')
const holdingFactsReadonly = ref(false)

function open(code: string): void {
  close()
  const snapshot = store.snapshotsByCode[code]
  if (!store.fundOrder.includes(code) || !snapshot) {
    MessagePlugin.error('基金不存在，无法编辑')
    return
  }
  holdingFactsReadonly.value = hasSubsequentFundEvents(
    props.portfolioCoordinator.getPortfolio().events,
    code,
  )
  draft.value = createFundEditDraft(code, snapshot.name, store.holdingsByCode[code], store.groups)
  visible.value = true
}

function close(): void {
  visible.value = false
  draft.value = undefined
  errors.value = {}
  submitError.value = ''
  holdingFactsReadonly.value = false
}

function confirm(): void {
  if (!draft.value) return
  const result = submitFundEditDraft(draft.value, {
    ensureFundLedger: createEnsureFundLedger(props.portfolioCoordinator),
    updateFundGroupMembership: store.updateFundGroupMembership,
    updateFundHolding: store.updateFundHolding,
    updateHoldingMetadata: props.portfolioCoordinator.updateHoldingMetadata,
    holdingFactsReadonly: holdingFactsReadonly.value,
  })
  errors.value = result.fieldErrors
  if (!result.success) {
    if (!result.error) return
    if (isPersistentSubmitFailure(result)) {
      submitError.value = result.error
    } else {
      submitError.value = ''
      MessagePlugin.error(result.error)
    }
    return
  }
  submitError.value = ''
  if (result.status === 'synced' || result.status === undefined) {
    MessagePlugin.success('基金信息已保存')
  } else {
    MessagePlugin.warning(`基金信息已保存，当前状态：${coordinationStatusText(result.status)}`)
  }
  close()
}

function isPersistentSubmitFailure(result: FundEditSubmitResult): boolean {
  return (
    result.holdingSaved === true ||
    result.failure?.persistence === 'partial' ||
    result.status === 'ledger-error' ||
    result.status === 'portfolio-persistence-failed' ||
    result.status === 'holding-sync-failed'
  )
}

function coordinationStatusText(status: PortfolioCoordinationStatus): string {
  if (status === 'pending-confirmation') return '待确认'
  if (status === 'pending-exact-data') return '待精确数据'
  if (status === 'ledger-error') return '账本异常'
  if (status === 'portfolio-persistence-failed') return '账本记录保存失败'
  if (status === 'holding-sync-failed') return '持仓同步失败'
  return '已同步'
}

function createEnsureFundLedger(coordinator: PortfolioCoordinator): EnsureFundLedger {
  return (fundCode) => {
    const result = coordinator.ensureFundLedger({ fundCode })
    return {
      ...(result.ok || result.failure === undefined ? {} : { failure: result.failure }),
      ok: result.ok,
      retryable: result.ok ? false : result.retryable,
    }
  }
}

defineExpose({ open })
</script>

<template>
  <FundEditDesktopDialog v-if="isSmUp" v-model:visible="visible" @close="close" @confirm="confirm">
    <FundEditContent
      v-if="draft"
      :draft="draft"
      :errors="errors"
      :groups="store.groups"
      :holding-facts-readonly="holdingFactsReadonly"
      :submit-error="submitError"
    />
  </FundEditDesktopDialog>
  <FundEditMobileDrawer v-else v-model:visible="visible" @close="close" @confirm="confirm">
    <FundEditContent
      v-if="draft"
      :draft="draft"
      :errors="errors"
      :groups="store.groups"
      :holding-facts-readonly="holdingFactsReadonly"
      :submit-error="submitError"
    />
  </FundEditMobileDrawer>
</template>
