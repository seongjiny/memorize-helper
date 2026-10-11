import type { MemorizationRecord } from '@/types/memorizationRecord'
import type { MemorizationScript } from '@/types/script'
import { addDays, parseDateKey, toDateKey } from '@/lib/date'
import { compareVerseReferences, getVerseReference } from '@/lib/verseReference'

export const summarizeActivity = (records: MemorizationRecord[], todayKey: string) => {
  const dates = [...new Set(records.map((record) => record.recordDate))]
    .filter((key) => key <= todayKey && parseDateKey(key))
    .sort()
  let streak = 0
  let longestStreak = 0
  let previous = ''
  for (const key of dates) {
    const date = parseDateKey(key)!
    streak = toDateKey(addDays(date, -1)) === previous ? streak + 1 : 1
    longestStreak = Math.max(longestStreak, streak)
    previous = key
  }
  const today = parseDateKey(todayKey)
  const yesterday = today ? toDateKey(addDays(today, -1)) : ''
  const currentStreak = previous && (previous === todayKey || previous === yesterday) ? streak : 0
  return { dates, totalDays: dates.length, currentStreak, longestStreak }
}

export const getScriptProgress = (script: MemorizationScript, records: MemorizationRecord[]) => {
  const references = script.blocks.flatMap((block) =>
    block.lines
      .map((line) => getVerseReference(script, block.label, line))
      .filter((reference) => reference !== null),
  )
  const verseKey = (verse: (typeof references)[number]) =>
    `${verse.book}:${verse.chapter}:${verse.verse}`
  const verses = new Map(references.map((verse) => [verseKey(verse), verse]))
  const covered = new Set<string>()
  for (const record of records.filter((item) => item.scriptId === script.id)) {
    for (const [key, verse] of verses) {
      const start = { book: verse.book, chapter: record.startChapter, verse: record.startVerse }
      const end = { book: verse.book, chapter: record.endChapter, verse: record.endVerse }
      if (compareVerseReferences(start, verse) <= 0 && compareVerseReferences(end, verse) >= 0) {
        covered.add(key)
      }
    }
  }
  const totalVerses = verses.size
  const coveredVerses = covered.size
  return {
    totalVerses,
    coveredVerses,
    percentage: totalVerses ? Math.round((coveredVerses / totalVerses) * 100) : 0,
    isComplete: totalVerses > 0 && coveredVerses === totalVerses,
  }
}
