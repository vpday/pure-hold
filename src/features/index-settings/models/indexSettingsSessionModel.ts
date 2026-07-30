import type { DraftGroup } from './settingsTypes'

export type IndexSettingsMobileView = 'detail' | 'groups'

export interface IndexSettingsShellModel {
  readonly isDirty: boolean
  readonly mobileView: IndexSettingsMobileView
  readonly selectedGroupName: string
}

export interface IndexSettingsSessionModel {
  readonly groups: readonly DraftGroup[]
  readonly selectedGroup: DraftGroup | null
  readonly selectedGroupId: string | null
  readonly shell: IndexSettingsShellModel
}
