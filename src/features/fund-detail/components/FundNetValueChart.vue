<script setup lang="ts">
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  DataZoomComponent,
  LegendComponent,
  MarkPointComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { FundNetValueChartModel } from '../models/fundNetValueChart'
import { buildFundNetValueChartOption } from '../presenters/buildFundNetValueChartOption'

echarts.use([
  LineChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  CanvasRenderer,
])

const props = defineProps<{
  error: string
  isLoading: boolean
  model?: FundNetValueChartModel
  visible: boolean
}>()
const emit = defineEmits<{ retry: [] }>()
const container = ref<HTMLDivElement>()

let chart: echarts.ECharts | undefined
let resizeObserver: ResizeObserver | undefined

function render(): void {
  if (!chart || !props.model) return
  chart.setOption(
    buildFundNetValueChartOption(props.model, {
      cumulativeLine: themeColor('--td-error-color-6'),
      decrease: themeColor('--td-success-color'),
      event: themeColor('--td-warning-color'),
      increase: themeColor('--td-error-color'),
      text: themeColor('--td-text-color-primary'),
      unitLine: themeColor('--td-brand-color-5'),
    }),
    true,
  )
}

function disposeChart(): void {
  resizeObserver?.disconnect()
  resizeObserver = undefined
  chart?.dispose()
  chart = undefined
}

function observeContainer(element: HTMLDivElement): void {
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => void syncChart())
  resizeObserver.observe(element)
}

async function syncChart(): Promise<void> {
  if (!props.model) return
  await nextTick()
  const element = container.value
  if (!element || element.clientWidth === 0 || element.clientHeight === 0) return
  if (chart && chart.getDom() !== element) {
    disposeChart()
    observeContainer(element)
  }
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
  observeContainer(element)
  void syncChart()
})

watch(
  () => props.model,
  () => void syncChart(),
)
watch(() => props.visible, syncChart)

onBeforeUnmount(() => {
  disposeChart()
})
</script>

<template>
  <div class="relative min-h-80 w-full overflow-hidden">
    <div v-show="model" ref="container" class="h-90 w-full" />

    <div v-if="isLoading" class="loading-overlay">
      <t-loading text="基金净值加载中" />
    </div>

    <div v-if="error && model" class="error-overlay">
      <span>{{ error }}</span>
      <t-button size="small" theme="danger" variant="outline" @click="emit('retry')">
        重试
      </t-button>
    </div>

    <div v-if="!model && !isLoading" class="flex min-h-80 items-center justify-center py-8">
      <t-empty :description="error || '暂无基金净值数据'">
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

.error-overlay {
  @apply absolute right-3 bottom-3 left-3 flex items-center justify-between gap-3 rounded-md bg-(--td-error-color-light-9) p-3 text-sm text-(--td-error-color);
}
</style>
