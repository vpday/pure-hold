import tradingHolidayConfig from '../config/tradingHolidays.json'

const holidayDates = new Set(Object.keys(tradingHolidayConfig.holidays))
const CUTOFF_MINUTES = 15 * 60

export interface TransactionSchedule {
  readonly navDate: string
  readonly expectedConfirmationDate?: string
}

export function isTradingDay(value: string): boolean {
  if (!isValidDate(value)) return false
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay()
  return day !== 0 && day !== 6 && !holidayDates.has(value)
}

export function isTradingHoliday(value: string): boolean {
  return isValidDate(value) && holidayDates.has(value)
}

export function deriveTransactionSchedule(input: {
  readonly submittedAt: string
  readonly confirmationDays: number | null
}): TransactionSchedule {
  const parts = parseShanghaiMinute(input.submittedAt)
  if (parts === null) throw new TypeError('Transaction submission time is invalid')
  if (
    input.confirmationDays !== null &&
    (!Number.isInteger(input.confirmationDays) || input.confirmationDays < 0)
  ) {
    throw new TypeError('Confirmation days must be a non-negative integer or null')
  }

  let navDate = parts.date
  if (!isTradingDay(navDate) || parts.minutes >= CUTOFF_MINUTES) {
    navDate = getNextTradingDay(navDate)
  }

  return {
    navDate,
    ...(input.confirmationDays === null
      ? {}
      : { expectedConfirmationDate: addTradingDays(navDate, input.confirmationDays) }),
  }
}

export function getNextTradingDay(value: string): string {
  if (!isValidDate(value)) throw new TypeError('Trading date is invalid')
  let candidate = addDays(value, 1)
  while (!isTradingDay(candidate)) candidate = addDays(candidate, 1)
  return candidate
}

export function addTradingDays(value: string, days: number): string {
  if (!isTradingDay(value)) throw new TypeError('Trading date is invalid')
  if (!Number.isInteger(days) || days < 0) {
    throw new TypeError('Trading day offset must be a non-negative integer')
  }
  let candidate = value
  for (let remaining = days; remaining > 0; remaining -= 1) {
    candidate = getNextTradingDay(candidate)
  }
  return candidate
}

export function isValidShanghaiMinute(value: string): boolean {
  return parseShanghaiMinute(value) !== null
}

export function isShanghaiMinuteAtOrBefore(left: string, right: string): boolean {
  const leftParts = parseShanghaiMinute(left)
  const rightParts = parseShanghaiMinute(right)
  return (
    leftParts !== null &&
    rightParts !== null &&
    toComparableMinutes(leftParts) <= toComparableMinutes(rightParts)
  )
}

export function getShanghaiMinute(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`
}

export function getShanghaiDate(now = new Date()): string {
  return getShanghaiMinute(now).slice(0, 10)
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

interface ShanghaiMinuteParts {
  readonly date: string
  readonly hour: number
  readonly minutes: number
}

function parseShanghaiMinute(value: string): ShanghaiMinuteParts | null {
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/.exec(value)
  if (match === null || !isValidDate(match[1])) return null
  const hour = Number(match[2])
  const minutes = Number(match[3])
  if (hour > 23 || minutes > 59) return null
  return { date: match[1], hour, minutes: hour * 60 + minutes }
}

function toComparableMinutes(parts: ShanghaiMinuteParts): number {
  const date = new Date(`${parts.date}T00:00:00.000Z`)
  return date.getTime() / 60_000 + parts.minutes
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
