import * as echarts from 'echarts/core'
import {
  nextTick,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComponentPublicInstance,
  type MaybeRefOrGetter,
  type WatchSource,
} from 'vue'

interface EChartsRuntimeInstance {
  dispose(): void
  getDom(): HTMLElement
  resize(): void
}

interface EChartsRuntimeObserver {
  disconnect(): void
  observe(element: Element): void
}

interface EChartsRuntimeDependencies<TChart extends EChartsRuntimeInstance> {
  readonly initialize?: (element: HTMLElement) => TChart
  readonly observe?: (callback: () => void) => EChartsRuntimeObserver
  readonly schedule?: (callback: () => void) => void | Promise<void>
}

interface EChartsRuntimeOptions<TChart extends EChartsRuntimeInstance> {
  readonly dependencies?: EChartsRuntimeDependencies<TChart>
  readonly enabled: MaybeRefOrGetter<boolean>
  readonly render: (chart: TChart) => void
  readonly renderDependencies?: readonly WatchSource<unknown>[]
}

export function useEChartsRuntime<TChart extends EChartsRuntimeInstance = echarts.ECharts>(
  options: EChartsRuntimeOptions<TChart>,
) {
  const container = shallowRef<HTMLElement>()
  const initialize =
    options.dependencies?.initialize ??
    ((element: HTMLElement) => echarts.init(element) as unknown as TChart)
  const observe =
    options.dependencies?.observe ??
    ((callback: () => void) => {
      const observer = new ResizeObserver(callback)
      return observer
    })
  const schedule = options.dependencies?.schedule ?? ((callback: () => void) => nextTick(callback))

  let chart: TChart | undefined
  let observer: EChartsRuntimeObserver | undefined
  let observedElement: HTMLElement | undefined
  let synchronization = 0

  function clearResources(): void {
    observer?.disconnect()
    observer = undefined
    observedElement = undefined
    chart?.dispose()
    chart = undefined
  }

  function dispose(): void {
    synchronization += 1
    clearResources()
  }

  function sync(): void {
    const currentSynchronization = ++synchronization
    void schedule(() => {
      if (currentSynchronization !== synchronization) return
      const element = container.value
      if (!element) {
        dispose()
        return
      }
      if ((observer && observedElement !== element) || (chart && chart.getDom() !== element)) {
        clearResources()
      }
      if (!toValue(options.enabled)) return

      if (!observer) {
        const currentObserver = observe(() => {
          if (
            observer !== currentObserver ||
            observedElement !== element ||
            container.value !== element
          ) {
            return
          }
          sync()
        })
        observer = currentObserver
        observedElement = element
        currentObserver.observe(element)
      }

      if (element.clientWidth === 0 || element.clientHeight === 0) return
      chart ??= initialize(element)

      chart.resize()
      options.render(chart)
    })
  }

  function setContainer(element: Element | ComponentPublicInstance | null): void {
    container.value = element instanceof HTMLElement ? element : undefined
  }

  watch([container, () => toValue(options.enabled), ...(options.renderDependencies ?? [])], sync, {
    immediate: true,
  })
  onScopeDispose(dispose)

  return { container, dispose, setContainer, sync }
}
