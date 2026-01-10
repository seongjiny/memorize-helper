<!-- src\views\ScriptView.vue -->
<template>
  <section v-if="script" class="page">
    <header class="topbar">
      <button class="iconBtn" @click="goBack" aria-label="Back">←</button>
      <div class="topTitle">{{ script.title }}</div>
      <div class="spacer" />
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
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getScriptById } from '@/data/database'

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
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  height: 54px;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.iconBtn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
  font-size: 16px;
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
  font-size: 15px;
  line-height: 1.7;
  letter-spacing: -0.15px;
  word-break: keep-all;
  white-space: pre-wrap;
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

/* 공백 */
/* .ws {
  display: inline;
} */

.safeBottom {
  height: 18px;
}
.empty {
  padding: 18px 4px;
  color: rgba(0, 0, 0, 0.65);
}
</style>
