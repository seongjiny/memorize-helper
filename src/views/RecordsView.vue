<template>
  <section class="recordsView">
    <div class="pageHeader">
      <div>
        <h1>암송 기록</h1>
        <p>날짜별로 저장한 암송 범위를 확인할 수 있어요.</p>
      </div>
    </div>

    <template v-if="!isReady">
      <div class="stateBox">로그인 정보를 확인하고 있습니다.</div>
    </template>

    <template v-else-if="!user">
      <div class="stateBox">
        <div class="stateTitle">로그인이 필요해요</div>
        <p>카카오 로그인 후 암송 기록을 저장하고 확인할 수 있습니다.</p>
      </div>
      <KakaoLoginPanel />
    </template>

    <template v-else>
      <div v-if="isLoading" class="stateBox">암송 기록을 불러오고 있습니다.</div>

      <div v-else-if="errorMessage" class="stateBox errorState">
        <div class="stateTitle">기록을 불러오지 못했어요</div>
        <p>{{ errorMessage }}</p>
        <button type="button" @click="reloadRecords">다시 시도</button>
      </div>

      <template v-else>
        <div class="viewToggle" aria-label="기록 보기 방식">
          <button
            type="button"
            :class="{ active: viewMode === 'week' }"
            :aria-pressed="viewMode === 'week'"
            @click="viewMode = 'week'"
          >
            주간
          </button>
          <button
            type="button"
            :class="{ active: viewMode === 'month' }"
            :aria-pressed="viewMode === 'month'"
            @click="viewMode = 'month'"
          >
            월간
          </button>
        </div>

        <template v-if="viewMode === 'week'">
          <div class="historyNav">
            <button type="button" aria-label="이전 주" @click="moveWeek(-7)">‹</button>
            <div>
              <strong>{{ weekTitle }}</strong>
              <button v-if="!isCurrentWeek" class="todayBtn" type="button" @click="goToday">
                이번 주
              </button>
            </div>
            <button type="button" aria-label="다음 주" @click="moveWeek(7)">›</button>
          </div>

          <div class="weekList">
            <article
              v-for="day in weekDays"
              :key="day.key"
              class="dayRow"
              :class="{ today: day.isToday }"
            >
              <div class="date">
                <span>{{ day.weekday }}</span>
                <strong>{{ day.day }}</strong>
              </div>

              <button
                v-if="day.record"
                class="record"
                type="button"
                aria-label="암송 기록 수정"
                @click="openEditor(day.record)"
              >
                <div>{{ formatRange(day.record) }}</div>
                <span v-if="day.isToday">오늘 기록</span>
                <span v-else>눌러서 수정</span>
              </button>
              <button
                v-else
                class="empty emptyAction"
                type="button"
                :disabled="day.isFuture"
                :aria-label="day.isFuture ? '미래 날짜에는 기록할 수 없음' : '암송 기록 추가'"
                @click="openCreator(day.key)"
              >
                {{ day.isFuture ? '기록 없음' : '눌러서 기록' }}
              </button>
            </article>
          </div>
        </template>

        <template v-else>
          <div class="historyNav">
            <button type="button" aria-label="이전 달" @click="moveMonth(-1)">‹</button>
            <div>
              <strong>{{ monthTitle }}</strong>
              <button v-if="!isCurrentMonth" class="todayBtn" type="button" @click="goThisMonth">
                이번 달
              </button>
            </div>
            <button type="button" aria-label="다음 달" @click="moveMonth(1)">›</button>
          </div>

          <div class="calendar">
            <div v-for="weekday in weekdays" :key="weekday" class="calendarWeekday">
              {{ weekday }}
            </div>

            <button
              v-for="(day, index) in monthCells"
              :key="day?.key || `empty-${index}`"
              type="button"
              class="calendarDay"
              :class="{
                today: day?.isToday,
                hasRecord: day?.record,
                canCreate: day && !day.record && !day.isFuture,
              }"
              :disabled="!day || day.isFuture"
              :title="day?.record ? formatRange(day.record) : day && !day.isFuture ? '암송 기록 추가' : undefined"
              @click="day && (day.record ? openEditor(day.record) : openCreator(day.key))"
            >
              <template v-if="day">
                <span class="calendarDate">{{ day.day }}</span>
                <span v-if="day.record" class="recordDot" aria-label="암송 기록 있음" />
              </template>
            </button>
          </div>
        </template>
      </template>
    </template>

    <Transition name="editor">
      <div v-if="isEditorOpen" class="editorBackdrop" @click.self="closeEditor">
        <section
          class="editorModal"
          role="dialog"
          aria-modal="true"
          :aria-label="selectedRecord ? '암송 기록 수정' : '암송 기록 추가'"
        >
          <template v-if="selectedRecord && isDeleteConfirm">
            <div class="editorHeader">
              <div>
                <h2>이 기록을 삭제할까요?</h2>
                <p>삭제한 기록은 다시 복구할 수 없습니다.</p>
              </div>
            </div>

            <div class="deleteSummary">
              {{ formatRange(selectedRecord) }}
            </div>

            <p v-if="editError" class="editError">{{ editError }}</p>

            <div class="editorActions">
              <button type="button" :disabled="isMutating" @click="isDeleteConfirm = false">
                취소
              </button>
              <button class="dangerBtn" type="button" :disabled="isMutating" @click="deleteRecord">
                {{ isMutating ? '삭제 중…' : '삭제' }}
              </button>
            </div>
          </template>

          <form v-else @submit.prevent="saveChanges">
            <div class="editorHeader">
              <div>
                <h2>{{ selectedRecord ? '암송 기록 수정' : '암송 기록 추가' }}</h2>
                <p>날짜와 암송 범위를 입력해 주세요.</p>
              </div>
              <button type="button" aria-label="수정 창 닫기" @click="closeEditor">×</button>
            </div>

            <label class="editField">
              <span>날짜</span>
              <input v-model="editForm.recordDate" type="date" :max="todayKey" />
            </label>

            <label class="editField">
              <span>암송 본문</span>
              <select v-model="editForm.scriptId" @change="applySelectedScriptDefaults">
                <option v-for="item in scripts" :key="item.id" :value="item.id">
                  {{ item.title }}
                </option>
              </select>
            </label>

            <label class="editField">
              <span>본문</span>
              <input v-model.trim="editForm.book" type="text" autocomplete="off" />
            </label>

            <div class="editRange">
              <div>시작</div>
              <label>
                <input v-model.number="editForm.startChapter" type="number" min="1" />
                <span>장</span>
              </label>
              <label>
                <input v-model.number="editForm.startVerse" type="number" min="1" />
                <span>절</span>
              </label>
            </div>

            <div class="editRange">
              <div>마지막</div>
              <label>
                <input v-model.number="editForm.endChapter" type="number" min="1" />
                <span>장</span>
              </label>
              <label>
                <input v-model.number="editForm.endVerse" type="number" min="1" />
                <span>절</span>
              </label>
            </div>

            <p v-if="editError" class="editError">{{ editError }}</p>

            <div class="editorFooter">
              <button
                v-if="selectedRecord"
                class="deleteBtn"
                type="button"
                :disabled="isMutating"
                @click="isDeleteConfirm = true"
              >
                삭제
              </button>
              <div class="editorActions">
                <button type="button" :disabled="isMutating" @click="closeEditor">취소</button>
                <button class="saveBtn" type="submit" :disabled="isMutating">
                  {{ isMutating ? '저장 중…' : selectedRecord ? '수정 저장' : '기록 저장' }}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { MemorizationRecord } from '@/types/memorizationRecord'
