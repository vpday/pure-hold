import { computed, onMounted, readonly, ref } from 'vue'

export type Breakpoint = 'base' | 'lg' | 'md' | 'sm'

const isSmUp = ref(false)
const isMdUp = ref(false)
const isLgUp = ref(false)
let initialized = false

export function useBreakpoints() {
  onMounted(initializeBreakpoints)

  const currentBreakpoint = computed<Breakpoint>(() => {
    if (isLgUp.value) {
      return 'lg'
    }
    if (isMdUp.value) {
      return 'md'
    }
    if (isSmUp.value) {
      return 'sm'
    }
    return 'base'
  })

  return {
    currentBreakpoint,
    isLgUp: readonly(isLgUp),
    isMdUp: readonly(isMdUp),
    isSmUp: readonly(isSmUp),
  }
}

function initializeBreakpoints(): void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const rootStyles = getComputedStyle(document.documentElement)
  const breakpointValues = {
    lg: rootStyles.getPropertyValue('--breakpoint-lg').trim(),
    md: rootStyles.getPropertyValue('--breakpoint-md').trim(),
    sm: rootStyles.getPropertyValue('--breakpoint-sm').trim(),
  }

  if (!breakpointValues.sm || !breakpointValues.md || !breakpointValues.lg) {
    if (import.meta.env.DEV) {
      throw new Error('Tailwind breakpoint CSS variables are unavailable')
    }
    return
  }

  initialized = true
  bindMediaQuery(breakpointValues.sm, isSmUp)
  bindMediaQuery(breakpointValues.md, isMdUp)
  bindMediaQuery(breakpointValues.lg, isLgUp)
}

function bindMediaQuery(value: string, target: { value: boolean }): void {
  const mediaQuery = window.matchMedia(`(min-width: ${value})`)
  const update = () => {
    target.value = mediaQuery.matches
  }

  update()
  mediaQuery.addEventListener('change', update)
}
