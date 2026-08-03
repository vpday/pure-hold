<script setup lang="ts">
import { BarChart, LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { FundAssetAllocationChartModel } from '../models/fundAssetAllocationChart.ts'
import { buildFundAssetAllocationChartOption } from '../presenters/buildFundAssetAllocationChartOption.ts'

echarts.use([
  BarChart,
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

const props = defineProps<{
  error: string
  isLoading: boolean
  model?: FundAssetAllocationChartModel
  visible: boolean
  warning: string
}>()
const emit = defineEmits<{ retry: [] }>()
const container = ref<HTMLDivElement>()

let chart: echarts.ECharts | undefined
let resizeObserver: ResizeObserver | undefined

function render(): void {
  if (!chart || !props.model) return
  chart.setOption(
    buildFundAssetAllocationChartOption(props.model, {
      bond: themeColor('--td-success-color-5'),
      cash: themeColor('--td-gray-color-6'),
      netAsset: themeColor('--td-warning-color-6'),
      stock: themeColor('--td-brand-color-6'),
    }),
    true,
  )
}

async function syncChart(): Promise<void> {
  if (!props.model) return
  await nextTick()
  const element = container.value
  if (!element || element.clientWidth === 0 || element.clientHeight === 0) return
  chart ??= echarts.init(element)
  chart.resize()
  render()
}

function themeColor(name: string): string | undefined {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || undefined
}

onMounted(() => {
  const element = container.value
  if (!element) return
  resizeObserver = new ResizeObserver(() => void syncChart())
  resizeObserver.observe(element)
  void syncChart()
})

watch(
  () => props.model,
  () => void syncChart(),
)
watch(() => props.visible, syncChart)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = undefined
})
</script>

<template>
  <div class="relative min-h-80 w-full overflow-hidden">
    <div v-show="model" ref="container" class="h-90 w-full" />

    <div v-if="isLoading" class="loading-overlay">
      <t-loading text="资产配置加载中" />
    </div>

    <div v-if="warning && model" class="warning-overlay">
      <span>{{ warning }}</span>
      <t-button size="small" theme="warning" variant="outline" @click="emit('retry')">
        重试
      </t-button>
    </div>

    <div v-if="!model && !isLoading" class="flex min-h-80 items-center justify-center py-8">
      <t-empty :description="error || '暂无资产配置数据'">
        <template #action>
          <t-button size="small" variant="outline" @click="emit('retry')">重试</t-button>
        </template>
      </t-empty>
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.loading-overlay {
  @apply absolute inset-0 flex items-center justify-center bg-(--td-bg-color-container)/70;
}

.warning-overlay {
  @apply absolute right-3 bottom-3 left-3 flex items-center justify-between gap-3 rounded-md bg-(--td-warning-color-light-9) p-3 text-sm text-(--td-warning-color);
}
</style>
