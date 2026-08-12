import assert from 'node:assert/strict'
import test from 'node:test'
import { effectScope, ref } from 'vue'

import { useEChartsRuntime } from './useEChartsRuntime.ts'

test('ECharts runtime initializes only a visible non-zero container and reuses it for rendering', () => {
  const harness = createHarness()
  const enabled = ref(false)
  const dependency = ref(0)
  const scope = effectScope()
  const runtime = scope.run(() =>
    useEChartsRuntime({
      dependencies: harness.dependencies,
      enabled,
      render: (chart) => harness.renders.push(chart),
      renderDependencies: [dependency],
    }),
  )!
  const element = createElement(0, 100)

  runtime.container.value = element
  harness.flush()
  assert.equal(harness.charts.length, 0)

  enabled.value = true
  runtime.sync()
  harness.flush()
  assert.equal(harness.charts.length, 0)

  setElementSize(element, 200, 100)
  runtime.sync()
  harness.flush()
  assert.equal(harness.charts.length, 1)
  assert.equal(harness.renders.length, 1)

  dependency.value += 1
  runtime.sync()
  harness.flush()
  assert.equal(harness.charts.length, 1)
  assert.equal(harness.renders.length, 2)
  scope.stop()
})

test('ECharts runtime resizes from the current observer and ignores stale observers', () => {
  const harness = createHarness()
  const scope = effectScope()
  const runtime = scope.run(() =>
    useEChartsRuntime({
      dependencies: harness.dependencies,
      enabled: true,
      render: (chart) => harness.renders.push(chart),
    }),
  )!
  const firstElement = createElement(200, 100)
  const secondElement = createElement(200, 100)

  runtime.container.value = firstElement
  runtime.sync()
  harness.flush()
  const firstChart = harness.charts[0]!
  const firstObserver = harness.observers[0]!

  runtime.container.value = secondElement
  runtime.sync()
  harness.flush()
  const secondChart = harness.charts[1]!
  assert.equal(firstChart.disposed, true)
  assert.equal(firstObserver.disconnected, true)

  const resizeCount = secondChart.resizeCount
  firstObserver.callback()
  assert.equal(secondChart.resizeCount, resizeCount)
  harness.observers[1]!.callback()
  assert.equal(secondChart.resizeCount, resizeCount + 1)
  scope.stop()
  assert.equal(secondChart.disposed, true)
  assert.equal(harness.observers[1]!.disconnected, true)
})

test('ECharts runtime disposes when its container is removed and cancels stale schedules', () => {
  const harness = createHarness()
  const scope = effectScope()
  const runtime = scope.run(() =>
    useEChartsRuntime({
      dependencies: harness.dependencies,
      enabled: true,
      render: (chart) => harness.renders.push(chart),
    }),
  )!

  runtime.container.value = createElement(200, 100)
  runtime.sync()
  runtime.container.value = undefined
  runtime.sync()
  harness.flush()

  assert.equal(harness.charts.length, 0)
  scope.stop()
})

function createHarness() {
  const charts: FakeChart[] = []
  const observers: FakeObserver[] = []
  const renders: FakeChart[] = []
  const scheduled: (() => void)[] = []
  return {
    charts,
    dependencies: {
      initialize(element: HTMLElement): FakeChart {
        const chart = new FakeChart(element)
        charts.push(chart)
        return chart
      },
      observe(callback: () => void): FakeObserver {
        const observer = new FakeObserver(callback)
        observers.push(observer)
        return observer
      },
      schedule(callback: () => void): void {
        scheduled.push(callback)
      },
    },
    flush(): void {
      while (scheduled.length > 0) scheduled.shift()!()
    },
    observers,
    renders,
  }
}

class FakeChart {
  disposed = false
  resizeCount = 0
  private readonly element: HTMLElement
  constructor(element: HTMLElement) {
    this.element = element
  }
  dispose(): void {
    this.disposed = true
  }
  getDom(): HTMLElement {
    return this.element
  }
  resize(): void {
    this.resizeCount += 1
  }
}

class FakeObserver {
  disconnected = false
  observed?: Element
  readonly callback: () => void
  constructor(callback: () => void) {
    this.callback = callback
  }
  disconnect(): void {
    this.disconnected = true
  }
  observe(element: Element): void {
    this.observed = element
  }
}

function createElement(width: number, height: number): HTMLElement {
  return { clientHeight: height, clientWidth: width } as HTMLElement
}

function setElementSize(element: HTMLElement, width: number, height: number): void {
  Object.assign(element, { clientHeight: height, clientWidth: width })
}
