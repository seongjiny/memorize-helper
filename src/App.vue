<!-- src/App.vue -->
<template>
  <main class="app" :style="{ '--scale': scale }">
    <!-- 공통 Topbar -->
    <header class="topbar">
      <!-- Left: Back -->
      <button v-if="showBack" class="navBtn" @click="goBack" aria-label="Back">←</button>
      <div v-else class="navSpacer" />

      <!-- Center: Title -->
      <div class="text-center text-[28px] font-bold text-gray-800">암송 도우미</div>

      <!-- Right: Font control -->
      <div class="fontCtl">
        <button class="fontBtn" @click="decFont" aria-label="글씨 작게">−</button>
        <button class="fontBtn" @click="incFont" aria-label="글씨 크게">+</button>
      </div>
    </header>

    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFontScale } from '@/composables/useFontScale'

const { scale, incFont, decFont } = useFontScale()

const router = useRouter()
const route = useRoute()

/**
 * 홈(/)에서는 백버튼 숨김
 * 그 외 페이지에서는 표시
 */
const showBack = computed(() => route.path !== '/')

const goBack = () => {
  // 히스토리가 있으면 뒤로, 없으면 홈
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.app {
  max-width: 520px;
  margin: 0 auto;
  padding: 0 14px;
}

/* 공통 헤더 */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 54px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* 좌측 */
.navBtn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.navBtn:active {
  transform: scale(0.98);
}
.navSpacer {
  width: 38px;
}

/* 우측 */
.fontCtl {
  display: flex;
  gap: 8px;
}
.fontBtn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
}
.fontBtn:active {
  transform: scale(0.98);
}
</style>
