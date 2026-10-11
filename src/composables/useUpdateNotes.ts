import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { isCompatibleUpdate, parseUpdateNote } from '@/lib/updateNote'
import type { UpdateNote } from '@/types/updateNote'

const notes = ref<UpdateNote[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
let loaded = false
let pending: Promise<void> | null = null

const load = (force = false) => {
  if (pending) return pending
  if (loaded && !force) return Promise.resolve()
  isLoading.value = true
  errorMessage.value = ''
  pending = Promise.resolve().then(async () => {
    try {
      if (!supabase) throw new Error('업데이트 노트 연결이 설정되지 않았습니다.')
      const { data, error } = await supabase
        .from('update_notes')
        .select('id, app_version, title, introduction, published_at, items')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .order('id', { ascending: false })
      if (error) throw error
      notes.value = (data || [])
        .map(parseUpdateNote)
        .filter((note) => isCompatibleUpdate(note.appVersion, __APP_VERSION__))
      loaded = true
    } catch {
      notes.value = []
      errorMessage.value = '업데이트 노트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
    } finally {
      isLoading.value = false
      pending = null
    }
  })
  return pending
}

export function useUpdateNotes() {
  const latestNote = computed(() => notes.value[0] || null)
  return { notes, latestNote, isLoading, errorMessage, load, reload: () => load(true) }
}
