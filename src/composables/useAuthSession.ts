import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const user = ref<User | null>(null)
const isReady = ref(false)
let initialization: Promise<void> | null = null

const initialize = () => {
  if (initialization) return initialization

  initialization = (async () => {
    if (!supabase) {
      isReady.value = true
      return
    }

    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    isReady.value = true

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  })()

  return initialization
}

export function useAuthSession() {
  return { user, isReady, initialize }
}
