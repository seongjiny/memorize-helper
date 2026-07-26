<template>
  <section class="kakaoPanel" :class="{ compact, menu }">
    <div>
      <div class="panelTitle">{{ userName || '카카오 로그인' }}</div>
      <div v-if="!menu" class="panelDesc">묵상과 암송일지를 저장할 준비 공간입니다.</div>
      <div v-else class="panelDesc">
        {{ userName ? '카카오 계정으로 연결되어 있습니다.' : '암송 기록을 계정에 연결하세요.' }}
      </div>
    </div>

    <button v-if="!userName" class="kakaoBtn" type="button" @click="login">카카오로 로그인</button>

    <button v-if="userName" class="logoutBtn" type="button" @click="logout">로그아웃</button>

    <p v-if="message" class="panelMessage">
      {{ message }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthSession } from '@/composables/useAuthSession'

defineProps<{
  compact?: boolean
  menu?: boolean
}>()

const message = ref('')
const { user, initialize } = useAuthSession()
const userName = computed(
  () => user.value?.user_metadata?.name || user.value?.user_metadata?.nickname || user.value?.email,
)

const login = async () => {
  message.value = ''

  if (!supabase) {
    message.value = '.env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 추가해 주세요.'
    return
  }

  if (userName.value) return

  sessionStorage.setItem(
    'mh_auth_return_to',
    `${window.location.pathname}${window.location.search}`,
  )

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/oauth/kakao/callback`,
    },
  })

  if (error) {
    message.value = error.message
  }
}

const logout = async () => {
  if (!supabase) return
  await supabase.auth.signOut()
  message.value = '로그아웃되었습니다.'
}

initialize()
</script>

<style scoped>
.kakaoPanel {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #fff8d7;
  padding: 14px;
}

.kakaoPanel.compact {
  margin-top: 12px;
}

.kakaoPanel.menu {
  gap: 10px;
  border: 0;
  border-radius: 0;
  background: white;
  padding: 14px;
}

.panelTitle {
  font-weight: 900;
  color: #251b00;
  font-size: calc(16px * var(--scale, 1));
}

.panelDesc {
  margin-top: 4px;
  color: rgba(37, 27, 0, 0.68);
  line-height: 1.35;
  font-size: calc(13px * var(--scale, 1));
}

.kakaoBtn {
  width: 100%;
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  background: #f8df00;
  color: #191600;
  font-weight: 800;
  cursor: pointer;
}

.kakaoBtn:active {
  transform: scale(0.99);
}

.logoutBtn {
  width: 100%;
  min-height: 38px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: white;
  color: #251b00;
  font-weight: 800;
  cursor: pointer;
}

.panelMessage {
  color: rgba(37, 27, 0, 0.75);
  font-size: calc(12px * var(--scale, 1));
  line-height: 1.35;
}
</style>
