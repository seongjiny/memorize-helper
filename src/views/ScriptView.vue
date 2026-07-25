<!-- src/views/ScriptView.vue -->
<template>
  <section
    v-if="script"
    class="mx-auto max-w-[520px] px-[14px] pt-3"
    :style="{
      '--font-px': `${fontPx}px`,
      '--scale': String(fontPx / 15),
    }"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <button class="journalTab" type="button" aria-label="묵상 페이지 열기" @click="openJournal">
      로그인
    </button>

    <!-- Topbar -->
    <div class="scriptTitle">
      {{ script.title }}
    </div>

    <!-- Meta -->
    <div v-if="script.meta?.length || script.description" class="px-0 pt-3">
      <div v-if="script.description" class="desc">
        {{ script.description }}
      </div>

      <div v-if="script.meta?.length" class="flex flex-wrap gap-2">
        <span v-for="(m, i) in script.meta" :key="i" class="chip">
          {{ m }}
        </span>
      </div>
    </div>

    <!-- Blocks -->
    <div class="grid gap-5 py-3 pb-6">
      <section v-for="(b, bi) in script.blocks" :key="bi">
        <div class="blockTitle">{{ b.label }}</div>

        <div class="space-y-1">
          <div v-for="(line, li) in b.lines" :key="li" class="select-none" @click="toggle(bi, li)">
            <span class="verseText">
              <template v-for="(w, wi) in getWords(bi, li, line)" :key="wi">
                <span
                  class="word"
                  :class="{
                    first: wi === 0,
                    masked: wi !== 0 && !isOpen(bi, li),
                  }"
                >
                  {{ w }}
                </span>
                <span v-if="wi !== getWords(bi, li, line).length - 1" class="ws"> </span>
              </template>
            </span>
          </div>
        </div>
      </section>
    </div>

    <Transition name="panelBackdrop">
      <div v-if="isJournalOpen" class="journalBackdrop" @click="closeJournal" />
    </Transition>

    <Transition name="journal">
      <aside v-if="isJournalOpen" class="journalPanel" aria-label="묵상과 암송일지">
        <button class="closeBtn" type="button" aria-label="묵상 페이지 닫기" @click="closeJournal">
          닫기
        </button>

        <div class="journalTitle">묵상과 암송일지</div>
        <p class="journalDesc">카카오톡 로그인 후 암송 기록을 이어서 붙일 공간입니다.</p>

        <KakaoLoginPanel />

        <div class="futureBox">
          <div class="futureTitle">다음에 넣을 수 있는 것</div>
          <ul class="futureList">
            <li>오늘 암송한 구절</li>
            <li>묵상 메모</li>
            <li>암송 체크 기록</li>
          </ul>
        </div>
      </aside>
    </Transition>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, watchEffect, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getIndexById } from '@/data/database'
import type { MemorizationScript } from '@/types/script'
import { useFontScale } from '@/composables/useFontScale'
import KakaoLoginPanel from '@/components/KakaoLoginPanel.vue'

/* =========================
   Font size
========================= */
const { fontPx } = useFontScale()

/* =========================
   Routing / data
========================= */
const route = useRoute()

const scriptId = computed(() => String(route.params.id || ''))
const script = ref<MemorizationScript | null>(null)
const isJournalOpen = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)

watchEffect(async () => {
  const idx = getIndexById(scriptId.value)
  if (!idx) {
    script.value = null
    return
  }
  const res = await fetch(idx.source)
  script.value = await res.json()
})

/* =========================
   Reveal state
========================= */
const revealed = reactive<Record<string, boolean>>({})

const keyOf = (bi: number, li: number) => `${bi}-${li}`
const isOpen = (bi: number, li: number) => revealed[keyOf(bi, li)] === true
const toggle = (bi: number, li: number) => {
  const k = keyOf(bi, li)
  revealed[k] = !revealed[k]
}

/* =========================
   Word splitting (cache)
   - avoid calling split twice in template
========================= */
const wordsCache = reactive<Record<string, string[]>>({})

// key: `${bi}-${li}`
const getWords = (bi: number, li: number, line: string) => {
  const k = keyOf(bi, li)
  if (!wordsCache[k]) {
    wordsCache[k] = line.trim().split(/\s+/)
  }
  return wordsCache[k]
}

const openJournal = () => {
  isJournalOpen.value = true
}

const closeJournal = () => {
  isJournalOpen.value = false
}

const onTouchStart = (event: TouchEvent) => {
  const touch = event.changedTouches[0]
  if (!touch) return
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

const onTouchEnd = (event: TouchEvent) => {
  const touch = event.changedTouches[0]
  if (!touch) return

  const dx = touch.clientX - touchStartX.value
  const dy = touch.clientY - touchStartY.value
  if (dx > 70 && Math.abs(dy) < 60) {
    openJournal()
  }
}
</script>

<style scoped>
.scriptTitle {
  margin-bottom: 8px;
  font-weight: 900;
  font-size: calc(18px * var(--scale, 1));
}

.desc {
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.6);
  font-size: calc(13px * var(--scale, 1));
  line-height: 1.35;
}

.chip {
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
  padding: 4px 10px;
  font-size: calc(12px * var(--scale, 1));
}

.blockTitle {
  margin-bottom: 6px;
  font-weight: 900;
  font-size: calc(14px * var(--scale, 1));
}

.verseText {
  display: block;
  font-size: var(--font-px, 15px);
  line-height: calc(1.7 * (0.9 + 0.01 * var(--scale, 1))); /* 커질수록 행간도 조금 증가 */
  letter-spacing: -0.15px;
  word-break: keep-all;
  white-space: pre-wrap;
}

.word {
  display: inline-block;
  padding: 0 2px;
}

.word.first {
  font-weight: 700;
}

/* masked word */
.word.masked {
  color: transparent;
  background: rgba(0, 0, 0, 0.18);
}

.journalTab {
  position: fixed;
  right: 12px;
  bottom: 18px;
  z-index: 15;
  min-width: 64px;
  min-height: 38px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  background: #111827;
  color: white;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}

.journalBackdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, 0.26);
}

.journalPanel {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 31;
  width: min(88vw, 390px);
  height: 100dvh;
  overflow-y: auto;
  background: #ffffff;
  padding: 18px 16px 24px;
  box-shadow: -16px 0 36px rgba(0, 0, 0, 0.18);
}

.closeBtn {
  margin-left: auto;
  display: block;
  min-width: 52px;
  min-height: 34px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: white;
  font-weight: 800;
}

.journalTitle {
  margin-top: 18px;
  font-size: calc(20px * var(--scale, 1));
  font-weight: 900;
}

.journalDesc {
  margin: 6px 0 14px;
  color: rgba(0, 0, 0, 0.62);
  font-size: calc(13px * var(--scale, 1));
  line-height: 1.4;
}

.futureBox {
  margin-top: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 14px;
}

.futureTitle {
  font-weight: 900;
}

.futureList {
  margin-top: 8px;
  display: grid;
  gap: 6px;
  padding-left: 18px;
  color: rgba(0, 0, 0, 0.7);
  font-size: calc(13px * var(--scale, 1));
}

.journal-enter-active,
.journal-leave-active,
.panelBackdrop-enter-active,
.panelBackdrop-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.journal-enter-from,
.journal-leave-to {
  transform: translateX(100%);
}

.panelBackdrop-enter-from,
.panelBackdrop-leave-to {
  opacity: 0;
}
</style>
