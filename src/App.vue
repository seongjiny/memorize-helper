<!-- src/App.vue -->
<template>
  <main class="app" :style="{ '--scale': scale }">
    <header class="topbar">
      <button v-if="showBack" class="navBtn" type="button" aria-label="뒤로 가기" @click="goBack">
        ←
      </button>
      <div v-else class="navSpacer" />

      <div class="text-center text-[28px] font-bold text-gray-800">암송 도우미</div>

      <div class="menu">
        <button
          class="menuBtn"
          type="button"
          aria-label="메뉴 열기"
          :aria-expanded="isMenuOpen"
          aria-controls="header-menu"
          @click="isMenuOpen = !isMenuOpen"
        >
          <span />
          <span />
          <span />
        </button>

        <Transition name="menuPanel">
          <div v-if="isMenuOpen" id="header-menu" class="menuPanel">
            <div class="menuSection">
              <div class="menuLabel">글자 크기</div>
              <div class="fontCtl">
                <button class="fontBtn" type="button" aria-label="글씨 작게" @click="decFont">
                  −
                </button>
                <span class="fontSize">{{ fontPx }}px</span>
                <button class="fontBtn" type="button" aria-label="글씨 크게" @click="incFont">
                  +
                </button>
              </div>
            </div>

            <div v-if="revealControls" class="menuSection">
              <div class="menuLabel">암송</div>
              <div class="revealCtl">
                <button class="menuActionBtn" type="button" @click="hideAll">전체 가리기</button>
                <button class="menuActionBtn" type="button" @click="revealAll">전체 열기</button>
              </div>

              <div class="recordSummary">
                <span>열어본 범위</span>
                <strong>{{ revealControls.getRecordLabel() }}</strong>
              </div>

              <button class="recordBtn" type="button" @click="openRecord">암송 기록하기</button>
            </div>

            <RouterLink class="recordsLink" to="/records" @click="isMenuOpen = false">
              암송 기록 보기
              <span>›</span>
            </RouterLink>

            <RouterLink class="recordsLink" to="/updates" @click="isMenuOpen = false">
              업데이트 노트
              <span>›</span>
            </RouterLink>

            <KakaoLoginPanel menu />
          </div>
        </Transition>
      </div>
    </header>

    <button
      v-if="isMenuOpen"
      class="menuBackdrop"
      type="button"
      aria-label="메뉴 닫기"
      @click="isMenuOpen = false"
    />

    <Transition name="updateModal">
      <div v-if="isUpdateOpen" class="updateBackdrop">
        <section class="updateModal" role="dialog" aria-modal="true" aria-label="업데이트 노트">
          <UpdateNotesContent />

          <label class="hideUpdate">
            <input v-model="dontShowUpdateAgain" type="checkbox" />
            <span>이 업데이트 다시 보지 않기</span>
          </label>

          <button class="updateCloseBtn" type="button" @click="closeUpdate">확인했어요</button>
        </section>
      </div>
    </Transition>

    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFontScale } from '@/composables/useFontScale'
import { useScriptRevealControls } from '@/composables/useScriptRevealControls'
import { UPDATE_NOTE_STORAGE_KEY } from '@/data/updateNotes'
import KakaoLoginPanel from '@/components/KakaoLoginPanel.vue'
import UpdateNotesContent from '@/components/UpdateNotesContent.vue'

const { fontPx, scale, incFont, decFont } = useFontScale()
const { controls: revealControls } = useScriptRevealControls()

const router = useRouter()
const route = useRoute()
const isMenuOpen = ref(false)
const isUpdateOpen = ref(localStorage.getItem(UPDATE_NOTE_STORAGE_KEY) !== '1')
const dontShowUpdateAgain = ref(false)

const showBack = computed(() => route.path !== '/')

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const hideAll = () => {
  revealControls.value?.hideAll()
  isMenuOpen.value = false
}

