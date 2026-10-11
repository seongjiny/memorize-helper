<template>
  <div class="achievementAnnouncement" role="status" aria-live="polite" aria-atomic="true">
    <Transition name="achievementToast">
      <div v-if="messages[0]" class="achievementToast">
        <span class="toastIcon" aria-hidden="true">🏆</span>
        <div>
          <strong>새로운 성취를 달성했어요!</strong>
          <p v-for="title in messages[0]" :key="title">{{ title }}</p>
        </div>
        <button type="button" aria-label="달성 알림 닫기" @click="dismiss">×</button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useAuthSession } from '@/composables/useAuthSession'
import { useMemorizationRecords } from '@/composables/useMemorizationRecords'
import { listScripts } from '@/data/database'
import { parseDateKey, toDateKey } from '@/lib/date'
import { getScriptProgress, summarizeActivity } from '@/lib/practiceProgress'
import type { MemorizationRecord } from '@/types/memorizationRecord'
import type { MemorizationScript } from '@/types/script'

const { user } = useAuthSession()
const { lastSavedChange } = useMemorizationRecords()
const messages = ref<string[][]>([])
let timer: ReturnType<typeof setTimeout> | undefined
let session = 0
let scriptDetails: Promise<MemorizationScript[]> | undefined
const getScripts = () => {
  scriptDetails ??= Promise.allSettled(
    listScripts().map(async (item) => {
      const response = await fetch(item.source)
      if (!response.ok) throw new Error('본문 조회 실패')
      return (await response.json()) as MemorizationScript
    }),
  ).then((results) => {
    if (results.some((result) => result.status === 'rejected')) scriptDetails = undefined
    return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  })
  return scriptDetails
}
const earned = (records: MemorizationRecord[], todayKey: string, scripts: MemorizationScript[]) => {
  const valid = records.filter(
    (record) => record.recordDate <= todayKey && parseDateKey(record.recordDate),
  )
  const activity = summarizeActivity(valid, todayKey)
  return [
    ...(activity.totalDays >= 1 ? ['첫 기록'] : []),
    ...(activity.longestStreak >= 3 ? ['3일 이어가기'] : []),
    ...(activity.totalDays >= 10 ? ['10일의 발자국'] : []),
    ...scripts
      .filter((script) => getScriptProgress(script, valid).isComplete)
      .map((script) => `${script.title} 전체 기록 완료!`),
  ]
}
const dismiss = () => {
  messages.value.shift()
}
watch(
  () => messages.value[0],
  (message) => {
    clearTimeout(timer)
    if (message) timer = setTimeout(dismiss, 4000)
  },
)
watch(
  () => user.value?.id,
  () => {
    session += 1
    messages.value = []
    clearTimeout(timer)
  },
  { flush: 'sync' },
)
watch(lastSavedChange, async (change) => {
  if (!change) return
  const currentSession = session
  const scripts = await getScripts()
  if (session !== currentSession || user.value?.id !== change.userId) return
  const todayKey = toDateKey(new Date())
  const ownRecords = (records: MemorizationRecord[]) =>
    records.filter((record) => record.userId === change.userId)
  const before = new Set(earned(ownRecords(change.before), todayKey, scripts))
  const newlyEarned = earned(ownRecords(change.after), todayKey, scripts).filter(
    (title) => !before.has(title),
  )
  if (newlyEarned.length) messages.value.push(newlyEarned)
})
onUnmounted(() => {
  session += 1
  clearTimeout(timer)
})
</script>

<style scoped>
.achievementAnnouncement {
  position: fixed;
  top: calc(64px + env(safe-area-inset-top, 0px));
  left: 50%;
  width: min(440px, calc(100vw - 28px));
  transform: translateX(-50%);
  z-index: 60;
  pointer-events: none;
}
.achievementToast {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--practice-accent);
  border-radius: 14px;
  padding: 10px 12px;
  background: var(--practice-surface);
  color: var(--practice-text);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
  font-size: 14px;
  line-height: 1.5;
  pointer-events: auto;
}
.toastIcon {
  font-size: 28px;
}
.achievementToast > div {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.achievementToast strong {
  font-weight: 800;
}
.achievementToast p {
  color: var(--practice-muted);
  font-size: 13px;
}
.achievementToast button {
  width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  font-size: 24px;
}
.achievementToast button:focus-visible {
  outline: 2px solid var(--practice-accent);
  border-radius: 8px;
}
.achievementToast-enter-active,
.achievementToast-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.achievementToast-enter-from,
.achievementToast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .achievementToast-enter-active,
  .achievementToast-leave-active {
    transition: none;
  }
}
</style>
