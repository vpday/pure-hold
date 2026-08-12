import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const chartFiles = [
  'FundCumulativeReturnsChart.vue',
  'FundCumulativeExcessReturnChart.vue',
  'FundRollingExcessReturnChart.vue',
  'FundDrawdownComparisonChart.vue',
  'FundNetValueChart.vue',
  'FundAssetAllocationChart.vue',
  'FundMetricsSection.vue',
] as const

test('every fund-detail ECharts caller delegates DOM lifecycle to the feature runtime', async () => {
  for (const file of chartFiles) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8')
    assert.match(source, /useEChartsRuntime\(/, file)
    assert.doesNotMatch(source, /new ResizeObserver\(/, file)
    assert.doesNotMatch(source, /echarts\.init\(/, file)
  }
})