const revealAll = () => {
  revealControls.value?.revealAll()
  isMenuOpen.value = false
}

const openRecord = () => {
  revealControls.value?.openRecord()
  isMenuOpen.value = false
}

const closeUpdate = () => {
  if (dontShowUpdateAgain.value) {
    localStorage.setItem(UPDATE_NOTE_STORAGE_KEY, '1')
  }
  isUpdateOpen.value = false
}

watch(
  () => route.path,
  () => {
    isMenuOpen.value = false
  },
)
</script>

<style scoped>
.app {
  max-width: 520px;
  margin: 0 auto;
  padding: 0 14px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 54px;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

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

.menu {
  position: relative;
}

.menuBtn {
  width: 38px;
  height: 38px;
  display: grid;
  place-content: center;
  gap: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: white;
  cursor: pointer;
}

.menuBtn span {
  width: 17px;
  height: 2px;
  border-radius: 999px;
  background: #1f2937;
}

.menuBtn:active {
  transform: scale(0.98);
}

.menuPanel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 42;
  width: min(290px, calc(100vw - 28px));
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
  background: white;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
}

.menuSection {
  padding: 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.menuLabel {
  margin-bottom: 10px;
  color: rgba(0, 0, 0, 0.62);
  font-size: 13px;
  font-weight: 700;
}

.fontCtl {
  display: grid;
  grid-template-columns: 38px 1fr 38px;
  align-items: center;
  gap: 10px;
}

.fontBtn {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 9px;
  background: white;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
}
.fontBtn:active {
  transform: scale(0.98);
}

.fontSize {
  text-align: center;
  color: #374151;
  font-size: 14px;
  font-weight: 800;
}

.revealCtl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.menuActionBtn {
  min-height: 40px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 9px;
  background: #f9fafb;
  color: #1f2937;
  font-weight: 800;
  cursor: pointer;
}

.menuActionBtn:active {
  transform: scale(0.98);
}

.recordSummary {
  margin-top: 12px;
  display: grid;
  gap: 3px;
  border-radius: 9px;
  background: #f5f6f7;
  padding: 10px 11px;
}

.recordSummary span {
  color: rgba(0, 0, 0, 0.5);
  font-size: 11px;
  font-weight: 700;
}

.recordSummary strong {
  color: #374151;
  font-size: 13px;
}

.recordBtn {
  width: 100%;
  min-height: 42px;
  margin-top: 8px;
  border: 0;
  border-radius: 9px;
  background: #111827;
  color: white;
  font-weight: 900;
  cursor: pointer;
}

.recordBtn:active {
  transform: scale(0.99);
}

.recordsLink {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0 14px;
  color: #1f2937;
  font-weight: 800;
  text-decoration: none;
}

.recordsLink span {
  color: rgba(0, 0, 0, 0.42);
  font-size: 22px;
}

.menuBackdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  border: 0;
  background: rgba(0, 0, 0, 0.08);
}

.menuPanel-enter-active,
.menuPanel-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.menuPanel-enter-from,
.menuPanel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.updateBackdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(17, 24, 39, 0.42);
  padding: 14px;
}

.updateModal {
  width: min(100%, 450px);
  max-height: calc(100dvh - 28px);
  overflow-y: auto;
  border-radius: 20px;
  background: white;
  padding: 20px;
  box-shadow: 0 20px 52px rgba(0, 0, 0, 0.22);
}

.hideUpdate {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 4px;
  color: #4b5563;
  font-size: 13px;
  font-weight: 700;
}

.hideUpdate input {
  width: 18px;
  height: 18px;
  accent-color: #111827;
}

.updateCloseBtn {
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 10px;
  background: #111827;
  color: white;
  font-weight: 900;
}

.updateModal-enter-active,
.updateModal-leave-active {
  transition: opacity 0.2s ease;
}

.updateModal-enter-from,
.updateModal-leave-to {
  opacity: 0;
}
</style>
