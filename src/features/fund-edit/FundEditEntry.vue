<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { useFundsStore } from '@/domains/funds/stores/useFundsStore'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import FundEditContent from './components/FundEditContent.vue'
import FundEditDesktopDialog from './components/FundEditDesktopDialog.vue'
import FundEditMobileDrawer from './components/FundEditMobileDrawer.vue'
import {
  createFundEditDraft,
  type FundEditDraft,
  submitFundEditDraft,
} from './models/fundEditDraft'
import type { FundHoldingDraftErrors } from '../fund-holding-form/models/fundHoldingDraft'

const store = useFundsStore()
const { isSmUp } = useBreakpoints()
const visible = ref(false)
const draft = ref<FundEditDraft>()
const errors = ref<FundHoldingDraftErrors>({})
const submitError = ref('')

function open(code: string): void {
  close()
  const snapshot = store.snapshotsByCode[code]
  if (!store.fundOrder.includes(code) || !snapshot) {
    MessagePlugin.error('基金不存在，无法编辑')
    return
  }
  draft.value = createFundEditDraft(code, snapshot.name, store.holdingsByCode[code], store.groups)
  visible.value = true
}

function close(): void {
  visible.value = false
  draft.value = undefined
  errors.value = {}
  submitError.value = ''
}

function confirm(): void {
  if (!draft.value) return
  const result = submitFundEditDraft(draft.value, store)
  errors.value = result.fieldErrors
  submitError.value = result.error ?? ''
  if (!result.success) return
  MessagePlugin.success('基金信息已保存')
  close()
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
      :submit-error="submitError"
    />
  </FundEditDesktopDialog>
  <FundEditMobileDrawer v-else v-model:visible="visible" @close="close" @confirm="confirm">
    <FundEditContent
      v-if="draft"
      :draft="draft"
      :errors="errors"
      :groups="store.groups"
      :submit-error="submitError"
    />
  </FundEditMobileDrawer>
</template>