import { useAuthSession } from '@/composables/useAuthSession'
import { useMemorizationRecords } from '@/composables/useMemorizationRecords'
import { addDays, startOfWeek, toDateKey } from '@/lib/date'
import { listScripts } from '@/data/database'
import KakaoLoginPanel from '@/components/KakaoLoginPanel.vue'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const todayKey = toDateKey(new Date())
const viewMode = ref<'week' | 'month'>('week')
const selectedWeek = ref(startOfWeek(new Date()))
const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedRecord = ref<MemorizationRecord | null>(null)
const isEditorOpen = ref(false)
const isDeleteConfirm = ref(false)
const isMutating = ref(false)
const editError = ref('')
const editForm = reactive({
  recordDate: '',
  scriptId: '',
  book: '',
  startChapter: 1,
  startVerse: 1,
  endChapter: 1,
  endVerse: 1,
})

const { user, isReady, initialize } = useAuthSession()
const {
  records,
  isLoading,
  errorMessage,
  load,
  save: saveRecord,
  update: updateRecord,
  remove: removeRecord,
} = useMemorizationRecords()
const scripts = listScripts()

initialize()

watch(
  user,
  (currentUser) => {
    if (currentUser) void load(currentUser.id)
  },
  { immediate: true },
)

const reloadRecords = () => {
  if (user.value) void load(user.value.id)
}

