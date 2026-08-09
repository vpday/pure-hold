import type {
  FundPerformancePanelId,
  FundPerformancePanelRendererKey,
} from '../models/fundPerformancePanel'

type FundPerformancePanelDescriptorBase = {
  readonly id: FundPerformancePanelId
  readonly label: string
  readonly defaultView: boolean
  readonly adapterKey: FundPerformancePanelId
  readonly rendererKey: FundPerformancePanelRendererKey
}

type FundPerformanceChartDescriptor = FundPerformancePanelDescriptorBase & {
  readonly kind: 'chart'
  readonly rangeKey: 'history' | 'drawdown' | 'rolling-excess'
  readonly activation: 'basic-info' | 'tab'
  readonly capabilities: {
    readonly range: true
    readonly referenceIndex: boolean
    readonly retry: true
    readonly refresh: true
  }
}

type FundPerformanceDistributionDescriptor = FundPerformancePanelDescriptorBase & {
  readonly id: 'distribution'
  readonly kind: 'distribution'
  readonly activation: 'intersection'
  readonly capabilities: {
    readonly range: false
    readonly referenceIndex: false
    readonly retry: true
    readonly refresh: true
  }
}

export type FundPerformancePanelDescriptor =
  | FundPerformanceChartDescriptor
  | FundPerformanceDistributionDescriptor

export const fundPerformancePanelRegistry = [
  {
    adapterKey: 'cumulative-returns',
    activation: 'basic-info',
    capabilities: { range: true, referenceIndex: true, refresh: true, retry: true },
    defaultView: true,
    id: 'cumulative-returns',
    kind: 'chart',
    label: '累计收益',
    rangeKey: 'history',
    rendererKey: 'cumulative-returns',
  },
  {
    adapterKey: 'cumulative-excess-return',
    activation: 'tab',
    capabilities: { range: true, referenceIndex: false, refresh: true, retry: true },
    defaultView: false,
    id: 'cumulative-excess-return',
    kind: 'chart',
    label: '累计超额',
    rangeKey: 'history',
    rendererKey: 'cumulative-excess-return',
  },
  {
    adapterKey: 'rolling-excess-return',
    activation: 'tab',
    capabilities: { range: true, referenceIndex: false, refresh: true, retry: true },
    defaultView: false,
    id: 'rolling-excess-return',
    kind: 'chart',
    label: '滚动超额',
    rangeKey: 'rolling-excess',
    rendererKey: 'rolling-excess-return',
  },
  {
    adapterKey: 'drawdown-comparison',
    activation: 'tab',
    capabilities: { range: true, referenceIndex: false, refresh: true, retry: true },
    defaultView: false,
    id: 'drawdown-comparison',
    kind: 'chart',
    label: '回撤对比',
    rangeKey: 'drawdown',
    rendererKey: 'drawdown-comparison',
  },
  {
    adapterKey: 'net-value',
    activation: 'tab',
    capabilities: { range: true, referenceIndex: false, refresh: true, retry: true },
    defaultView: false,
    id: 'net-value',
    kind: 'chart',
    label: '净值走势',
    rangeKey: 'history',
    rendererKey: 'net-value',
  },
  {
    adapterKey: 'reinvested-net-value',
    activation: 'tab',
    capabilities: { range: true, referenceIndex: false, refresh: true, retry: true },
    defaultView: false,
    id: 'reinvested-net-value',
    kind: 'chart',
    label: '复权净值',
    rangeKey: 'history',
    rendererKey: 'net-value',
  },
  {
    adapterKey: 'distribution',
    activation: 'intersection',
    capabilities: { range: false, referenceIndex: false, refresh: true, retry: true },
    defaultView: false,
    id: 'distribution',
    kind: 'distribution',
    label: '分红送配',
    rendererKey: 'distribution',
  },
] as const satisfies readonly FundPerformancePanelDescriptor[]
