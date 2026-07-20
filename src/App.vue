<script setup lang="ts">
import zhCNConfig from 'tdesign-vue-next/es/locale/zh_CN'

import PwaUpdateNotification from '@/app/components/PwaUpdateNotification.vue'
import IndexOverviewSection from '@/features/index-overview/IndexOverviewSection.vue'
</script>

<template>
  <t-config-provider :global-config="zhCNConfig">
    <PwaUpdateNotification />
    <t-layout class="min-h-screen flex flex-col">
      <t-header>
        <div class="mx-auto w-full max-w-7xl">
          <t-head-menu theme="light" height="120px">
            <template #logo>
              <div class="text-xl">简持</div>
            </template>
            <template #operations>
              <a href="javascript:;"><t-icon class="t-menu__operations-icon" name="search" /></a>
              <a href="javascript:;"><t-icon class="t-menu__operations-icon" name="setting" /></a>
            </template>
          </t-head-menu>
        </div>
      </t-header>
      <t-content class="flex-1">
        <div class="mx-auto w-full max-w-7xl px-4 py-6">
          <IndexOverviewSection />
        </div>
      </t-content>
      <t-footer>
        <div class="mx-auto flex w-full max-w-7xl items-center justify-center">
          <div>仅供个人学习及参考使用，使用前请核实，风险自负。</div>
        </div>
      </t-footer>
    </t-layout>
  </t-config-provider>
</template>
