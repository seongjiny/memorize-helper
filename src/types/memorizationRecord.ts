export interface MemorizationRecord {
  id?: number
  userId: string
  recordDate: string
  scriptId: string
  book: string
  startChapter: number
  startVerse: number
  endChapter: number
  endVerse: number
  updatedAt: string
}

export interface VerseReference {
  book: string
  chapter: number
  verse: number
}
