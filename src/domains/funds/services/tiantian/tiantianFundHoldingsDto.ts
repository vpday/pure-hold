export interface TiantianFundStockHoldingDto {
  readonly GPDM?: unknown
  readonly GPJC?: unknown
  readonly HOLDCOUNT?: unknown
  readonly INDEXNAME?: unknown
  readonly ISINVISBL?: unknown
  readonly JZBL?: unknown
  readonly NEWTEXCH?: unknown
  readonly PCTNVCHG?: unknown
  readonly PCTNVCHGTYPE?: unknown
}

export interface TiantianFundBondHoldingDto {
  readonly NEWTEXCH?: unknown
  readonly ZJZBL?: unknown
  readonly ZQDM?: unknown
  readonly ZQMC?: unknown
}

export interface TiantianFundHoldingsDto {
  readonly fundStocks?: unknown
  readonly fundboods?: unknown
}
