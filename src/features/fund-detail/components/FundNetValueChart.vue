<script setup lang="ts">
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { FundNetValueChartModel, FundNetValueView } from '../models/fundNetValueChart'
import { buildFundNetValueChartOption } from '../presenters/buildFundNetValueChartOption'

echarts.use([LineChart, TooltipComponent, GridComponent, CanvasRenderer])

const props = defineProps<{
  error: string
  isLoading: boolean
  model?: FundNetValueChartModel
  view: FundNetValueView
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
      decrease: themeColor('--td-success-color'),
      increase: themeColor('--td-error-color'),
      line: themeColor('--td-error-color-6'),
      text: themeColor('--td-text-color-primary'),
    }),
    true,
  )
}

function themeColor(name: string): string | undefined {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || undefined
}

onMounted(() => {
  const element = container.value
  if (!element) return
  chart = echarts.init(element)
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(element)
  render()
})

watch(
  () => props.model,
  () => render(),
)
watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    chart?.resize()
    render()
  },
)

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
