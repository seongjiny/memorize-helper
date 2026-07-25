<template>
  <section class="kakaoPanel" :class="{ compact }">
    <div>
      <div class="panelTitle">카카오톡 로그인</div>
      <div class="panelDesc">묵상과 암송일지를 저장할 준비 공간입니다.</div>
    </div>

    <button class="kakaoBtn" type="button" @click="login">
      {{ userName ? '카카오 계정 연결됨' : '카카오톡으로 시작하기' }}
    </button>

    <button v-if="userName" class="logoutBtn" type="button" @click="logout">로그아웃</button>

    <p v-if="message" class="panelMessage">
      {{ message }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'

defineProps<{
  compact?: boolean
}>()

const message = ref('')
const userName = ref('')

const readSession = async () => {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  userName.value =
    user?.user_metadata?.name || user?.user_metadata?.nickname || user?.email || ''
}

const login = async () => {
  message.value = ''

  if (!supabase) {
    message.value = '.env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 추가해 주세요.'
    return
  }

  if (userName.value) return

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
  userName.value = ''
  message.value = '로그아웃되었습니다.'
}

onMounted(() => {
  readSession()
  supabase?.auth.onAuthStateChange(() => {
    readSession()
  })
})
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
  background: #fee500;
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
