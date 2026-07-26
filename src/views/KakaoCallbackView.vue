<template>
  <section class="mx-auto max-w-[520px] px-[14px] py-5">
    <div class="callbackBox">
      <div class="callbackTitle">{{ title }}</div>
      <p class="callbackText">
        {{ message }}
      </p>
      <RouterLink class="homeLink" to="/">메인으로 돌아가기</RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const router = useRouter()
const title = ref('카카오 로그인 확인 중')
const message = ref('Supabase 세션을 확인하고 있습니다.')

onMounted(async () => {
  if (!supabase) {
    title.value = 'Supabase 설정 필요'
    message.value = '.env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 추가해 주세요.'
    return
  }

  const errorDescription = route.query.error_description
  if (typeof errorDescription === 'string') {
    title.value = '카카오 로그인 실패'
    message.value = errorDescription
    return
  }

  const { data } = await supabase.auth.getSession()
  if (data.session) {
    const returnTo = sessionStorage.getItem('mh_auth_return_to')
    sessionStorage.removeItem('mh_auth_return_to')
    const isSafeReturnPath =
      returnTo?.startsWith('/') &&
      !returnTo.startsWith('//') &&
      !returnTo.startsWith('/oauth/kakao/callback')
    const destination = isSafeReturnPath && returnTo ? returnTo : '/'
    await router.replace(destination)
    return
  }

  title.value = '카카오 로그인 대기 중'
  message.value = '세션이 아직 확인되지 않았습니다. Supabase Redirect URL 설정을 확인해 주세요.'
})
</script>

<style scoped>
.callbackBox {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: white;
  padding: 16px;
}

.callbackTitle {
  font-size: 18px;
  font-weight: 900;
}

.callbackText {
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.45;
}

.homeLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border-radius: 8px;
  background: #111827;
  color: white;
  font-weight: 800;
  text-decoration: none;
}
</style>
