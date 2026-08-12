import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import {
  cloneAppRefreshPreferences,
  type AppRefreshPreferences,
} from '../models/appRefreshPreferences.ts'
import { loadAppRefreshPreferences } from '../persistence/loadAppRefreshPreferences.ts'
import { saveAppRefreshPreferences } from '../persistence/saveAppRefreshPreferences.ts'
import { validateAndCloneAppRefreshPreferences } from '../persistence/validateAppRefreshPreferences.ts'

export type AppSettingsCommitResult =
  | { readonly ok: true; readonly preferences: AppRefreshPreferences }
  | { readonly ok: false; readonly reason: 'invalid-preferences' | 'persistence-failed' }

export const useAppSettingsStore = defineStore('app-settings', () => {
  const preferences = shallowRef(loadAppRefreshPreferences())

  function getSnapshot(): AppRefreshPreferences {
    return cloneAppRefreshPreferences(preferences.value)
  }

  function commit(candidate: AppRefreshPreferences): AppSettingsCommitResult {
    let validated: AppRefreshPreferences
    try {
      validated = validateAndCloneAppRefreshPreferences(candidate)
    } catch {
      return { ok: false, reason: 'invalid-preferences' }
    }

    try {
      saveAppRefreshPreferences(validated)
    } catch {
      return { ok: false, reason: 'persistence-failed' }
    }

    preferences.value = validated
    return { ok: true, preferences: getSnapshot() }
  }

  return { commit, getSnapshot, preferences }
})
