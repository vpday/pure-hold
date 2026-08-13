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

test('fund-detail charts render from local view state instead of scroll navigation state', async () => {
  const performanceSection = await readFile(
    new URL('FundPerformanceSection.vue', import.meta.url),
    'utf8',
  )
  const holdingsSection = await readFile(
    new URL('FundHoldingsSection.vue', import.meta.url),
    'utf8',
  )
  const performanceModel = await readFile(
    new URL('../models/fundPerformanceSectionModel.ts', import.meta.url),
    'utf8',
  )
  const holdingsModel = await readFile(
    new URL('../models/fundHoldingsSectionModel.ts', import.meta.url),
    'utf8',
  )

  assert.match(performanceSection, /:visible="activeTab === panelDescriptor\.id"/)
  assert.doesNotMatch(performanceSection, /model\.isVisible/)
  assert.doesNotMatch(performanceModel, /readonly isVisible:/)
  assert.match(holdingsSection, /:visible="model\.activeView === 'allocation'"/)
  assert.doesNotMatch(holdingsSection, /model\.allocation\.visible/)
  assert.doesNotMatch(holdingsModel, /readonly visible:/)
})
