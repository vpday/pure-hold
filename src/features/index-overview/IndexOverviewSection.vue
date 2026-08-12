<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useAppSettingsStore } from '@/app/settings/stores/useAppSettingsStore'
import { useIndexQuotesStore } from '@/domains/indices/stores/useIndexQuotesStore'
import IndexSettingsEntry from '@/features/index-settings/IndexSettingsEntry.vue'
import { subscribeGlobalRefresh } from '@/shared/services/globalRefreshCoordinator'
import { useBreakpoints } from '@/shared/composables/useBreakpoints'
import IndexQuoteList from './components/IndexQuoteList.vue'
import IndexQuoteTicker from './components/IndexQuoteTicker.vue'
import { toIndexOverviewViewModel } from './presenters/toIndexOverviewViewModel'

const panelValue = 'index-overview'
const store = useIndexQuotesStore()
const appSettingsStore = useAppSettingsStore()
const { definitions, groups, health, lastSuccessfulAt, quotesByIndexId } = storeToRefs(store)
const { preferences } = storeToRefs(appSettingsStore)
const { isSmUp } = useBreakpoints()
const expandedPanels = ref<(number | string)[]>([])
const drawerVisible = ref(false)
const settingsEntry = ref<{ open: () => void }>()
const viewModel = computed(() =>
  toIndexOverviewViewModel({
    definitions: definitions.value,
    groups: groups.value,
    health: health.value,
    lastSuccessfulAt: lastSuccessfulAt.value,
    quotesByIndexId: quotesByIndexId.value,
  }),
)
const tickerItems = computed(() => viewModel.value.groups.flatMap((group) => group.items))
const detailsVisible = computed(
  () => drawerVisible.value || expandedPanels.value.includes(panelValue),
)

watch(isSmUp, (desktop) => {
  if (desktop) {
    drawerVisible.value = false
  } else {
    expandedPanels.value = []
  }
})

let unsubscribeRefresh: (() => void) | undefined
onMounted(() => {
  applyPollingConfiguration()
  store.startPolling()
  unsubscribeRefresh = subscribeGlobalRefresh(store.refresh)
})
onBeforeUnmount(() => {
  store.stopPolling()
  unsubscribeRefresh?.()
})

watch(
  preferences,
  () => {
    applyPollingConfiguration()
  },
  { deep: true },
)

function applyPollingConfiguration(): void {
  store.setPollingConfiguration({
    enabled: preferences.value.index.enabled,
    intervalMs: preferences.value.index.intervalSeconds * 1_000,
  })
}

function handlePanelChange(value: (number | string)[]): void {
  if (!isSmUp.value) {
    expandedPanels.value = []
    drawerVisible.value = true
    return
  }

  expandedPanels.value = value
}

function handleHeaderClick(): void {
  if (!isSmUp.value) {
    drawerVisible.value = true
  }
}

function openIndexSettings(): void {
  settingsEntry.value?.open()
}
</script>

<template>
  <section aria-label="自选指数">
    <t-collapse
      v-model:value="expandedPanels"
      :expand-on-row-click="isSmUp"
      expand-icon-placement="left"
      @change="handlePanelChange"
    >
      <t-collapse-panel :value="panelValue" @click="handleHeaderClick">
        <template #expandIcon>
          <t-icon
            name="chevron-right"
            class="transition-transform duration-200 motion-reduce:transition-none"
            :class="detailsVisible ? 'rotate-90' : ''"
          />
        </template>
        <template #header>
          <IndexQuoteTicker :items="tickerItems" />
        </template>
        <template #headerRightContent>
          <div @click.stop>
            <t-button variant="text" @click="openIndexSettings">
              <template #icon><t-icon name="setting" /></template>
              指数设置
            </t-button>
          </div>
        </template>

        <div class="hidden sm:block">
          <IndexQuoteList
            :groups="viewModel.groups"
            :status-text="viewModel.statusText"
            :status-tone="viewModel.statusTone"
          />
        </div>
      </t-collapse-panel>
    </t-collapse>

    <t-drawer
      v-model:visible="drawerVisible"
      attach="body"
      :close-btn="true"
      :footer="false"
      header="自选指数"
      placement="bottom"
      size="100vh"
    >
      <IndexQuoteList
        :groups="viewModel.groups"
        :status-text="viewModel.statusText"
        :status-tone="viewModel.statusTone"
      />
    </t-drawer>

    <IndexSettingsEntry ref="settingsEntry" />
  </section>
</template>
