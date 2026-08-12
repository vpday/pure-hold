<script setup lang="ts">
import type {
  FundDistributionPanelModel,
  FundPerformancePanelRendererActionFor,
} from '../../models/fundPerformancePanel'
import FundDistributionPanel from '../FundDistributionPanel.vue'

defineProps<{ panel: FundDistributionPanelModel; visible: boolean }>()
const emit = defineEmits<{
  action: [action: FundPerformancePanelRendererActionFor<'distribution'>]
}>()
</script>

<template>
  <FundDistributionPanel
    :model="panel"
    @retry="emit('action', { panelId: 'distribution', type: 'retry-panel' })"
  />
</template>
