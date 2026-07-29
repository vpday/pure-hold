export interface FundBasicInfo {
  readonly code: string
  readonly companyName: string | null
  readonly establishedDate: string | null
  readonly fundType: string | null
  readonly morningstarRating: number | null
  readonly netAssetsYuan: number | null
  readonly netAssetsDate: string | null
  readonly riskLevel: number | null
  readonly shanghaiRating: number | null
  readonly trackingError: number | null
  readonly trackingIndexName: string | null
}
