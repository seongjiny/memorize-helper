import type { MemorizationScript } from '@/types/script'
import type { VerseReference } from '@/types/memorizationRecord'

const getBook = (label: string, script: MemorizationScript) => {
  if (/Matthew/i.test(label)) return 'Matthew'
  if (/마\s*\d/.test(label)) return '마태복음'
  if (/롬\s*\d/.test(label)) return '로마서'

  const metaBook = script.meta?.[0]?.match(/^([가-힣A-Za-z]+)/)?.[1]
  return metaBook || script.title.replace(/\s+\d+장$/, '')
}

const getChapter = (label: string, script: MemorizationScript) => {
  const labelChapter = label.match(/(?:Matthew|마|롬)\s*(\d+)\s*:/i)?.[1]
  const fallbackChapter = script.meta?.[0]?.match(/(\d+)\s*(?:장|–|-)/)?.[1]
  const chapter = Number(labelChapter || fallbackChapter)
  return Number.isInteger(chapter) && chapter > 0 ? chapter : null
}

export const getVerseReference = (
  script: MemorizationScript,
  blockLabel: string | undefined,
  line: string,
): VerseReference | null => {
  const label = blockLabel || ''
  const chapter = getChapter(label, script)
  const verse = Number(line.match(/^\s*(\d+)\./)?.[1])

  if (!chapter || !Number.isInteger(verse) || verse < 1) return null

  return {
    book: getBook(label, script),
    chapter,
    verse,
  }
}

export const compareVerseReferences = (a: VerseReference, b: VerseReference) =>
  a.chapter - b.chapter || a.verse - b.verse
