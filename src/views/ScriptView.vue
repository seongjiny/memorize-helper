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
        <div v-if="getChapterHeading(bi)" class="chapterHeading">
          {{ getChapterHeading(bi) }}
        </div>
        <div v-if="!hideSubtitles" class="blockTitle">{{ b.label }}</div>

        <div class="space-y-1">
          <div
            v-for="(line, li) in b.lines"
            :key="li"
            class="verseLine select-none"
            :data-reference="getLineReferenceKey(b.label, line)"
            @click="toggle(bi, li)"
          >
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

    <Transition name="recordModal">
      <div v-if="isRecordOpen" class="recordBackdrop" @click.self="closeRecord">
        <section class="recordModal" role="dialog" aria-modal="true" aria-label="암송 기록 입력">
          <template v-if="!user">
            <div class="recordHeader">
              <div>
                <div class="recordTitle">로그인이 필요해요</div>
                <p class="recordDesc">암송 기록은 로그인한 사용자만 저장할 수 있습니다.</p>
              </div>
              <button class="closeBtn" type="button" aria-label="기록 창 닫기" @click="closeRecord">
                ×
              </button>
            </div>

            <KakaoLoginPanel />
          </template>

          <form v-else @submit.prevent="submitRecord">
            <div class="recordHeader">
              <div>
                <div class="recordTitle">{{ existingRecord ? '암송 기록 수정' : '암송 기록' }}</div>
                <p class="recordDesc">
                  {{
                    existingRecord
                      ? '오늘 저장한 암송 범위를 수정할 수 있어요.'
                      : '열어본 절을 기준으로 범위를 입력했어요. 필요한 경우 수정해 주세요.'
                  }}
                </p>
              </div>
              <button class="closeBtn" type="button" aria-label="기록 창 닫기" @click="closeRecord">
                ×
              </button>
            </div>

            <label class="field">
              <span>날짜</span>
              <input v-model="recordForm.recordDate" type="date" :max="todayKey" />
            </label>

            <label class="field">
              <span>본문</span>
              <input v-model.trim="recordForm.book" type="text" autocomplete="off" />
            </label>

            <div class="rangeRow">
              <div class="rangeLabel">시작</div>
              <label class="numberField">
                <input
                  v-model.number="recordForm.startChapter"
                  type="number"
                  min="1"
                  inputmode="numeric"
                />
                <span>장</span>
              </label>
              <label class="numberField">
                <input
                  v-model.number="recordForm.startVerse"
                  type="number"
                  min="1"
                  inputmode="numeric"
                />
                <span>절</span>
              </label>
            </div>

            <div class="rangeRow">
              <div class="rangeLabel">마지막</div>
              <label class="numberField">
                <input
                  v-model.number="recordForm.endChapter"
                  type="number"
                  min="1"
                  inputmode="numeric"
                />
                <span>장</span>
              </label>
              <label class="numberField">
                <input
                  v-model.number="recordForm.endVerse"
                  type="number"
                  min="1"
                  inputmode="numeric"
                />
                <span>절</span>
              </label>
            </div>

            <p v-if="recordError" class="recordError">{{ recordError }}</p>

            <div class="recordActions">
              <button class="secondaryBtn" type="button" :disabled="isSaving" @click="closeRecord">
                취소
              </button>
              <button class="primaryBtn" type="submit" :disabled="isSaving">
                {{ isSaving ? '저장 중…' : existingRecord ? '수정 저장' : '기록 저장' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Transition>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, watch, watchEffect, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getIndexById } from '@/data/database'
import type { MemorizationScript } from '@/types/script'
import type { MemorizationRecord, VerseReference } from '@/types/memorizationRecord'
import { useFontScale } from '@/composables/useFontScale'
import { useScriptRevealControls } from '@/composables/useScriptRevealControls'
import { useAuthSession } from '@/composables/useAuthSession'
import { useMemorizationRecords } from '@/composables/useMemorizationRecords'
import { usePersonalSettings } from '@/composables/usePersonalSettings'
import { compareVerseReferences, getVerseReference } from '@/lib/verseReference'
import { toDateKey } from '@/lib/date'
import KakaoLoginPanel from '@/components/KakaoLoginPanel.vue'

/* =========================
   Font size
========================= */
const { fontPx } = useFontScale()
const { user, initialize: initializeAuth } = useAuthSession()
const { records, findByDate, load, save } = useMemorizationRecords()
const { hideSubtitles, resumeFromLast } = usePersonalSettings()

/* =========================
   Routing / data
========================= */
const route = useRoute()
const router = useRouter()
const todayKey = toDateKey(new Date())

const scriptId = computed(() => String(route.params.id || ''))
const script = ref<MemorizationScript | null>(null)
const isRecordOpen = ref(false)
const isSaving = ref(false)
const existingRecord = ref<MemorizationRecord | null>(null)
const recordError = ref('')
const recordForm = reactive({
  recordDate: todayKey,
  book: '',
  startChapter: null as number | null,
  startVerse: null as number | null,
  endChapter: null as number | null,
  endVerse: null as number | null,
})

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
const openedVerses = reactive<Record<string, VerseReference>>({})

const keyOf = (bi: number, li: number) => `${bi}-${li}`
const isOpen = (bi: number, li: number) => revealed[keyOf(bi, li)] === true
const toggle = (bi: number, li: number) => {
  const k = keyOf(bi, li)
  revealed[k] = !revealed[k]

  if (revealed[k]) {
    trackOpenedVerse(bi, li)
  }
}

const setAllRevealed = (isRevealed: boolean) => {
  script.value?.blocks.forEach((block, bi) => {
    block.lines.forEach((_, li) => {
      revealed[keyOf(bi, li)] = isRevealed
      if (isRevealed) trackOpenedVerse(bi, li)
    })
  })
}

const trackOpenedVerse = (bi: number, li: number) => {
  const currentScript = script.value
  const block = currentScript?.blocks[bi]
  const line = block?.lines[li]
  if (!currentScript || !line) return

  const reference = getVerseReference(currentScript, block.label, line)
  if (reference) {
    openedVerses[keyOf(bi, li)] = reference
  }
}

const { register, unregister } = useScriptRevealControls()

onMounted(() => {
  void initializeAuth()
  register({
    hideAll: () => setAllRevealed(false),
    revealAll: () => setAllRevealed(true),
    getRecordLabel: () => openedRangeLabel.value,
    openRecord,
  })
})

onUnmounted(unregister)

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

const getLineReferenceKey = (blockLabel: string | undefined, line: string) => {
  const currentScript = script.value
  if (!currentScript) return undefined
  const reference = getVerseReference(currentScript, blockLabel, line)
  return reference ? `${reference.chapter}:${reference.verse}` : undefined
}

let lastAutoScrollKey = ''

watch(
  [script, user, resumeFromLast],
  async ([currentScript, currentUser, shouldResume]) => {
    if (!currentScript || !currentUser || !shouldResume) return

    await load(currentUser.id)
    const latestRecord = records.value.find((record) => record.scriptId === currentScript.id)
    if (!latestRecord) return

    const scrollKey = `${currentScript.id}:${latestRecord.id || latestRecord.recordDate}`
    if (scrollKey === lastAutoScrollKey) return
    lastAutoScrollKey = scrollKey

    await nextTick()
    document
      .querySelector(`[data-reference="${latestRecord.endChapter}:${latestRecord.endVerse}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  },
  { immediate: true },
)

const getBlockReference = (bi: number) => {
  const currentScript = script.value
  const block = currentScript?.blocks[bi]
  const firstLine = block?.lines[0]
  if (!currentScript || !block || !firstLine) return null
  return getVerseReference(currentScript, block.label, firstLine)
}

const getChapterHeading = (bi: number) => {
  const current = getBlockReference(bi)
  if (!current) return ''
  const previous = bi > 0 ? getBlockReference(bi - 1) : null
  return !previous || previous.chapter !== current.chapter
    ? `${current.book} ${current.chapter}장`
    : ''
}

const openedRange = computed(() => Object.values(openedVerses).sort(compareVerseReferences))

const openedRangeLabel = computed(() => {
  const first = openedRange.value[0]
  const last = openedRange.value[openedRange.value.length - 1]
  if (!first || !last) return '아직 열어본 절이 없어요'

  if (first.chapter === last.chapter) {
    return `${first.book} ${first.chapter}장 ${first.verse}–${last.verse}절`
  }

  return `${first.book} ${first.chapter}장 ${first.verse}절–${last.chapter}장 ${last.verse}절`
})

const openRecord = async () => {
  await initializeAuth()
  existingRecord.value = null
  recordError.value = ''

  const first = openedRange.value[0]
  const last = openedRange.value[openedRange.value.length - 1]
  const currentScript = script.value

  recordForm.book =
    first?.book ||
    currentScript?.meta?.[0]?.match(/^([가-힣A-Za-z]+)/)?.[1] ||
    currentScript?.title ||
    ''
  recordForm.recordDate = todayKey
  recordForm.startChapter = first?.chapter ?? null
  recordForm.startVerse = first?.verse ?? null
  recordForm.endChapter = last?.chapter ?? null
  recordForm.endVerse = last?.verse ?? null

  if (user.value) {
    existingRecord.value = (await findByDate(user.value.id, todayKey)) ?? null
    if (existingRecord.value) {
      recordForm.book = existingRecord.value.book
      recordForm.startChapter = existingRecord.value.startChapter
      recordForm.startVerse = existingRecord.value.startVerse
      recordForm.endChapter = existingRecord.value.endChapter
      recordForm.endVerse = existingRecord.value.endVerse
    }
  }
  isRecordOpen.value = true
}

const closeRecord = () => {
  isRecordOpen.value = false
  existingRecord.value = null
}

const isPositiveInteger = (value: number | null) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

const submitRecord = async () => {
  recordError.value = ''

  if (
    !recordForm.recordDate ||
    !recordForm.book ||
    !isPositiveInteger(recordForm.startChapter) ||
    !isPositiveInteger(recordForm.startVerse) ||
    !isPositiveInteger(recordForm.endChapter) ||
    !isPositiveInteger(recordForm.endVerse)
  ) {
    recordError.value = '날짜, 본문과 시작·마지막 장절을 모두 입력해 주세요.'
    return
  }

  const startsAfterEnd =
    recordForm.startChapter! > recordForm.endChapter! ||
    (recordForm.startChapter === recordForm.endChapter &&
      recordForm.startVerse! > recordForm.endVerse!)

  if (startsAfterEnd) {
    recordError.value = '마지막 장절은 시작 장절보다 뒤에 있어야 합니다.'
    return
  }

  if (!user.value) return

  isSaving.value = true

  try {
    await saveRecord()
  } catch (error) {
    recordError.value =
      error instanceof Error ? error.message : '기존 암송 기록을 확인하지 못했습니다.'
  } finally {
    isSaving.value = false
  }
}

const saveRecord = async () => {
  if (
    !user.value ||
    !script.value ||
    !recordForm.startChapter ||
    !recordForm.startVerse ||
    !recordForm.endChapter ||
    !recordForm.endVerse
  ) {
    return
  }

  await save({
    userId: user.value.id,
    recordDate: recordForm.recordDate,
    scriptId: script.value.id,
    book: recordForm.book,
    startChapter: recordForm.startChapter,
    startVerse: recordForm.startVerse,
    endChapter: recordForm.endChapter,
    endVerse: recordForm.endVerse,
    updatedAt: new Date().toISOString(),
  })

  closeRecord()
  router.push('/records')
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

.chapterHeading {
  margin: 10px 0 12px;
  border-bottom: 2px solid #111827;
  padding-bottom: 7px;
  font-size: calc(17px * var(--scale, 1));
  font-weight: 900;
}

.verseText {
  display: block;
  font-size: var(--font-px, 15px);
  line-height: calc(1.7 * (0.9 + 0.01 * var(--scale, 1))); /* 커질수록 행간도 조금 증가 */
  letter-spacing: -0.15px;
  word-break: keep-all;
  white-space: pre-wrap;
}

.verseLine {
  scroll-margin-top: 68px;
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

.recordBackdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(17, 24, 39, 0.34);
  padding: 14px;
}

.recordModal {
  width: min(100%, 440px);
  max-height: calc(100dvh - 28px);
  overflow-y: auto;
  border-radius: 18px;
  background: white;
  padding: 18px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
}

.recordHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.recordTitle {
  font-size: calc(20px * var(--scale, 1));
  font-weight: 900;
}

.recordDesc {
  margin-top: 5px;
  color: rgba(0, 0, 0, 0.6);
  font-size: 13px;
  line-height: 1.45;
}

.closeBtn {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 50%;
  background: white;
  color: rgba(0, 0, 0, 0.62);
  font-size: 22px;
  line-height: 1;
}

.field {
  display: grid;
  gap: 7px;
  margin-bottom: 16px;
}

.field > span,
.rangeLabel {
  color: rgba(0, 0, 0, 0.62);
  font-size: 13px;
  font-weight: 800;
}

.field input {
  width: 100%;
  height: 44px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 0 12px;
  outline: none;
}

.field input:focus,
.numberField:focus-within {
  border-color: #111827;
}

.rangeRow {
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: 52px 1fr 1fr;
  align-items: center;
  gap: 8px;
}

.numberField {
  height: 44px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 0 10px;
}

.numberField input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  font-weight: 800;
}

.numberField span {
  flex: 0 0 auto;
  color: rgba(0, 0, 0, 0.56);
  font-size: 13px;
}

.recordError {
  margin-top: 10px;
  color: #b42318;
  font-size: 13px;
}

.recordActions {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 8px;
}

.primaryBtn,
.secondaryBtn {
  min-height: 46px;
  border-radius: 10px;
  font-weight: 900;
}

.primaryBtn:disabled,
.secondaryBtn:disabled {
  cursor: wait;
  opacity: 0.58;
}

.primaryBtn {
  border: 0;
  background: #111827;
  color: white;
}

.secondaryBtn {
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: white;
  color: #374151;
}

.recordModal-enter-active,
.recordModal-leave-active {
  transition: opacity 0.2s ease;
}

.recordModal-enter-from,
.recordModal-leave-to {
  opacity: 0;
}
</style>
