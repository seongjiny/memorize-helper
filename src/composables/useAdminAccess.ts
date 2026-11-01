import { ref, watch } from 'vue'
import { useAuthSession } from '@/composables/useAuthSession'
import { AdminError, requestAdmin } from '@/lib/admin'

type Access = 'checking' | 'anonymous' | 'allowed' | 'denied' | 'error'
const status = ref<Access>('checking')
let generation = 0
let started = false

export function useAdminAccess() {
  const { user, isReady, initialize } = useAuthSession()
  const refresh = async () => {
    const current = ++generation
    const userId = user.value?.id
    status.value = !isReady.value ? 'checking' : userId ? 'checking' : 'anonymous'
    if (!isReady.value || !userId) return
    try {
      const result = await requestAdmin<{ isAdmin: boolean }>({ action: 'check' })
      if (current === generation && user.value?.id === userId)
        status.value = result.isAdmin ? 'allowed' : 'denied'
    } catch (error) {
      if (current === generation && user.value?.id === userId)
        status.value =
          error instanceof AdminError && [401, 403].includes(error.status) ? 'denied' : 'error'
    }
  }
  if (!started) {
    started = true
    watch(
      [isReady, () => user.value?.id],
      () => {
        void refresh()
      },
      { immediate: true, flush: 'sync' },
    )
    void initialize()
  }
  const deny = () => {
    ++generation
    status.value = 'denied'
  }
  return { status, refresh, deny }
}
