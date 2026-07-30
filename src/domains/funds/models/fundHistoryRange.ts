export const fundHistoryRanges = ['y', '3y', '6y', 'n', '3n', '5n', 'jn', 'ln'] as const

export type FundHistoryRange = (typeof fundHistoryRanges)[number]
