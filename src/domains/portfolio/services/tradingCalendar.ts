import tradingHolidayConfig from '../config/tradingHolidays.json'

const holidayDates = new Set(Object.keys(tradingHolidayConfig.holidays))

export function isTradingDay(value: string): boolean {
  if (!isValidDate(value)) return false
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay()
  return day !== 0 && day !== 6 && !holidayDates.has(value)
}

export function isTradingHoliday(value: string): boolean {
  return isValidDate(value) && holidayDates.has(value)
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
