<!-- src\views\HomeView.vue -->
<template>
  <section class="mx-auto max-w-[520px] px-[14px] py-3" :style="{ '--scale': String(fontPx / 15) }">
    <p v-if="hasScriptError" role="alert">
      일부 본문을 불러오지 못했습니다.
      <button type="button" @click="loadScriptDetails">다시 시도</button>
    </p>
    <ul class="grid gap-3">
      <li
        v-for="s in scripts"
        :key="s.id"
        class="scriptCard overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
      >
        <RouterLink
          :to="`/script/${s.id}`"
          class="block p-4 text-inherit no-underline active:scale-[0.995]"
        >
          <div class="cardTitle">{{ s.title }}</div>

          <div v-if="s.description" class="cardDesc">
            {{ s.description }}
          </div>

          <div v-if="user && progressByScript[s.id] !== undefined" class="progress">
            <div class="progressText">
              <span>암송 진행률</span>
              <strong>{{ progressByScript[s.id] }}%</strong>
            </div>
            <div
              class="progressTrack"
              role="progressbar"
              aria-label="암송 진행률"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="progressByScript[s.id]"
            >
              <span :style="{ width: `${progressByScript[s.id]}%` }" />
            </div>
          </div>

          <div v-if="s.meta?.length" class="flex flex-wrap gap-2">
            <span v-for="(m, i) in s.meta" :key="i" class="tag">
              {{ m }}
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { listScripts } from '@/data/database'
import type { MemorizationScript } from '@/types/script'
import { useFontScale } from '@/composables/useFontScale'
import { useAuthSession } from '@/composables/useAuthSession'
import { useMemorizationRecords } from '@/composables/useMemorizationRecords'
import { compareVerseReferences, getVerseReference } from '@/lib/verseReference'

const { fontPx } = useFontScale()
const { user, initialize: initializeAuth } = useAuthSession()
const { records, load, isLoading, errorMessage } = useMemorizationRecords()

const scripts = listScripts()
const scriptDetails = ref<Record<string, MemorizationScript>>({})
const hasScriptError = ref(false)

initializeAuth()

watch(
  () => user.value?.id,
  (userId) => {
    if (userId) void load(userId)
  },
  { immediate: true },
)

const loadScriptDetails = async () => {
  const loadedScripts = await Promise.allSettled(
    scripts.map(async (item) => {
      const response = await fetch(item.source)
      if (!response.ok) throw new Error('본문을 불러오지 못했습니다.')
      return [item.id, (await response.json()) as MemorizationScript] as const
    }),
  )
  hasScriptError.value = loadedScripts.some((result) => result.status === 'rejected')
  scriptDetails.value = Object.fromEntries(
    loadedScripts.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
  )
}
onMounted(loadScriptDetails)

const progressByScript = computed(() => {
  if (!user.value || isLoading.value || errorMessage.value) return {}

  return Object.fromEntries(
    scripts.map((item) => {
      const detail = scriptDetails.value[item.id]
      if (!detail) return [item.id, undefined]

      const verses = detail.blocks.flatMap((block) =>
        block.lines
          .map((line) => getVerseReference(detail, block.label, line))
          .filter((reference) => reference !== null),
      )
      const coveredVerses = new Set<string>()

      records.value
        .filter((record) => record.userId === user.value?.id && record.scriptId === item.id)
        .forEach((record) => {
          verses.forEach((verse) => {
            const startsAtOrBefore =
              compareVerseReferences(
                { book: verse.book, chapter: record.startChapter, verse: record.startVerse },
                verse,
              ) <= 0
            const endsAtOrAfter =
              compareVerseReferences(
                { book: verse.book, chapter: record.endChapter, verse: record.endVerse },
                verse,
              ) >= 0

            if (startsAtOrBefore && endsAtOrAfter) {
              coveredVerses.add(`${verse.chapter}:${verse.verse}`)
            }
          })
        })

      const percentage = verses.length ? Math.round((coveredVerses.size / verses.length) * 100) : 0
      return [item.id, percentage]
    }),
  )
})
</script>

<style scoped>
.cardTitle {
  margin-bottom: 4px;
  font-weight: 700;
  font-size: calc(17px * var(--scale, 1));
}

.cardDesc {
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
  font-size: calc(13px * var(--scale, 1));
}

.progress {
  margin: 12px 0;
}

.progressText {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: rgba(0, 0, 0, 0.55);
  font-size: calc(12px * var(--scale, 1));
}

.progressText strong {
  color: #168553;
}

.progressTrack {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e9ecef;
}

.progressTrack span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: #22a06b;
  transition: width 0.25s ease;
}

.tag {
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
  padding: 4px 10px;
  color: rgba(0, 0, 0, 0.7);
  font-size: calc(12px * var(--scale, 1));
}
</style>
