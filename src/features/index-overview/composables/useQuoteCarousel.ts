import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

const carouselInterval = 3_000

export function useQuoteCarousel<Item>(
  items: MaybeRefOrGetter<readonly Item[]>,
  capacity: MaybeRefOrGetter<number>,
) {
  const currentPage = ref(0)
  const paused = ref(false)
  const transitionEnabled = ref(true)
  let firstRestoreFrame: number | undefined
  let loopResetTimer: ReturnType<typeof setTimeout> | undefined
  let restoreGeneration = 0
  let secondRestoreFrame: number | undefined
  let timer: ReturnType<typeof setInterval> | undefined

  const pages = computed(() => {
    const pageSize = Math.max(1, toValue(capacity))
    const values = toValue(items)
    const result: Item[][] = []

    for (let index = 0; index < values.length; index += pageSize) {
      result.push(values.slice(index, index + pageSize))
    }

    return result
  })
  const renderedPages = computed(() => {
    if (pages.value.length <= 1) {
      return pages.value
    }
    return [...pages.value, pages.value[0] ?? []]
  })
  const transform = computed(() => {
    const pageCount = Math.max(1, renderedPages.value.length)
    return `translateY(-${(currentPage.value * 100) / pageCount}%)`
  })

  watch([() => toValue(items).length, () => toValue(capacity)], resetCarousel)
  watch(paused, updateTimer)

  onMounted(() => {
    document.addEventListener('visibilitychange', updateTimer)
    updateTimer()
  })

  onBeforeUnmount(() => {
    clearTimer()
    cancelTransitionRestore()
    document.removeEventListener('visibilitychange', updateTimer)
  })

  function pause(): void {
    paused.value = true
  }

  function resume(): void {
    paused.value = false
  }

  function handleTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'transform') {
      return
    }

    resetLoop()
  }

  function resetLoop(): void {
    if (currentPage.value !== pages.value.length) {
      return
    }

    clearLoopResetTimer()
    resetPosition()
  }

  function resetCarousel(): void {
    resetPosition()
    updateTimer()
  }

  function resetPosition(): void {
    cancelTransitionRestore()
    transitionEnabled.value = false
    currentPage.value = 0
    const generation = restoreGeneration

    void nextTick(() => {
      if (generation !== restoreGeneration) {
        return
      }

      firstRestoreFrame = requestAnimationFrame(() => {
        firstRestoreFrame = undefined
        secondRestoreFrame = requestAnimationFrame(() => {
          secondRestoreFrame = undefined
          if (generation === restoreGeneration) {
            transitionEnabled.value = true
          }
        })
      })
    })
  }

  function cancelTransitionRestore(): void {
    restoreGeneration += 1
    if (firstRestoreFrame !== undefined) {
      cancelAnimationFrame(firstRestoreFrame)
      firstRestoreFrame = undefined
    }
    if (secondRestoreFrame !== undefined) {
      cancelAnimationFrame(secondRestoreFrame)
      secondRestoreFrame = undefined
    }
  }

  function updateTimer(): void {
    clearTimer()

    if (pages.value.length <= 1 || paused.value || document.hidden) {
      return
    }

    timer = setInterval(() => {
      currentPage.value += 1
      if (currentPage.value === pages.value.length) {
        loopResetTimer = setTimeout(resetLoop, 350)
      }
    }, carouselInterval)
  }

  function clearTimer(): void {
    if (timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
    clearLoopResetTimer()
  }

  function clearLoopResetTimer(): void {
    if (loopResetTimer !== undefined) {
      clearTimeout(loopResetTimer)
      loopResetTimer = undefined
    }
  }

  return {
    handleTransitionEnd,
    pause,
    renderedPages,
    resume,
    transform,
    transitionEnabled,
  }
}
