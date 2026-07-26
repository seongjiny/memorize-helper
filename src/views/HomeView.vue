<!-- src\views\HomeView.vue -->
<template>
  <section class="mx-auto max-w-[520px] px-[14px] py-3" :style="{ '--scale': String(fontPx / 15) }">
    <ul class="grid gap-3">
      <li
        v-for="s in scripts"
        :key="s.id"
        class="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
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
const { records, load } = useMemorizationRecords()

const scripts = listScripts()
const scriptDetails = ref<Record<string, MemorizationScript>>({})

initializeAuth()

watch(
  user,
  (currentUser) => {
    if (currentUser) void load(currentUser.id)
  },
  { immediate: true },
)

onMounted(async () => {
  const loadedScripts = await Promise.all(
    scripts.map(async (item) => {
      const response = await fetch(item.source)
      return [item.id, (await response.json()) as MemorizationScript] as const
    }),
  )
  scriptDetails.value = Object.fromEntries(loadedScripts)
})

const progressByScript = computed(() => {
  if (!user.value) return {}

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
        .filter((record) => record.scriptId === item.id)
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
