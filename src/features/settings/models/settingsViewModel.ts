import type { AppRefreshPreferences } from '@/app/settings/models/appRefreshPreferences.ts'
import type {
  ConfigurationTransferPackage,
  ConfigurationTransferSectionError,
  ConfigurationTransferWarning,
} from '@/app/settings/transfer/configurationTransfer.ts'
import type { ConfigurationTransferSelection } from '@/app/settings/transfer/configurationTransferCoordinator.ts'

export interface SettingsImportState {
  readonly package: ConfigurationTransferPackage
  readonly warnings: readonly ConfigurationTransferWarning[]
  readonly sectionErrors: readonly ConfigurationTransferSectionError[]
}

export type SettingsDraft = AppRefreshPreferences
export type SettingsImportSelection = ConfigurationTransferSelection
