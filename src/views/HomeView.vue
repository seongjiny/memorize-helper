<!-- src\views\HomeView.vue -->
<template>
  <section class="mx-auto max-w-[520px] px-[14px] py-3" :style="{ '--scale': String(fontPx / 15) }">
    <p v-if="!isReady" class="practicePanel" role="status">로그인 정보를 확인하고 있습니다.</p>
    <section v-else-if="!user" class="practicePanel">
      <h2 class="practiceHeading">기록으로 꾸준함을 쌓아 보세요</h2>
      <p class="practiceMuted">
        로그인하면 나의 기록 달력과 성취를 확인할 수 있어요. 본문은 로그인 없이 읽고 연습할 수
        있습니다.
      </p>
      <KakaoLoginPanel compact />
    </section>
    <p v-else-if="isLoading" class="practicePanel" role="status">암송 기록을 불러오고 있습니다.</p>
    <section v-else-if="errorMessage" class="practicePanel" role="alert">
      <h2 class="practiceHeading">기록을 불러오지 못했어요</h2>
      <p class="practiceMuted">잠시 후 다시 시도해 주세요.</p>
      <button class="practiceAction" type="button" @click="reloadRecords">기록 다시 시도</button>
    </section>
    <ActivityCalendar v-else :key="user.id" :records="ownRecords" :today-key="todayKey" />

    <p v-if="hasScriptError" role="alert">
      일부 본문을 불러오지 못했습니다.
      <button class="practiceLink" type="button" @click="loadScriptDetails">본문 다시 시도</button>
    </p>
    <h2 class="practiceHeading scriptListTitle">암송 자료</h2>
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
            <span v-if="progressByScript[s.id]!.isComplete" class="completionTrophy">
              <span aria-hidden="true">🏆</span> 전체 기록 완료
            </span>
            <div class="progressText">
              <span>기록 범위 진행률</span>
              <strong>{{ progressByScript[s.id]!.percentage }}%</strong>
            </div>
            <div
              class="progressTrack"
              role="progressbar"
              aria-label="기록 범위 진행률"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="progressByScript[s.id]!.percentage"
            >
              <span :style="{ width: `${progressByScript[s.id]!.percentage}%` }" />
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
import ActivityCalendar from '@/components/ActivityCalendar.vue'
import KakaoLoginPanel from '@/components/KakaoLoginPanel.vue'
import { useFontScale } from '@/composables/useFontScale'
import { usePracticeProgress } from '@/composables/usePracticeProgress'

const { fontPx } = useFontScale()
const {
  user,
  isReady,
  isLoading,
  errorMessage,
  ownRecords,
  todayKey,
  scripts,
  progressByScript,
  hasScriptError,
  reloadRecords,
  loadScriptDetails,
} = usePracticeProgress()
</script>

<style scoped>
.scriptListTitle {
  margin: 20px 0 12px;
}

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
