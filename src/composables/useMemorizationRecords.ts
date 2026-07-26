import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { MemorizationRecord } from '@/types/memorizationRecord'

interface MemorizationRecordRow {
  id: number
  user_id: string
  record_date: string
  script_id: string
  book: string
  start_chapter: number
  start_verse: number
  end_chapter: number
  end_verse: number
  updated_at: string
}

const records = ref<MemorizationRecord[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

const fromRow = (row: MemorizationRecordRow): MemorizationRecord => ({
  id: row.id,
  userId: row.user_id,
  recordDate: row.record_date,
  scriptId: row.script_id,
  book: row.book,
  startChapter: row.start_chapter,
  startVerse: row.start_verse,
  endChapter: row.end_chapter,
  endVerse: row.end_verse,
  updatedAt: row.updated_at,
})

const toRow = (record: MemorizationRecord): Omit<MemorizationRecordRow, 'id'> => ({
  user_id: record.userId,
  record_date: record.recordDate,
  script_id: record.scriptId,
  book: record.book,
  start_chapter: record.startChapter,
  start_verse: record.startVerse,
  end_chapter: record.endChapter,
  end_verse: record.endVerse,
  updated_at: record.updatedAt,
})

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase 환경 설정을 확인해 주세요.')
  }

  return supabase
}

const load = async (userId: string) => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const client = requireSupabase()
    const { data, error } = await client
      .from('memorization_records')
      .select(
        'id, user_id, record_date, script_id, book, start_chapter, start_verse, end_chapter, end_verse, updated_at',
      )
      .eq('user_id', userId)
      .order('record_date', { ascending: false })

    if (error) throw error
    records.value = (data as MemorizationRecordRow[]).map(fromRow)
  } catch (error) {
    records.value = []
    errorMessage.value = error instanceof Error ? error.message : '암송 기록을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

const findByDate = async (userId: string, recordDate: string) => {
  const client = requireSupabase()
  const { data, error } = await client
    .from('memorization_records')
    .select(
      'id, user_id, record_date, script_id, book, start_chapter, start_verse, end_chapter, end_verse, updated_at',
    )
    .eq('user_id', userId)
    .eq('record_date', recordDate)
    .maybeSingle()

  if (error) throw error
  return data ? fromRow(data as MemorizationRecordRow) : undefined
}

const save = async (record: MemorizationRecord) => {
  const client = requireSupabase()
  const { data, error } = await client
    .from('memorization_records')
    .upsert(toRow(record), { onConflict: 'user_id,record_date' })
    .select(
      'id, user_id, record_date, script_id, book, start_chapter, start_verse, end_chapter, end_verse, updated_at',
    )
    .single()

  if (error) throw error

  const savedRecord = fromRow(data as MemorizationRecordRow)
  const nextRecords = records.value.filter((item) => item.recordDate !== savedRecord.recordDate)
  records.value = [...nextRecords, savedRecord].sort((a, b) =>
    b.recordDate.localeCompare(a.recordDate),
  )
}

const update = async (record: MemorizationRecord) => {
  if (!record.id) throw new Error('수정할 암송 기록을 찾지 못했습니다.')

  const client = requireSupabase()
  const { data, error } = await client
    .from('memorization_records')
    .update(toRow(record))
    .eq('id', record.id)
    .eq('user_id', record.userId)
    .select(
      'id, user_id, record_date, script_id, book, start_chapter, start_verse, end_chapter, end_verse, updated_at',
    )
    .single()

  if (error) throw error

  const updatedRecord = fromRow(data as MemorizationRecordRow)
  records.value = records.value
    .map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
}

const remove = async (record: MemorizationRecord) => {
  if (!record.id) throw new Error('삭제할 암송 기록을 찾지 못했습니다.')

  const client = requireSupabase()
  const { error } = await client
    .from('memorization_records')
    .delete()
    .eq('id', record.id)
    .eq('user_id', record.userId)

  if (error) throw error
  records.value = records.value.filter((item) => item.id !== record.id)
}

export function useMemorizationRecords() {
  return { records, isLoading, errorMessage, load, findByDate, save, update, remove }
}
