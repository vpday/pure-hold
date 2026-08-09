<script setup lang="ts">
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import type { FundCumulativeReturnsChartModel } from '../models/fundCumulativeReturnsChart'
import { buildFundCumulativeReturnsChartOption } from '../presenters/buildFundCumulativeReturnsChartOption'

echarts.use([
  LineChart,
  TooltipComponent,
  MarkPointComponent,
  GridComponent,
  LegendComponent,
  UniversalTransition,
  CanvasRenderer,
])

const props = defineProps<{
  error: string
  isLoading: boolean
  model?: FundCumulativeReturnsChartModel
  visible: boolean
}>()
const emit = defineEmits<{ retry: [] }>()
const container = ref<HTMLDivElement>()
const { isLgUp } = useBreakpoints()

let chart: echarts.ECharts | undefined
let resizeObserver: ResizeObserver | undefined

function render(): void {
  if (!chart || !props.model) return
  chart.setOption(
    buildFundCumulativeReturnsChartOption(props.model, {
      showLegend: isLgUp.value,
      theme: {
        annotation: themeColor('--td-font-gray-3'),
        drawdownLine: themeColor('--td-success-color-5'),
        fundLine: themeColor('--td-error-color-6'),
        peerLine: themeColor('--td-gray-color-5'),
        referenceLine: themeColor('--td-brand-color-4'),
      },
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

function summaryColor(color: FundCumulativeReturnsChartModel['summary'][number]['color']): string {
  if (color === 'fund') return 'var(--td-error-color-6)'
  if (color === 'peer') return 'var(--td-gray-color-5)'
  if (color === 'reference') return 'var(--td-brand-color-4)'
  return 'var(--td-success-color)'
}

function summaryValueColor(valueText: string): string | undefined {
  const value = Number.parseFloat(valueText)
  if (value < 0) return 'var(--td-success-color)'
  if (value > 0) return 'var(--td-error-color)'
  return undefined
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
watch(isLgUp, () => render())
watch(() => props.visible, syncChart)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = undefined
})
</script>

<template>
  <div class="relative min-h-80 w-full overflow-hidden">
    <div v-if="model" class="summary-grid">
      <div v-for="item in model.summary" :key="item.label" class="summary-item">
        <span class="summary-dot" :style="{ backgroundColor: summaryColor(item.color) }" />
        <span class="truncate">
          {{ item.label }}：<span :style="{ color: summaryValueColor(item.valueText) }">
            {{ item.valueText }}
          </span>
        </span>
      </div>
    </div>
    <div v-show="model" ref="container" class="h-90 w-full" />

    <div v-if="isLoading" class="loading-overlay">
      <t-loading text="累计收益加载中" />
    </div>

    <div v-if="error && model" class="error-overlay">
      <span>{{ error }}</span>
      <t-button size="small" theme="danger" variant="outline" @click="emit('retry')">
        重试
      </t-button>
    </div>

    <div v-if="!model && !isLoading" class="flex min-h-80 items-center justify-center">
      <t-empty :title="error || '暂无累计收益数据'">
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

.summary-grid {
  @apply grid grid-cols-2 text-xs text-(--td-text-color-primary) lg:absolute lg:top-0 lg:left-0 lg:z-10 lg:flex
  lg:flex-nowrap lg:gap-3;
}

.summary-item {
  @apply flex min-w-0 items-center gap-1 whitespace-nowrap;
}

.summary-dot {
  @apply size-2.5 shrink-0 rounded-full;
}
</style>
