import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthSession } from '@/composables/useAuthSession'
import { trackedPage, trackPageView } from '@/lib/visitTracking'

export function useVisitTracking() {
  const route = useRoute()
  const router = useRouter()
  const routeReady = ref(false)
  void router.isReady().then(() => {
    routeReady.value = true
  })
  const { isReady, user, initialize } = useAuthSession()
  const page = computed(() => trackedPage(route.path, route.query.mode))
  const viewKey = computed(() => (page.value ? `${route.path}:${page.value}` : null))
  watch(
    [routeReady, isReady, viewKey],
    ([ready, authReady, current]) => {
      if (ready && authReady && current) void trackPageView(page.value)
    },
    { immediate: true },
  )
  // Identifying a logged-in administrator excludes their earlier anonymous visit too.
  watch(
    () => user.value?.id,
    (id) => {
      if (id) void trackPageView(null)
    },
  )
  void initialize()
}
