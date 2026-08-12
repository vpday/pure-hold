<script setup lang="ts">
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, ref, watch } from 'vue'
import type { TableProps } from 'tdesign-vue-next'

import type {
  FundMetricComparisonRowModel,
  FundMetricsSectionModel,
  FundMetricsView,
  FundMetricTrend,
  FundRiskComparisonRowModel,
} from '../models/fundMetricsSectionModel.ts'
import type { FundRiskPeriodKey } from '@/domains/funds/models/fundRiskMetrics.ts'
import { useEChartsRuntime } from '../composables/useEChartsRuntime.ts'
import { buildFundCalendarReturnsChartOption } from '../presenters/buildFundCalendarReturnsChartOption.ts'

echarts.use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  activeView: FundMetricsView
  error: string
  isLoading: boolean
  model?: FundMetricsSectionModel
}>()
const emit = defineEmits<{
  applyRiskAssumptions: []
  retry: []
  selectView: [view: FundMetricsView]
  updateRiskFreeRate: [value: number | null]
  updateTargetRate: [value: number | null]
}>()
const dismissedAlertKeys = ref<ReadonlySet<string>>(new Set())
const selectedRiskPeriod = ref<FundRiskPeriodKey>('oneYear')

const tabs = [
  { label: '阶段涨幅', value: 'periods' },
  { label: '季/年度涨幅', value: 'calendar' },
  { label: '年化收益', value: 'annualized' },
  { label: '风险指标', value: 'risk' },
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
const riskColumns: TableProps<FundRiskComparisonRowModel>['columns'] = [
  { colKey: 'label', title: '指标' },
  { cell: 'fund', colKey: 'fund', title: '基金' },
  { cell: 'benchmark', colKey: 'benchmark', title: '沪深300全收益' },
  { cell: 'difference', colKey: 'difference', title: '差值' },
]
const riskMetricGuides = [
  {
    description: '所选周期内从净值高点到随后低点的最大跌幅；数值越低，通常表示极端亏损控制越好。',
    name: '最大回撤',
  },
  {
    description: '日收益率波动经年化后的结果；数值越低，通常表示收益路径越稳定。',
    name: '年化波动率',
  },
  {
    description: '年化收益率除以最大回撤，衡量每承担一单位回撤获得的收益；通常越高越好。',
    name: '卡玛比率',
  },
  {
    description: '相对无风险利率的超额收益除以总波动风险并年化；通常越高越好。',
    name: '夏普比率',
  },
  {
    description: '相对目标收益率的超额收益除以下行波动风险并年化；通常越高越好。',
    name: '索提诺比率',
  },
] as const
const selectedRisk = computed(() =>
  props.model?.risk?.periods.find(({ key }) => key === selectedRiskPeriod.value),
)
const visibleAlerts = computed(() =>
  (props.model?.alerts ?? []).filter(({ key }) => !dismissedAlertKeys.value.has(key)),
)

function dismissAlert(key: string): void {
  dismissedAlertKeys.value = new Set([...dismissedAlertKeys.value, key])
}

function trendClass(trend: FundMetricTrend): string {
  if (trend === 'up') return 'text-(--td-error-color)'
  if (trend === 'down') return 'text-(--td-success-color)'
  if (trend === 'unknown') return 'text-(--td-text-color-placeholder)'
  return 'text-(--td-text-color-primary)'
}

function nullableNumber(value: number | undefined): number | null {
  return value ?? null
}

const { setContainer: setCalendarChartContainer } = useEChartsRuntime({
  enabled: () => props.activeView === 'calendar' && Boolean(props.model),
  render: (chart) => {
    if (props.model) chart.setOption(buildFundCalendarReturnsChartOption(props.model), true)
  },
  renderDependencies: [() => props.model],
})
watch(
  () => props.model?.alerts.map(({ key }) => key) ?? [],
  (alertKeys) => {
    const currentAlertKeys = new Set(alertKeys)
    dismissedAlertKeys.value = new Set(
      [...dismissedAlertKeys.value].filter((key) => currentAlertKeys.has(key)),
    )
  },
)
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
            <div v-if="visibleAlerts.length > 0" class="mb-4 flex flex-col gap-2">
              <t-alert
                v-for="alert in visibleAlerts"
                :key="alert.key"
                :message="alert.message"
                :theme="alert.tone"
                :close-btn="true"
                @closed="dismissAlert(alert.key)"
              />
            </div>
            <div v-if="tab.value === 'risk' && model.risk" class="min-w-0">
              <div class="risk-controls">
                <div class="flex flex-wrap items-end gap-3">
                  <t-input-number
                    theme="normal"
                    label="无风险利率（年化）："
                    suffix="%"
                    auto-width
                    align="right"
                    :value="model.risk.riskFreeRatePercent"
                    @update:value="emit('updateRiskFreeRate', nullableNumber($event))"
                  />
                  <t-input-number
                    theme="normal"
                    label="目标收益率（年化）："
                    suffix="%"
                    auto-width
                    align="right"
                    :value="model.risk.targetRatePercent"
                    @update:value="emit('updateTargetRate', nullableNumber($event))"
                  />
                  <t-button size="medium" @click="emit('applyRiskAssumptions')">应用</t-button>
                </div>
                <div>
                  <t-radio-group v-model="selectedRiskPeriod">
                    <t-radio-button
                      v-for="period in model.risk.periods"
                      :key="period.key"
                      :value="period.key"
                    >
                      {{ period.label }}
                    </t-radio-button>
                  </t-radio-group>
                </div>
              </div>
              <p v-if="model.risk.parameterError" class="mb-4 text-sm text-(--td-error-color)">
                {{ model.risk.parameterError }}
              </p>
              <div v-if="selectedRisk?.alert" class="mb-4">
                <t-alert :message="selectedRisk.alert.message" :theme="selectedRisk.alert.tone" />
              </div>
              <t-table
                bordered
                :columns="riskColumns"
                :data="selectedRisk?.rows ?? []"
                empty="暂无风险指标"
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
                <template #difference="{ row }">
                  <span class="font-mono tabular-nums" :class="trendClass(row.difference.trend)">
                    {{ row.difference.text }}
                  </span>
                </template>
              </t-table>
            </div>
            <div v-else-if="tab.value !== 'calendar' && tab.value !== 'risk'">
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
            <template v-else-if="tab.value === 'calendar'">
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
            <section v-if="tab.value === 'risk'" class="mt-2">
              <h3 class="mb-2 text-sm font-medium">风险指标解读</h3>
              <p class="mb-2 text-xs text-(--td-text-color-secondary)">
                差值为基金指标减去沪深300全收益；最大回撤、年化波动率通常越低越稳健，其余比率通常越高越好。
              </p>
              <div class="grid gap-1 md:grid-cols-2 text-xs text-(--td-text-color-secondary)">
                <div v-for="guide in riskMetricGuides" :key="guide.name">
                  <div>{{ guide.name }}：{{ guide.description }}</div>
                </div>
              </div>
            </section>
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

.risk-controls {
  @apply mb-4 flex flex-wrap justify-between gap-3 xl:gap-0;
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
