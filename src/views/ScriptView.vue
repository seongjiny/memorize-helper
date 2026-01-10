<!-- src/views/ScriptView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getScriptById } from '@/data/database'

/* =========================
   Font size (localStorage)
========================= */
const FONT_KEY = 'mh_font_px'
const FONT_STEPS = [15, 18, 22, 28, 36, 44, 52, 60] as const
type FontPx = (typeof FONT_STEPS)[number]

const readFontPx = (): FontPx => {
  const raw = localStorage.getItem(FONT_KEY)
  const n = raw ? Number(raw) : NaN
  return (FONT_STEPS as readonly number[]).includes(n) ? (n as FontPx) : 15
}

const fontPx = ref<FontPx>(readFontPx())

watch(fontPx, (v) => localStorage.setItem(FONT_KEY, String(v)), { immediate: true })

const incFont = () => {
  const idx = FONT_STEPS.indexOf(fontPx.value)
  fontPx.value = FONT_STEPS[Math.min(FONT_STEPS.length - 1, idx + 1)]
}
const decFont = () => {
  const idx = FONT_STEPS.indexOf(fontPx.value)
  fontPx.value = FONT_STEPS[Math.max(0, idx - 1)]
}

/* =========================
   Routing / data
========================= */
const route = useRoute()
const router = useRouter()

const scriptId = computed(() => String(route.params.id || ''))
const script = computed(() => getScriptById(scriptId.value))

const goBack = () => router.push('/')

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
</script>

<template>
  <section
    v-if="script"
    class="mx-auto max-w-[520px] px-[14px]"
    :style="{ '--verse-font-size': `${fontPx}px` }"
  >
    <!-- Topbar -->
    <header
      class="sticky top-0 z-10 grid h-[54px] grid-cols-[44px_1fr_120px] items-center border-b border-black/10 bg-white"
    >
      <button
        class="h-[38px] w-[38px] rounded-md border border-black/10 bg-white text-[18px] leading-none"
        @click="goBack"
        aria-label="Back"
      >
        ←
      </button>

      <div class="text-center text-[15px] font-extrabold">
        {{ script.title }}
      </div>

      <div class="flex justify-end gap-2 pr-1">
        <button
          class="h-[38px] w-[38px] rounded-md border border-black/10 bg-white text-[14px] font-bold"
          @click="decFont"
          aria-label="Smaller font"
        >
          A-
        </button>
        <button
          class="h-[38px] w-[38px] rounded-md border border-black/10 bg-white text-[14px] font-bold"
          @click="incFont"
          aria-label="Larger font"
        >
          A+
        </button>
      </div>
    </header>

    <!-- Meta -->
    <div v-if="script.meta?.length || script.description" class="px-0 pt-3">
      <div v-if="script.description" class="mb-2 text-[13px] leading-snug text-black/60">
        {{ script.description }}
      </div>

      <div v-if="script.meta?.length" class="flex flex-wrap gap-2">
        <span
          v-for="(m, i) in script.meta"
          :key="i"
          class="rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-1 text-[12px]"
        >
          {{ m }}
        </span>
      </div>
    </div>

    <!-- Blocks -->
    <div class="grid gap-5 py-3 pb-6">
      <section v-for="(b, bi) in script.blocks" :key="bi">
        <div class="mb-2 text-[14px] font-black">
          {{ b.label }}
        </div>

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

    <div class="h-4" />
  </section>

  <!-- Not found -->
  <section v-else class="mx-auto max-w-[520px] px-[14px]">
    <header
      class="sticky top-0 z-10 grid h-[54px] grid-cols-[44px_1fr_44px] items-center border-b border-black/10 bg-white"
    >
      <button
        class="h-[38px] w-[38px] rounded-md border border-black/10 bg-white text-[18px] leading-none"
        @click="goBack"
        aria-label="Back"
      >
        ←
      </button>

      <div class="text-center text-[15px] font-extrabold">Not found</div>
      <div />
    </header>

    <div class="py-4 text-black/65">해당 스크립트를 찾을 수 없습니다.</div>
  </section>
</template>

<style scoped>
/* keep only the special bits in CSS */
.verseText {
  display: block;
  font-size: var(--verse-font-size, 15px);
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
</style>
