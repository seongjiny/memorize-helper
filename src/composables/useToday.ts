import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toDateKey } from '@/lib/date'

export function useToday() {
  const today = ref(new Date())
  const todayKey = computed(() => toDateKey(today.value))
  let timer: ReturnType<typeof setTimeout> | undefined

  const refresh = () => {
    clearTimeout(timer)
    const now = new Date()
    today.value = now
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    timer = setTimeout(refresh, midnight.getTime() - now.getTime())
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh()
  }

  onMounted(() => {
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
  })
  onUnmounted(() => {
    clearTimeout(timer)
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', onVisible)
  })

  return { today, todayKey }
}
