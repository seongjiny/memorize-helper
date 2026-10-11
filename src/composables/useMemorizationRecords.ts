import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthSession } from '@/composables/useAuthSession'
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
const { user } = useAuthSession()
let loadRequest = 0
let sessionVersion = 0

watch(
  () => user.value?.id,
  () => {
    sessionVersion += 1
    loadRequest += 1
    records.value = []
    isLoading.value = false
    errorMessage.value = ''
  },
  { flush: 'sync' },
)

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
  if (user.value?.id !== userId) return
  const request = ++loadRequest
  const isCurrent = () => request === loadRequest && user.value?.id === userId
  isLoading.value = true
  errorMessage.value = ''

  try {
    const client = requireSupabase()
    const rows: MemorizationRecordRow[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from('memorization_records')
        .select(
          'id, user_id, record_date, script_id, book, start_chapter, start_verse, end_chapter, end_verse, updated_at',
        )
        .eq('user_id', userId)
        .order('record_date', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (!isCurrent()) return
      if (error) throw error
      rows.push(...(data as MemorizationRecordRow[]))
      if (data.length < pageSize) break
    }
    records.value = rows.map(fromRow)
  } catch (error) {
    if (!isCurrent()) return
    records.value = []
    errorMessage.value = error instanceof Error ? error.message : '암송 기록을 불러오지 못했습니다.'
  } finally {
    if (isCurrent()) isLoading.value = false
  }
}

const applyChange = (userId: string, version: number, change: () => void) => {
  if (version !== sessionVersion || user.value?.id !== userId) return
  const shouldReload = isLoading.value
  loadRequest += 1
  isLoading.value = false
  errorMessage.value = ''
  change()
  if (shouldReload) void load(userId)
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
  const version = sessionVersion
  const client = requireSupabase()
  const { data, error } = await client
    .from('memorization_records')
    .insert(toRow(record))
    .select(
      'id, user_id, record_date, script_id, book, start_chapter, start_verse, end_chapter, end_verse, updated_at',
    )
    .single()

  if (error?.code === '23505') throw new Error('선택한 날짜에 이미 다른 암송 기록이 있습니다.')
  if (error) throw error
  applyChange(record.userId, version, () => {
    const savedRecord = fromRow(data as MemorizationRecordRow)
    const nextRecords = records.value.filter((item) => item.recordDate !== savedRecord.recordDate)
    records.value = [...nextRecords, savedRecord].sort((a, b) =>
      b.recordDate.localeCompare(a.recordDate),
    )
  })
}

const update = async (record: MemorizationRecord) => {
  const version = sessionVersion
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

  if (error?.code === '23505') throw new Error('선택한 날짜에 이미 다른 암송 기록이 있습니다.')
  if (error) throw error
  applyChange(record.userId, version, () => {
    const updatedRecord = fromRow(data as MemorizationRecordRow)
    records.value = records.value
      .filter((item) => item.id !== updatedRecord.id)
      .concat(updatedRecord)
      .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
  })
}

const remove = async (record: MemorizationRecord) => {
  const version = sessionVersion
  if (!record.id) throw new Error('삭제할 암송 기록을 찾지 못했습니다.')

  const client = requireSupabase()
  const { error } = await client
    .from('memorization_records')
    .delete()
    .eq('id', record.id)
    .eq('user_id', record.userId)

  if (error) throw error
  applyChange(record.userId, version, () => {
    records.value = records.value.filter((item) => item.id !== record.id)
  })
}

export function useMemorizationRecords() {
  return { records, isLoading, errorMessage, load, findByDate, save, update, remove }
}
