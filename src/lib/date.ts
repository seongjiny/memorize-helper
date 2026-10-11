export const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const startOfWeek = (date: Date) => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const parseDateKey = (key: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const date = new Date(`${key}T12:00:00`)
  return Number.isFinite(date.getTime()) && toDateKey(date) === key ? date : null
}

export const getMonthCells = (month: Date) => {
  const year = month.getFullYear()
  const index = month.getMonth()
  const firstWeekday = new Date(year, index, 1).getDay()
  const days = new Date(year, index + 1, 0).getDate()
  const count = Math.ceil((firstWeekday + days) / 7) * 7
  return Array.from({ length: count }, (_, cell) => {
    const day = cell - firstWeekday + 1
    return day > 0 && day <= days ? { key: toDateKey(new Date(year, index, day)), day } : null
  })
}
