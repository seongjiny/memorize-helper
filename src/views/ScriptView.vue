<!-- src/views/ScriptView.vue -->
<template>
  <section
    v-if="script"
    class="mx-auto max-w-[520px] px-[14px] pt-3"
    :style="{
      '--font-px': `${fontPx}px`,
      '--scale': String(fontPx / 15),
    }"
  >
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
  </section>
</template>
<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { getScriptById } from '@/data/database'
import { useFontScale } from '@/composables/useFontScale'

/* =========================
   Font size
========================= */
const { fontPx } = useFontScale()

/* =========================
   Routing / data
========================= */
const route = useRoute()

const scriptId = computed(() => String(route.params.id || ''))
const script = computed(() => getScriptById(scriptId.value))

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
</style>
