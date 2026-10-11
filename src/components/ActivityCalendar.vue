<template>
  <section class="practicePanel activityCalendar" aria-labelledby="activity-title">
    <div class="activityHeader">
      <h2 id="activity-title" class="practiceHeading">나의 기록</h2>
      <RouterLink class="practiceLink" to="/records">기록 전체 보기</RouterLink>
    </div>
    <p class="activitySummary">
      이번 달 {{ thisMonthDays }}일 기록 · 현재 {{ activity.currentStreak }}일 연속
    </p>
    <p class="practiceMuted activityNote">
      최장 {{ activity.longestStreak }}일 연속 · 암송 기록이 있는 날 기준
    </p>

    <div class="activityNav">
      <button class="practiceAction" type="button" aria-label="이전 달" @click="moveMonth(-1)">
        ‹
      </button>
      <div>
        <h3>{{ monthTitle }}</h3>
        <button v-if="!isCurrentMonth" class="practiceLink" type="button" @click="goThisMonth">
          이번 달
        </button>
      </div>
      <button
        class="practiceAction"
        type="button"
        aria-label="다음 달"
        :disabled="isCurrentMonth"
        @click="moveMonth(1)"
      >
        ›
      </button>
    </div>
    <div class="activityGrid" role="group" :aria-label="`${monthTitle} 암송 기록 달력`">
      <span v-for="weekday in weekdays" :key="weekday" class="activityWeekday" aria-hidden="true">{{
        weekday
      }}</span>
      <template v-for="(day, index) in cells" :key="day?.key || `blank-${index}`">
        <button
          v-if="day"
          class="activityDay"
          type="button"
          :class="{ recorded: recordsByDate.has(day.key), today: day.key === todayKey }"
          :disabled="day.key > todayKey"
          :aria-label="`${day.key}, ${recordsByDate.has(day.key) ? '암송 기록 있음' : '기록 없음'}${day.key === todayKey ? ', 오늘' : ''}${day.key > todayKey ? ', 미래 날짜' : ''}`"
          :aria-current="day.key === todayKey ? 'date' : undefined"
          :aria-pressed="day.key === selectedDate"
          @click="selectedDate = day.key"
        >
          <span>{{ day.day }}</span>
          <span class="activityCheck" aria-hidden="true">{{
            recordsByDate.has(day.key) ? '✓' : ''
          }}</span>
        </button>
        <span v-else aria-hidden="true" />
      </template>
    </div>
    <p class="practiceMuted activityLegend">
      ✓ 기록 있음 · 테두리: 오늘 · 선택한 달 {{ selectedMonthDays }}일 기록
    </p>

    <div class="activityDetail" aria-live="polite" aria-atomic="true">
      <strong>{{ selectedDate }}</strong>
      <template v-if="selectedRecord">
        <p>{{ getIndexById(selectedRecord.scriptId)?.title || selectedRecord.book }}</p>
        <p class="practiceMuted">{{ rangeLabel }}</p>
        <RouterLink class="practiceLink" :to="recordLink">기록 보기·수정</RouterLink>
      </template>
      <template v-else>
        <p class="practiceMuted">아직 기록이 없어요.</p>
        <RouterLink class="practiceLink" :to="recordLink">이 날짜에 기록하기</RouterLink>
      </template>
    </div>
    <p v-if="!activity.totalDays" class="practiceMuted activityNote">
      첫 기록을 남기고 꾸준함을 쌓아 보세요.
    </p>
    <RouterLink class="practiceLink achievementLink" to="/achievements"
      >나의 성취 보기 →</RouterLink
    >
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MemorizationRecord } from '@/types/memorizationRecord'
import { getIndexById } from '@/data/database'
import { getMonthCells, parseDateKey, toDateKey } from '@/lib/date'
import { summarizeActivity } from '@/lib/practiceProgress'

