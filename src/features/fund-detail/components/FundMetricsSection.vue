<script setup lang="ts">
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComponentPublicInstance } from 'vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { TableProps } from 'tdesign-vue-next'

import type {
  FundMetricComparisonRowModel,
  FundMetricsSectionModel,
  FundMetricsView,
  FundMetricTrend,
} from '../models/fundMetricsSectionModel.ts'
import { buildFundCalendarReturnsChartOption } from '../presenters/buildFundCalendarReturnsChartOption.ts'

echarts.use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  activeView: FundMetricsView
  error: string
  isLoading: boolean
  model?: FundMetricsSectionModel
}>()
const emit = defineEmits<{
  retry: []
  selectView: [view: FundMetricsView]
}>()
const calendarChartContainer = ref<HTMLDivElement>()

let calendarChart: echarts.ECharts | undefined
let calendarChartResizeObserver: ResizeObserver | undefined

const tabs = [
  { label: '阶段涨幅', value: 'periods' },
  { label: '季/年度涨幅', value: 'calendar' },
  { label: '年化收益', value: 'annualized' },
] as const
const comparisonColumns = computed<TableProps<FundMetricComparisonRowModel>['columns']>(() => [
  { colKey: 'label', title: '周期' },
  {
    cell: 'fund',
    colKey: 'fund',
    title: props.activeView === 'annualized' ? '基金收益' : '基金涨幅',
  },
  {
    cell: 'benchmark',
    colKey: 'benchmark',
    title: '沪深300全收益',
  },
  { cell: 'excess', colKey: 'excess', title: '超额收益' },
])

function trendClass(trend: FundMetricTrend): string {
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  if (trend === 'unknown') return 'text-(--td-text-color-placeholder)'
  return 'text-(--td-text-color-primary)'
}

function renderCalendarChart(): void {
  const model = props.model
  if (!calendarChart || !model) return
  calendarChart.setOption(buildFundCalendarReturnsChartOption(model), true)
}

function setCalendarChartContainer(element: Element | ComponentPublicInstance | null): void {
  calendarChartContainer.value = element instanceof HTMLDivElement ? element : undefined
}

async function syncCalendarChart(): Promise<void> {
  if (props.activeView !== 'calendar' || !props.model) return
  await nextTick()
  const element = calendarChartContainer.value
  if (!element) return
  if (!calendarChart) {
    calendarChart = echarts.init(element)
    calendarChartResizeObserver = new ResizeObserver(() => calendarChart?.resize())
    calendarChartResizeObserver.observe(element)
  }
  calendarChart.resize()
  renderCalendarChart()
}

watch(() => [props.activeView, props.model] as const, syncCalendarChart, { immediate: true })

onBeforeUnmount(() => {
  calendarChartResizeObserver?.disconnect()
  calendarChart?.dispose()
  calendarChart = undefined
})
</script>

<template>
  <div class="metrics-section">
    <h2 id="fund-detail-metrics-title" class="metrics-title">数据指标</h2>
    <t-tabs
      class="metrics-tabs"
      :value="activeView"
      @update:value="emit('selectView', String($event) as FundMetricsView)"
    >
      <t-tab-panel v-for="tab in tabs" :key="tab.value" :label="tab.label" :value="tab.value">
        <div class="pt-4">
          <t-alert v-if="error" class="mb-4" theme="error" :message="error">
            <template #operation>
              <t-button size="small" theme="danger" variant="text" @click="emit('retry')">
                重试
              </t-button>
            </template>
          </t-alert>
          <t-skeleton
            v-if="isLoading && !model"
            animation="gradient"
            :row-col="[1, 1, 1, 1, 1, 1, 1, 1, 1, 1]"
          />
          <template v-else-if="model">
            <div v-if="tab.value !== 'calendar'">
              <t-table
                bordered
                :columns="comparisonColumns"
                :data="tab.value === 'periods' ? model.periods : model.annualized"
                empty="暂无收益指标"
                row-key="key"
                size="small"
                table-layout="auto"
              >
                <template #fund="{ row }">
                  <span class="font-mono tabular-nums" :class="trendClass(row.fund.trend)">
                    {{ row.fund.text }}
                  </span>
                </template>
                <template #benchmark="{ row }">
                  <span class="font-mono tabular-nums" :class="trendClass(row.benchmark.trend)">
                    {{ row.benchmark.text }}
                  </span>
                </template>
                <template #excess="{ row }">
                  <span class="font-mono tabular-nums" :class="trendClass(row.excess.trend)">
                    {{ row.excess.text }}
                  </span>
                </template>
              </t-table>
            </div>
            <template v-else>
              <div
                :ref="setCalendarChartContainer"
                aria-label="季度与年度涨幅柱状图"
                class="mb-3 h-90 w-full"
                role="img"
              />
              <div class="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
                <section class="min-w-0">
                  <h3 class="mb-3 text-base font-medium">季度涨幅</h3>
                  <t-table
                    bordered
                    :columns="comparisonColumns"
                    :data="model.quarterlyReturns"
                    empty="暂无季度涨幅"
                    row-key="key"
                    size="small"
                    table-layout="auto"
                    :max-height="400"
                  >
                    <template #fund="{ row }">
                      <span class="font-mono tabular-nums" :class="trendClass(row.fund.trend)">
                        {{ row.fund.text }}
                      </span>
                    </template>
                    <template #benchmark="{ row }">
                      <span class="font-mono tabular-nums" :class="trendClass(row.benchmark.trend)">
                        {{ row.benchmark.text }}
                      </span>
                    </template>
                    <template #excess="{ row }">
                      <span class="font-mono tabular-nums" :class="trendClass(row.excess.trend)">
                        {{ row.excess.text }}
                      </span>
                    </template>
                  </t-table>
                </section>
                <section class="min-w-0">
                  <h3 class="mb-3 text-base font-medium">年度涨幅</h3>
                  <t-table
                    bordered
                    :columns="comparisonColumns"
                    :data="model.annualReturns"
                    empty="暂无年度涨幅"
                    row-key="key"
                    size="small"
                    table-layout="auto"
                    :max-height="400"
                  >
                    <template #fund="{ row }">
                      <span class="font-mono tabular-nums" :class="trendClass(row.fund.trend)">
                        {{ row.fund.text }}
                      </span>
                    </template>
                    <template #benchmark="{ row }">
                      <span class="font-mono tabular-nums" :class="trendClass(row.benchmark.trend)">
                        {{ row.benchmark.text }}
                      </span>
                    </template>
                    <template #excess="{ row }">
                      <span class="font-mono tabular-nums" :class="trendClass(row.excess.trend)">
                        {{ row.excess.text }}
                      </span>
                    </template>
                  </t-table>
                </section>
              </div>
            </template>
            <div class="metrics-note">
              <p>{{ model.cutoffText }}</p>
              <p>风险提示：数据仅供参考，过往业绩不预示未来表现！</p>
            </div>
          </template>
        </div>
      </t-tab-panel>
    </t-tabs>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.metrics-note {
  @apply mt-4 flex flex-col justify-between text-xs text-(--td-text-color-secondary) md:flex-row;
}

.metrics-section {
  @apply mt-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4;
}

.metrics-title {
  @apply flex h-12 items-center text-lg font-medium text-(--td-text-color-primary);
}

.metrics-tabs {
  display: contents;
}

.metrics-tabs :deep(.t-tabs__header) {
  @apply col-start-2 row-start-1 min-w-0;
}

.metrics-tabs :deep(.t-tabs__content) {
  @apply col-span-2 row-start-2 min-w-0;
}
</style>