const recordsByDate = computed(
  () => new Map(records.value.map((record) => [record.recordDate, record])),
)

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDays(selectedWeek.value, index)
    const key = toDateKey(date)
    return {
      key,
      weekday: weekdays[index],
      day: date.getDate(),
      isToday: key === todayKey,
      isFuture: key > todayKey,
      record: recordsByDate.value.get(key),
    }
  }),
)

const weekTitle = computed(() => {
  const start = selectedWeek.value
  const end = addDays(start, 6)
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()

  if (sameMonth) {
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}–${end.getDate()}일`
  }

  return `${start.getMonth() + 1}월 ${start.getDate()}일 – ${end.getMonth() + 1}월 ${end.getDate()}일`
})

const isCurrentWeek = computed(
  () => toDateKey(selectedWeek.value) === toDateKey(startOfWeek(new Date())),
)

const moveWeek = (days: number) => {
  selectedWeek.value = addDays(selectedWeek.value, days)
}

const goToday = () => {
  selectedWeek.value = startOfWeek(new Date())
}

const monthTitle = computed(
  () => `${selectedMonth.value.getFullYear()}년 ${selectedMonth.value.getMonth() + 1}월`,
)

const monthCells = computed(() => {
  const year = selectedMonth.value.getFullYear()
  const month = selectedMonth.value.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const cells: Array<{
    key: string
    day: number
    isToday: boolean
    isFuture: boolean
    record?: MemorizationRecord
  } | null> = Array.from({ length: firstWeekday }, () => null)

  for (let day = 1; day <= lastDay; day += 1) {
    const key = toDateKey(new Date(year, month, day))
    cells.push({
      key,
      day,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      record: recordsByDate.value.get(key),
    })
  }

  return cells
})

const isCurrentMonth = computed(() => {
  const today = new Date()
  return (
    selectedMonth.value.getFullYear() === today.getFullYear() &&
    selectedMonth.value.getMonth() === today.getMonth()
  )
})

const moveMonth = (months: number) => {
  selectedMonth.value = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth() + months,
    1,
  )
}

const goThisMonth = () => {
  const today = new Date()
  selectedMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
}

const openEditor = (record: MemorizationRecord) => {
  selectedRecord.value = record
  isEditorOpen.value = true
  isDeleteConfirm.value = false
  editError.value = ''
  editForm.recordDate = record.recordDate
  editForm.scriptId = record.scriptId
  editForm.book = record.book
  editForm.startChapter = record.startChapter
  editForm.startVerse = record.startVerse
  editForm.endChapter = record.endChapter
  editForm.endVerse = record.endVerse
}

const applySelectedScriptDefaults = () => {
  const selectedScript = scripts.find((item) => item.id === editForm.scriptId)
  if (!selectedScript) return

  editForm.book = selectedScript.meta?.[0]?.match(/^([가-힣A-Za-z]+)/)?.[1] || selectedScript.title
  const chapter = Number(selectedScript.meta?.[0]?.match(/(\d+)/)?.[1]) || 1
  editForm.startChapter = chapter
  editForm.startVerse = 1
  editForm.endChapter = chapter
  editForm.endVerse = 1
}

const openCreator = (recordDate: string) => {
  if (recordDate > todayKey) return
  selectedRecord.value = null
  isEditorOpen.value = true
  isDeleteConfirm.value = false
  editError.value = ''
  editForm.recordDate = recordDate
  editForm.scriptId = scripts[0]?.id || ''
  applySelectedScriptDefaults()
}

const closeEditor = () => {
  if (isMutating.value) return
  isEditorOpen.value = false
  selectedRecord.value = null
  isDeleteConfirm.value = false
  editError.value = ''
}

const hasValidRange = () =>
  editForm.scriptId &&
  editForm.book &&
  editForm.recordDate &&
  editForm.recordDate <= todayKey &&
  [editForm.startChapter, editForm.startVerse, editForm.endChapter, editForm.endVerse].every(
    (value) => Number.isInteger(value) && value > 0,
  )

const saveChanges = async () => {
  const currentRecord = selectedRecord.value
  editError.value = ''

  if (!hasValidRange()) {
    editError.value = '날짜, 본문과 시작·마지막 장절을 모두 입력해 주세요.'
    return
  }

  const startsAfterEnd =
    editForm.startChapter > editForm.endChapter ||
    (editForm.startChapter === editForm.endChapter && editForm.startVerse > editForm.endVerse)

  if (startsAfterEnd) {
    editError.value = '마지막 장절은 시작 장절보다 뒤에 있어야 합니다.'
    return
  }

  const recordOnNewDate = records.value.find(
    (record) => record.recordDate === editForm.recordDate && record.id !== currentRecord?.id,
  )
  if (recordOnNewDate) {
    editError.value = '선택한 날짜에 이미 다른 암송 기록이 있습니다.'
    return
  }

  isMutating.value = true

  try {
    const record = {
      ...(currentRecord || {}),
      userId: user.value!.id,
      recordDate: editForm.recordDate,
      scriptId: editForm.scriptId,
      book: editForm.book,
      startChapter: editForm.startChapter,
      startVerse: editForm.startVerse,
      endChapter: editForm.endChapter,
      endVerse: editForm.endVerse,
      updatedAt: new Date().toISOString(),
    }
    if (currentRecord) await updateRecord(record)
    else await saveRecord(record)
    closeEditor()
  } catch (error) {
    editError.value =
      error instanceof Error
        ? error.message
        : currentRecord
          ? '암송 기록을 수정하지 못했습니다.'
          : '암송 기록을 저장하지 못했습니다.'
  } finally {
    isMutating.value = false
    if (!editError.value) closeEditor()
  }
}

const deleteRecord = async () => {
  const currentRecord = selectedRecord.value
  if (!currentRecord) return
  editError.value = ''
  isMutating.value = true

  try {
    await removeRecord(currentRecord)
  } catch (error) {
    editError.value = error instanceof Error ? error.message : '암송 기록을 삭제하지 못했습니다.'
  } finally {
    isMutating.value = false
    if (!editError.value) closeEditor()
  }
}

const formatRange = (record: MemorizationRecord) => {
  if (record.startChapter === record.endChapter) {
    return `${record.book} ${record.startChapter}장 ${record.startVerse}–${record.endVerse}절`
  }

  return `${record.book} ${record.startChapter}장 ${record.startVerse}절–${record.endChapter}장 ${record.endVerse}절`
}
</script>

<style scoped>
.recordsView {
  padding: 20px 14px 36px;
}

.pageHeader {
  margin-bottom: 18px;
}

.pageHeader h1 {
  font-size: calc(22px * var(--scale, 1));
  font-weight: 900;
}

.pageHeader p,
.stateBox p {
  margin-top: 5px;
  color: rgba(0, 0, 0, 0.58);
  font-size: 13px;
  line-height: 1.45;
}

.stateBox {
  margin-bottom: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #f8f9fa;
  padding: 16px;
  color: rgba(0, 0, 0, 0.62);
  font-size: 14px;
}

.stateTitle {
  color: #111827;
  font-weight: 900;
}

.viewToggle {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: #f1f3f5;
  padding: 4px;
}

.viewToggle button {
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 900;
}

.viewToggle button.active {
  background: white;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.historyNav {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  margin-bottom: 12px;
}

.historyNav > button {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: white;
  font-size: 24px;
}

.historyNav > div {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.historyNav strong {
  font-size: 14px;
}

.todayBtn {
  border: 0;
  background: transparent;
  color: #4b5563;
  font-size: 12px;
  font-weight: 800;
}

.weekList {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.09);
  border-radius: 14px;
  background: white;
}

.dayRow {
  min-height: 68px;
  display: grid;
  grid-template-columns: 54px 1fr;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.dayRow + .dayRow {
  border-top: 1px solid rgba(0, 0, 0, 0.07);
}

.dayRow.today {
  background: #f7f8fa;
}

.date {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.date span {
  color: rgba(0, 0, 0, 0.48);
  font-size: 12px;
  font-weight: 800;
}

.date strong {
  font-size: 18px;
}

.record {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 8px;
  text-align: left;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.4;
  cursor: pointer;
}

.record:focus-visible {
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.035);
  outline: none;
}

.record span {
  display: block;
  margin-top: 2px;
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
}

.empty {
  color: rgba(0, 0, 0, 0.35);
  font-size: 13px;
}

.emptyAction {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 8px;
  text-align: left;
  cursor: pointer;
}

.emptyAction:disabled {
  cursor: default;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.09);
  border-radius: 14px;
  background: white;
  padding: 8px;
}

.calendarWeekday {
  padding: 8px 0;
  color: rgba(0, 0, 0, 0.46);
  text-align: center;
  font-size: 11px;
  font-weight: 800;
}

.calendarDay {
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  padding-top: 8px;
}

.calendarDay.today {
  background: #f3f4f6;
}

.calendarDay.hasRecord {
  cursor: pointer;
}

.calendarDay.canCreate {
  cursor: pointer;
}

.calendarDay.canCreate:hover,
.calendarDay.canCreate:focus-visible {
  background: #f3f4f6;
  outline: none;
}

.calendarDay.hasRecord:focus-visible {
  background: #eef8f3;
  outline: none;
}

.calendarDate {
  font-size: 13px;
  font-weight: 800;
}

.recordDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22a06b;
}

.errorState button {
  margin-top: 12px;
  min-height: 36px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: white;
  padding: 0 12px;
  color: #374151;
  font-weight: 800;
}

.editorBackdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(17, 24, 39, 0.34);
  padding: 14px;
}

.editorModal {
  width: min(100%, 440px);
  max-height: calc(100dvh - 28px);
  overflow-y: auto;
  border-radius: 18px;
  background: white;
  padding: 18px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
}

.editorHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.editorHeader h2 {
  font-size: 20px;
  font-weight: 900;
}

.editorHeader p {
  margin-top: 5px;
  color: rgba(0, 0, 0, 0.58);
  font-size: 13px;
}

.editorHeader > button {
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

.editField {
  display: grid;
  gap: 7px;
  margin-bottom: 16px;
}

.editField > span,
.editRange > div {
  color: rgba(0, 0, 0, 0.62);
  font-size: 13px;
  font-weight: 800;
}

.editField input,
.editField select {
  width: 100%;
  height: 44px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 0 12px;
  outline: none;
}

.editField input:focus,
.editRange label:focus-within {
  border-color: #111827;
}

.editRange {
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: 52px 1fr 1fr;
  align-items: center;
  gap: 8px;
}

.editRange label {
  height: 44px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 0 10px;
}

.editRange input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  font-weight: 800;
}

.editRange label span {
  flex: 0 0 auto;
  color: rgba(0, 0, 0, 0.56);
  font-size: 13px;
}

.editError {
  margin-top: 10px;
  color: #b42318;
  font-size: 13px;
}

.editorFooter {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.editorActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.editorActions button,
.deleteBtn {
  min-height: 42px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 9px;
  background: white;
  padding: 0 14px;
  color: #374151;
  font-weight: 900;
}

.editorActions .saveBtn {
  border-color: #111827;
  background: #111827;
  color: white;
}

.deleteBtn {
  border: 0;
  color: #b42318;
}

.editorActions .dangerBtn {
  border-color: #b42318;
  background: #b42318;
  color: white;
}

.editorActions button:disabled,
.deleteBtn:disabled {
  cursor: wait;
  opacity: 0.58;
}

.deleteSummary {
  border-radius: 10px;
  background: #f5f6f7;
  padding: 14px;
  font-weight: 900;
}

.editor-enter-active,
.editor-leave-active {
  transition: opacity 0.2s ease;
}

.editor-enter-from,
.editor-leave-to {
  opacity: 0;
}
</style>