const props = defineProps<{ records: MemorizationRecord[]; todayKey: string }>()
const initialToday = parseDateKey(props.todayKey)!
const selectedMonth = ref(new Date(initialToday.getFullYear(), initialToday.getMonth(), 1))
const selectedDate = ref(props.todayKey)
const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const activity = computed(() => summarizeActivity(props.records, props.todayKey))
const recordsByDate = computed(
  () => new Map(props.records.map((record) => [record.recordDate, record])),
)
const monthKey = computed(() => toDateKey(selectedMonth.value).slice(0, 7))
const monthTitle = computed(
  () => `${selectedMonth.value.getFullYear()}년 ${selectedMonth.value.getMonth() + 1}월`,
)
const cells = computed(() => getMonthCells(selectedMonth.value))
const isCurrentMonth = computed(() => monthKey.value === props.todayKey.slice(0, 7))
const thisMonthDays = computed(
  () => activity.value.dates.filter((key) => key.startsWith(props.todayKey.slice(0, 7))).length,
)
const selectedMonthDays = computed(
  () => activity.value.dates.filter((key) => key.startsWith(monthKey.value)).length,
)
const selectedRecord = computed(() => recordsByDate.value.get(selectedDate.value))
const recordLink = computed(() => ({
  path: '/records',
  query: { date: selectedDate.value, view: 'month' },
}))
const rangeLabel = computed(() => {
  const record = selectedRecord.value
  if (!record) return ''
  return record.startChapter === record.endChapter
    ? `${record.book} ${record.startChapter}장 ${record.startVerse}–${record.endVerse}절`
    : `${record.book} ${record.startChapter}장 ${record.startVerse}절–${record.endChapter}장 ${record.endVerse}절`
})
const moveMonth = (offset: number) => {
  const next = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth() + offset,
    1,
  )
  if (toDateKey(next).slice(0, 7) > props.todayKey.slice(0, 7)) return
  selectedMonth.value = next
  selectedDate.value = isCurrentMonth.value ? props.todayKey : toDateKey(next)
}
const goThisMonth = () => {
  const today = parseDateKey(props.todayKey)!
  selectedMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = props.todayKey
}
watch(
  () => props.todayKey,
  (next, previous) => {
    if (monthKey.value === previous.slice(0, 7)) goThisMonth()
    else if (selectedDate.value > next) goThisMonth()
  },
)
</script>

<style scoped>
.activityHeader {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.activitySummary {
  margin-top: 10px;
  font-weight: 700;
  line-height: 1.5;
}
.activityNote {
  margin: 4px 0 12px;
}
.activityNav {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
  margin: 14px 0 8px;
}
.activityNav > div {
  text-align: center;
}
.activityNav h3 {
  font-weight: 800;
}
.activityNav > button {
  font-size: 24px;
  padding: 0;
}
.activityGrid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
}
.activityWeekday {
  padding: 8px 0;
  text-align: center;
  color: var(--practice-muted);
  font-size: 12px;
}
.activityDay {
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: clamp(13px, calc(13px * var(--scale, 1)), 18px);
  line-height: 1.2;
}
.activityDay.recorded {
  background: var(--practice-accent-soft);
  color: var(--practice-accent);
  font-weight: 800;
}
.activityDay.today {
  box-shadow: inset 0 0 0 2px var(--practice-accent);
}
.activityDay[aria-pressed='true'] {
  outline: 2px solid var(--practice-text);
  outline-offset: -4px;
}
.activityDay:disabled {
  color: var(--practice-muted);
  opacity: 0.55;
  cursor: default;
}
.activityDay:focus-visible {
  outline: 3px solid var(--practice-accent);
  outline-offset: 1px;
}
.activityCheck {
  min-height: 14px;
  font-size: 12px;
}
.activityLegend {
  margin: 10px 0;
}
.activityDetail {
  border-top: 1px solid var(--practice-border);
  padding-top: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.activityDetail .practiceLink {
  display: inline-block;
  padding: 6px 0;
}
.achievementLink {
  display: inline-block;
  margin-top: 12px;
}
</style>
