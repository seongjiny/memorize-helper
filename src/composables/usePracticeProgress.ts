import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthSession } from '@/composables/useAuthSession'
import { useMemorizationRecords } from '@/composables/useMemorizationRecords'
import { useToday } from '@/composables/useToday'
import { listScripts } from '@/data/database'
import { parseDateKey } from '@/lib/date'
import { getScriptProgress, summarizeActivity } from '@/lib/practiceProgress'
import type { MemorizationScript } from '@/types/script'

export function usePracticeProgress() {
  const { user, isReady, initialize } = useAuthSession()
  const { records, load, isLoading, errorMessage } = useMemorizationRecords()
  const { today, todayKey } = useToday()
  const scripts = listScripts()
  const scriptDetails = ref<Record<string, MemorizationScript>>({})
  const isLoadingScripts = ref(true)
  const hasScriptError = ref(false)
  let scriptRequest = 0

  void initialize()
  watch(
    () => user.value?.id,
    (id) => {
      if (id) void load(id)
    },
    { immediate: true },
  )

  const reloadRecords = () => {
    if (user.value) void load(user.value.id)
  }
  const loadScriptDetails = async () => {
    const request = ++scriptRequest
    isLoadingScripts.value = true
    const results = await Promise.allSettled(
      scripts.map(async (item) => {
        const response = await fetch(item.source)
        if (!response.ok) throw new Error('본문을 불러오지 못했습니다.')
        return [item.id, (await response.json()) as MemorizationScript] as const
      }),
    )
    if (request !== scriptRequest) return
    hasScriptError.value = results.some((result) => result.status === 'rejected')
    scriptDetails.value = Object.fromEntries(
      results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    )
    isLoadingScripts.value = false
  }
  onMounted(loadScriptDetails)
  onUnmounted(() => {
    scriptRequest += 1
  })

  const recordsReady = computed(() =>
    Boolean(isReady.value && user.value && !isLoading.value && !errorMessage.value),
  )
  const ownRecords = computed(() =>
    recordsReady.value
      ? records.value.filter(
          (record) =>
            record.userId === user.value?.id &&
            record.recordDate <= todayKey.value &&
            parseDateKey(record.recordDate),
        )
      : [],
  )
  const activity = computed(() => summarizeActivity(ownRecords.value, todayKey.value))
  const progressByScript = computed(() => {
    if (!recordsReady.value) return {}
    return Object.fromEntries(
      Object.entries(scriptDetails.value).map(([id, detail]) => [
        id,
        getScriptProgress(detail, ownRecords.value),
      ]),
    )
  })

  return {
    user,
    isReady,
    isLoading,
    errorMessage,
    scripts,
    ownRecords,
    activity,
    today,
    todayKey,
    progressByScript,
    isLoadingScripts,
    hasScriptError,
    reloadRecords,
    loadScriptDetails,
  }
}
