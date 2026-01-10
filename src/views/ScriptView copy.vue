<!-- src\views\ScriptView.vue -->
<template>
  <section v-if="script" class="page" :style="{ '--verse-font-size': `${fontPx}px` }">
    <header class="topbar">
      <button class="iconBtn" @click="goBack" aria-label="Back">←</button>

      <div class="topTitle">{{ script.title }}</div>

      <div class="fontCtl">
        <button @click="decFont" aria-label="Smaller font"><i nam></i></button>
        <button @click="incFont" aria-label="Larger font"></button>
      </div>
    </header>

    <div class="metaWrap" v-if="script.meta?.length || script.description">
      <div class="desc" v-if="script.description">{{ script.description }}</div>
      <div class="meta" v-if="script.meta?.length">
        <span v-for="(m, i) in script.meta" :key="i" class="chip">{{ m }}</span>
      </div>
    </div>

    <div class="blocks">
      <section v-for="(b, bi) in script.blocks" :key="bi" class="block">
        <div class="blockTitle">{{ b.label }}</div>

        <div
          v-for="(line, li) in b.lines"
          :key="li"
          class="verse"
          :class="{ hidden: !isOpen(bi, li) }"
          @click="toggle(bi, li)"
        >
          <span class="verseText">
            <template v-for="(w, wi) in splitWords(line)" :key="wi">
              <span
                class="word"
                :class="{
                  first: wi === 0,
                  masked: wi !== 0 && !isOpen(bi, li),
                }"
              >
                {{ w }}
              </span>
              <span v-if="wi !== splitWords(line).length - 1" class="ws"> </span>
            </template>
          </span>
        </div>
      </section>
    </div>

    <div class="safeBottom" />
  </section>

  <section v-else class="page">
    <header class="topbar">
      <button class="iconBtn" @click="goBack" aria-label="Back">←</button>
      <div class="topTitle">Not found</div>
      <div class="spacer" />
    </header>
    <div class="empty">해당 스크립트를 찾을 수 없습니다.</div>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import { useRoute, useRouter } from 'vue-router'
import { getScriptById } from '@/data/database'

const FONT_KEY = 'mh_font_px'

// 15 ~ 60px (원하면 더 늘려도 됨)
const FONT_STEPS = [15, 18, 22, 28, 36, 44, 52, 60] as const
type FontPx = (typeof FONT_STEPS)[number]

const readFontPx = (): FontPx => {
  const raw = localStorage.getItem(FONT_KEY)
  const n = raw ? Number(raw) : NaN
  return (FONT_STEPS as readonly number[]).includes(n) ? (n as FontPx) : 15
}

const fontPx = ref<FontPx>(readFontPx())
watch(
  fontPx,
  (v) => {
    localStorage.setItem(FONT_KEY, String(v))
  },
  { immediate: true },
)

const incFont = () => {
  const idx = FONT_STEPS.indexOf(fontPx.value)
  fontPx.value = FONT_STEPS[Math.min(FONT_STEPS.length - 1, idx + 1)]
}
const decFont = () => {
  const idx = FONT_STEPS.indexOf(fontPx.value)
  fontPx.value = FONT_STEPS[Math.max(0, idx - 1)]
}
const route = useRoute()
const router = useRouter()

const scriptId = computed(() => String(route.params.id || ''))
const script = computed(() => getScriptById(scriptId.value))

function goBack() {
  router.push('/')
}

const revealed = reactive<Record<string, boolean>>({})

const keyOf = (bi: number, li: number) => {
  return `${bi}-${li}`
}
const isOpen = (bi: number, li: number) => {
  return revealed[keyOf(bi, li)] === true
}
const toggle = (bi: number, li: number) => {
  const k = keyOf(bi, li)
  revealed[k] = !revealed[k]
}
const splitWords = (line: string) => {
  return line.trim().split(/\s+/)
}
</script>

<style scoped>
/* 모바일 */
.page {
  max-width: 520px;
  margin: 0 auto;
  padding: 0 14px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px 1fr 120px; /* ✅ 우측 넓힘 */
  align-items: center;
  height: 54px;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.fontCtl {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}
.iconBtn {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
  font-size: 20px;
  cursor: pointer;
}

.topTitle {
  text-align: center;
  font-weight: 800;
  font-size: 15px;
}
.spacer {
  width: 44px;
}

/* meta */
.metaWrap {
  padding: 12px 2px 6px;
}
.desc {
  color: rgba(0, 0, 0, 0.66);
  font-size: 13px;
  line-height: 1.45;
  margin-bottom: 10px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
}

/* blocks */
.blocks {
  display: grid;
  gap: 18px;
  padding: 10px 0 22px;
}
.blockTitle {
  font-weight: 900;
  font-size: 14px;
  margin-bottom: 10px;
}

.verse {
  width: 100%;
  text-align: left;
  cursor: pointer;
  user-select: none;
  margin-bottom: 3px;
}

.verse:active {
  transform: scale(0.995);
}

.verseText {
  display: block;
  font-size: var(--verse-font-size, 15px);
  line-height: 1.7;
  letter-spacing: -0.15px;
  word-break: keep-all;
  white-space: pre-wrap;
}

.fontVal {
  min-width: 34px;
  text-align: center;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.word {
  display: inline-block;
  position: relative;
}

.word.first {
  font-weight: 700; /* 첫 단어 강조(원치 않으면 제거) */
  margin-right: 8px;
}

/* 가림(단어 단위) */
.word.masked {
  color: transparent; /* 글자 안보이게 */
  background: rgba(0, 0, 0, 0.18); /* 회색 덩어리 */
  min-width: 0.8em; /* 너무 짧은 단어도 덩어리감 */
  padding: 0 2px;
}

.safeBottom {
  height: 18px;
}
.empty {
  padding: 18px 4px;
  color: rgba(0, 0, 0, 0.65);
}
</style>
