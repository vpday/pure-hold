<script setup lang="ts">
import { watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import type {
  FundHoldingCorrectionDraft,
  FundHoldingCorrectionDraftErrors,
} from '../models/fundHoldingCorrectionDraft'

const props = defineProps<{
  draft: FundHoldingCorrectionDraft
  errors: FundHoldingCorrectionDraftErrors
  submitError: string
  submitting: boolean
  visible: boolean
}>()
const emit = defineEmits<{
  close: []
  submit: []
  'update:visible': [visible: boolean]
}>()

function close(): void {
  emit('update:visible', false)
  emit('close')
}

function updateDraftValue(
  key: 'holdingAmountYuan' | 'holdingIncomeYuan' | 'targetUnits',
  value: unknown,
): void {
  props.draft[key] = value === undefined || value === null || value === '' ? '' : String(value)
}

watch(
  () => props.submitError,
  (message) => {
    if (message) MessagePlugin.error(message)
  },
)
watch(
  () => props.errors,
  (errors) => {
    if (errors.target) MessagePlugin.warning(errors.target)
  },
)
</script>

<template>
  <t-dialog
    :visible="visible"
    attach="body"
    :cancel-btn="false"
    :close-on-esc-keydown="false"
    :close-on-overlay-click="false"
    header="手工修正持仓"
    placement="center"
    width="min(520px, calc(100vw - 32px))"
    @close="close"
  >
    <t-form :data="draft" layout="vertical">
      <t-form-item
        label="持仓金额"
        name="holdingAmountYuan"
        :status="errors.holdingAmountYuan ? 'error' : undefined"
        :tips="errors.holdingAmountYuan"
      >
        <t-input-number
          :value="draft.holdingAmountYuan"
          :decimal-places="2"
          :min="0"
          placeholder="0.00"
          step="0.01"
          suffix="元"
          theme="normal"
          @change="updateDraftValue('holdingAmountYuan', $event)"
        />
      </t-form-item>
      <t-form-item
        label="持仓收益"
        name="holdingIncomeYuan"
        :status="errors.holdingIncomeYuan ? 'error' : undefined"
        :tips="errors.holdingIncomeYuan"
      >
        <t-input-number
          :value="draft.holdingIncomeYuan"
          :decimal-places="2"
          placeholder="0.00"
          step="0.01"
          suffix="元"
          theme="normal"
          @change="updateDraftValue('holdingIncomeYuan', $event)"
        />
      </t-form-item>
      <t-form-item
        label="份额"
        name="targetUnits"
        :status="errors.targetUnits ? 'error' : undefined"
        :tips="errors.targetUnits"
      >
        <t-input-number
          :value="draft.targetUnits"
          :decimal-places="4"
          :min="0"
          placeholder="0.0000"
          step="0.0001"
          suffix="份"
          theme="normal"
          @change="updateDraftValue('targetUnits', $event)"
        />
      </t-form-item>
      <t-form-item
        label="事件日期"
        name="confirmedDate"
        :status="errors.confirmedDate ? 'error' : undefined"
        :tips="errors.confirmedDate"
      >
        <t-date-picker
          v-model="draft.confirmedDate"
          class="w-full"
          allow-input
          format="YYYY-MM-DD"
          placeholder="请选择事件日期"
          value-type="YYYY-MM-DD"
        />
      </t-form-item>
      <t-form-item
        label="修正原因"
        name="reason"
        :status="errors.reason ? 'error' : undefined"
        :tips="errors.reason"
      >
        <t-textarea
          v-model="draft.reason"
          :autosize="{ minRows: 3, maxRows: 6 }"
          placeholder="请说明本次修正的依据"
        />
      </t-form-item>
    </t-form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <t-button variant="outline" @click="close">取消</t-button>
        <t-button :loading="submitting" theme="primary" @click="emit('submit')">保存</t-button>
      </div>
    </template>
  </t-dialog>
</template>

<style scoped>
:deep(.t-input-number) {
  width: 100%;
}
</style>
