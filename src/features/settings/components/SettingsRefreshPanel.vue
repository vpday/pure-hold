<script setup lang="ts">
import {
  type AppRefreshPreferences,
  fundRefreshInterval,
  indexRefreshInterval,
} from '@/app/settings/models/appRefreshPreferences.ts'

const props = defineProps<{ modelValue: AppRefreshPreferences }>()
const emit = defineEmits<{ 'update:modelValue': [value: AppRefreshPreferences] }>()

const indexMarks = { 10: '10秒', 30: '30秒', 60: '60秒' }
const fundMarks = { 1: '1分钟', 2: '2分钟', 5: '5分钟' }

function updateIndexEnabled(enabled: boolean): void {
  emit('update:modelValue', {
    ...props.modelValue,
    index: { ...props.modelValue.index, enabled },
  })
}

function updateIndexInterval(value: number | number[]): void {
  if (typeof value !== 'number') return
  emit('update:modelValue', {
    ...props.modelValue,
    index: { ...props.modelValue.index, intervalSeconds: value },
  })
}

function updateFundEnabled(enabled: boolean): void {
  emit('update:modelValue', {
    ...props.modelValue,
    funds: { ...props.modelValue.funds, enabled },
  })
}

function updateFundInterval(value: number | number[]): void {
  if (typeof value !== 'number') return
  emit('update:modelValue', {
    ...props.modelValue,
    funds: { ...props.modelValue.funds, intervalMinutes: value },
  })
}
</script>

<template>
  <section aria-labelledby="settings-refresh-heading">
    <h3 id="settings-refresh-heading" class="text-base font-medium">首页自动刷新</h3>
    <p class="mt-1 text-sm text-(--td-text-color-secondary)">
      自动刷新只作用于首页行情；关闭后仍可使用顶部的“刷新全部数据”。
    </p>

    <div class="flex flex-col gap-6 mt-4">
      <div>
        <div class="flex items-center justify-between gap-2 sm:justify-start">
          <span>指数行情</span>
          <t-switch
            size="small"
            :value="modelValue.index.enabled"
            aria-label="启用指数行情自动刷新"
            @change="updateIndexEnabled"
          />
        </div>
        <div class="min-h-10 flex items-center justify-between pl-2">
          <t-slider
            :value="modelValue.index.intervalSeconds"
            :disabled="!modelValue.index.enabled"
            :max="indexRefreshInterval.max"
            :min="indexRefreshInterval.min"
            :marks="indexMarks"
            :step="indexRefreshInterval.step"
            @change="updateIndexInterval"
          />
          <span class="text-right text-sm text-(--td-text-color-secondary) min-w-12">
            {{ modelValue.index.intervalSeconds }} 秒
          </span>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between gap-2 sm:justify-start">
          <span>基金快照</span>
          <t-switch
            size="small"
            :value="modelValue.funds.enabled"
            aria-label="启用基金快照自动刷新"
            @change="updateFundEnabled"
          />
        </div>
        <div class="min-h-10 flex items-center justify-between pl-2">
          <t-slider
            :value="modelValue.funds.intervalMinutes"
            :disabled="!modelValue.funds.enabled"
            :max="fundRefreshInterval.max"
            :min="fundRefreshInterval.min"
            :marks="fundMarks"
            :step="fundRefreshInterval.step"
            @change="updateFundInterval"
          />
          <span class="text-right text-sm text-(--td-text-color-secondary) min-w-12">
            {{ modelValue.funds.intervalMinutes }} 分钟
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
