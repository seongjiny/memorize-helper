<template>
  <section class="achievementsView mx-auto max-w-[520px] px-[14px] py-5">
    <h1 class="practiceHeading">나의 성취</h1>
    <p class="practiceMuted intro">암송 기록으로 쌓아온 작은 목표를 확인해 보세요.</p>

    <p v-if="!isReady" class="practicePanel" role="status">로그인 정보를 확인하고 있습니다.</p>
    <section v-else-if="!user" class="practicePanel">
      <h2 class="practiceHeading">로그인이 필요해요</h2>
      <p class="practiceMuted">기록을 저장하면 성취와 꾸준함을 확인할 수 있어요.</p>
      <KakaoLoginPanel compact />
    </section>
    <p v-else-if="isLoading" class="practicePanel" role="status">암송 기록을 불러오고 있습니다.</p>
    <section v-else-if="errorMessage" class="practicePanel" role="alert">
      <h2 class="practiceHeading">기록을 불러오지 못했어요</h2>
      <p class="practiceMuted">잠시 후 다시 시도해 주세요.</p>
      <button class="practiceAction" type="button" @click="reloadRecords">기록 다시 시도</button>
    </section>
    <template v-else>
      <p class="practiceMuted policy">
        과거 기록도 포함합니다. 기록을 수정하거나 삭제하면 성취도 다시 계산돼요.
      </p>
      <p v-if="!activity.totalDays" class="practicePanel">
        아직 기록이 없어요. 첫 기록부터 시작해 보세요.
      </p>
      <ul class="achievementList" aria-label="기록 기반 성취">
        <li
          v-for="badge in badges"
          :key="badge.id"
          class="practicePanel achievementCard"
          :class="{ earned: badge.earned }"
          :data-achievement="badge.id"
        >
          <div class="badgeHeader">
            <span class="badgeIcon" aria-hidden="true">{{ badge.earned ? '✓' : '○' }}</span>
            <h2 class="practiceHeading">{{ badge.title }}</h2>
            <span class="badgeStatus">{{ badge.earned ? '달성' : '진행 중' }}</span>
          </div>
          <p class="practiceMuted">{{ badge.condition }}</p>
          <p class="badgeCount">{{ Math.min(badge.value, badge.target) }} / {{ badge.target }}일</p>
          <progress
            :value="Math.min(badge.value, badge.target)"
            :max="badge.target"
            :aria-label="`${badge.title} 진행`"
          />
          <RouterLink class="practiceLink" to="/records">기록 보기</RouterLink>
        </li>
        <li
          class="practicePanel achievementCard"
          :class="{ earned: completedScript }"
          data-achievement="complete-script"
        >
          <div class="badgeHeader">
            <span class="badgeIcon" aria-hidden="true">{{ completedScript ? '✓' : '○' }}</span>
            <h2 class="practiceHeading">한 자료의 모든 절</h2>
            <span class="badgeStatus">{{
              completedScript
                ? '달성'
                : isLoadingScripts
                  ? '조회 중'
                  : hasScriptError
                    ? '확인 불가'
                    : '진행 중'
            }}</span>
          </div>
          <p class="practiceMuted">
            한 자료의 모든 절이 저장된 암송 범위에 포함되면 달성해요. 암송 실력 인증은 아닙니다.
          </p>
          <p v-if="isLoadingScripts" role="status">본문을 불러오고 있습니다.</p>
          <div v-else-if="hasScriptError" role="alert">
            <p class="practiceMuted">일부 본문을 불러오지 못해 전체 진행을 확인할 수 없어요.</p>
            <button class="practiceAction" type="button" @click="loadScriptDetails">
              본문 다시 시도
            </button>
          </div>
          <ul class="scriptProgressList">
            <li v-for="item in scripts" :key="item.id">
              <RouterLink class="practiceLink" :to="`/script/${item.id}`">{{
                item.title
              }}</RouterLink>
              <span v-if="progressByScript[item.id]"
                >{{ progressByScript[item.id]!.coveredVerses }} /
                {{ progressByScript[item.id]!.totalVerses }}절{{
                  progressByScript[item.id]!.isComplete ? ' · 달성' : ''
                }}</span
              >
              <span v-else class="practiceMuted">{{
                isLoadingScripts ? '조회 중' : '계산할 수 없음'
              }}</span>
            </li>
          </ul>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import KakaoLoginPanel from '@/components/KakaoLoginPanel.vue'
import { usePracticeProgress } from '@/composables/usePracticeProgress'

const {
  user,
  isReady,
  isLoading,
  errorMessage,
  scripts,
  activity,
  progressByScript,
  isLoadingScripts,
  hasScriptError,
  reloadRecords,
  loadScriptDetails,
} = usePracticeProgress()
const badges = computed(() =>
  [
    {
      id: 'first-record',
      title: '첫 기록',
      condition: '암송 기록이 있는 날 1일',
      value: activity.value.totalDays,
      target: 1,
    },
    {
      id: 'three-day-streak',
      title: '3일 이어가기',
      condition: '기록 날짜가 연속인 구간 3일',
      value: activity.value.longestStreak,
      target: 3,
    },
    {
      id: 'ten-days',
      title: '10일의 발자국',
      condition: '서로 다른 날짜의 암송 기록 10일',
      value: activity.value.totalDays,
      target: 10,
    },
  ].map((badge) => ({ ...badge, earned: badge.value >= badge.target })),
)
const completedScript = computed(() =>
  Object.values(progressByScript.value).some((progress) => progress.isComplete),
)
</script>

<style scoped>
.intro {
  margin: 6px 0 20px;
}
.policy {
  margin-bottom: 14px;
}
.achievementList {
  display: grid;
  gap: 12px;
}
.achievementCard {
  margin-bottom: 0;
}
.achievementCard.earned {
  border-color: var(--practice-accent);
}
.badgeHeader {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.badgeIcon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--practice-soft);
  color: var(--practice-muted);
}
.earned .badgeIcon {
  background: var(--practice-accent-soft);
  color: var(--practice-accent);
}
.badgeStatus {
  margin-left: auto;
  color: var(--practice-muted);
  font-size: 12px;
  font-weight: 700;
}
.earned .badgeStatus {
  color: var(--practice-accent);
}
.badgeCount {
  margin: 12px 0 6px;
  font-weight: 800;
}
progress {
  appearance: none;
  display: block;
  width: 100%;
  height: 8px;
  margin-bottom: 12px;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: var(--practice-soft);
}
progress::-webkit-progress-bar {
  border-radius: inherit;
  background: var(--practice-soft);
}
progress::-webkit-progress-value {
  border-radius: inherit;
  background: var(--practice-accent);
}
progress::-moz-progress-bar {
  border-radius: inherit;
  background: var(--practice-accent);
}
.scriptProgressList {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.scriptProgressList li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  font-size: 13px;
}
</style>
