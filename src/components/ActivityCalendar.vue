<template>
  <section class="activityCalendar" aria-labelledby="activity-title">
    <RouterLink
      class="calendarPreview"
      :to="{ path: '/records', query: { date: todayKey, view: 'month' } }"
      :aria-label="`${monthTitle} 기록 달력 전체 보기`"
    >
      <div class="activityHeader">
        <h2 id="activity-title">{{ monthTitle }}</h2>
        <span class="previewLink" aria-hidden="true">기록 보기 ›</span>
      </div>
      <p class="activitySummary">
        이번 달 {{ thisMonthDays }}일 기록 · 현재 {{ activity.currentStreak }}일 연속
      </p>
      <div class="activityGrid" :aria-label="`${monthTitle} 암송 기록 달력`">
        <span
          v-for="weekday in weekdays"
          :key="weekday"
          class="activityWeekday"
          aria-hidden="true"
          >{{ weekday }}</span
        >
        <template v-for="(day, index) in cells" :key="day?.key || `blank-${index}`">
          <span
            v-if="day"
            class="activityDay"
            :class="{
              recorded: recordDates.has(day.key),
              today: day.key === todayKey,
              future: day.key > todayKey,
            }"
            :aria-label="`${day.key}, ${recordDates.has(day.key) ? '암송 기록 있음' : '기록 없음'}`"
            :aria-current="day.key === todayKey ? 'date' : undefined"
            >{{ day.day }}</span
          >
          <span v-else aria-hidden="true" />
        </template>
      </div>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MemorizationRecord } from '@/types/memorizationRecord'
import { getMonthCells, parseDateKey } from '@/lib/date'
import { summarizeActivity } from '@/lib/practiceProgress'

const props = defineProps<{ records: MemorizationRecord[]; todayKey: string }>()
const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const month = computed(() => parseDateKey(props.todayKey)!)
const monthTitle = computed(() => `${month.value.getFullYear()}년 ${month.value.getMonth() + 1}월`)
const activity = computed(() => summarizeActivity(props.records, props.todayKey))
const recordDates = computed(() => new Set(activity.value.dates))
const thisMonthDays = computed(
  () => activity.value.dates.filter((key) => key.startsWith(props.todayKey.slice(0, 7))).length,
)
const cells = computed(() => getMonthCells(month.value))
</script>

<style scoped>
.activityCalendar {
  margin-bottom: 16px;
  border: 1px solid var(--practice-border);
  border-radius: 12px;
  background: var(--practice-surface);
  color: var(--practice-text);
}
.calendarPreview {
  display: block;
  border-radius: inherit;
  padding: 12px;
  color: inherit;
  text-decoration: none;
}
.calendarPreview:focus-visible {
  outline: 2px solid var(--practice-accent);
  outline-offset: 3px;
}
.activityHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.activityHeader h2 {
  font-weight: 800;
}
.previewLink {
  color: var(--practice-muted);
  font-size: 12px;
}
.activitySummary {
  margin: 3px 0 8px;
  color: var(--practice-muted);
  font-size: 12px;
}
.activityGrid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
  text-align: center;
  font-size: 12px;
}
.activityWeekday {
  color: var(--practice-muted);
  line-height: 22px;
}
.activityDay {
  display: grid;
  place-items: center;
  height: 23px;
  border-radius: 5px;
}
.activityDay.recorded {
  background: var(--practice-accent-soft);
  color: var(--practice-accent);
  font-weight: 800;
}
.activityDay.today {
  box-shadow: inset 0 0 0 1px var(--practice-accent);
}
.activityDay.future {
  color: var(--practice-muted);
  opacity: 0.5;
}
</style>
