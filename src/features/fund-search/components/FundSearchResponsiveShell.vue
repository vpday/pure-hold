<script setup lang="ts">
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import type { FundAdditionStep } from '../models/fundAdditionSessionModel'
import FundSearchDesktopDialog from './FundSearchDesktopDialog.vue'
import FundSearchMobileDrawer from './FundSearchMobileDrawer.vue'

defineProps<{ step: FundAdditionStep }>()

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ close: [] }>()
const { isSmUp } = useBreakpoints()
</script>

<template>
  <FundSearchDesktopDialog
    v-if="isSmUp"
    v-model:visible="visible"
    :step="step"
    @close="emit('close')"
  >
    <slot />
    <template #footer>
      <slot name="footer" />
    </template>
  </FundSearchDesktopDialog>

  <FundSearchMobileDrawer v-else v-model:visible="visible" :step="step" @close="emit('close')">
    <slot />
    <template #footer>
      <slot name="footer" />
    </template>
  </FundSearchMobileDrawer>
</template>
