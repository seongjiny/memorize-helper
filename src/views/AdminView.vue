<template>
  <section class="adminView" aria-labelledby="admin-title">
    <header class="adminHeader">
      <div>
        <p class="eyebrow">ADMIN</p>
        <h1 id="admin-title">운영 모니터링</h1>
        <p class="muted">방문 흐름과 회원 활동을 한눈에 확인하세요.</p>
      </div>
      <button
        v-if="access === 'allowed'"
        class="practiceAction"
        :disabled="loading"
        @click="reload"
      >
        새로고침
      </button>
    </header>

    <div v-if="access === 'checking'" class="practicePanel" role="status">
      관리자 권한을 확인하고 있습니다.
    </div>
    <div v-else-if="access === 'anonymous'" class="practicePanel">
      <h2>로그인이 필요해요</h2>
      <p class="muted">관리자로 지정된 카카오 계정으로 로그인해 주세요.</p>
      <KakaoLoginPanel />
    </div>
    <div v-else-if="access === 'denied'" class="practicePanel" role="alert">
      <h2>관리자 권한이 필요해요</h2>
      <p class="muted">이 계정은 운영 모니터링에 접근할 수 없습니다.</p>
      <RouterLink class="practiceLink" to="/">홈으로 돌아가기</RouterLink>
    </div>
    <div v-else-if="access === 'error'" class="practicePanel" role="alert">
      <p>관리자 권한을 확인하지 못했어요.</p>
      <button class="practiceAction" @click="refreshAccess">다시 시도</button>
    </div>

    <template v-else>
      <nav class="adminTabs" aria-label="관리자 메뉴">
        <RouterLink to="/admin" :aria-current="screen === 'dashboard' ? 'page' : undefined"
          >대시보드</RouterLink
        ><RouterLink to="/admin/users" :aria-current="screen !== 'dashboard' ? 'page' : undefined"
          >회원 관리</RouterLink
        >
      </nav>

      <div v-if="screen === 'dashboard'" class="filters">
        <label
          >방문 통계 환경<select v-model="environment">
            <option value="dev">개발 사이트</option>
            <option value="prod">운영 사이트</option>
          </select></label
        >
        <label
          >조회 기간<select v-model.number="days">
            <option :value="1">오늘</option>
            <option :value="7">최근 7일</option>
            <option :value="30">최근 30일</option>
          </select></label
        >
      </div>
      <form v-else-if="screen === 'users'" class="searchForm" @submit.prevent="search">
        <label for="member-search">회원 검색</label>
        <div>
          <input
            id="member-search"
            v-model="searchInput"
            maxlength="100"
            type="search"
            placeholder="닉네임, 이메일 또는 회원 ID"
          /><button class="practiceAction" type="submit">검색</button>
        </div>
      </form>

      <p v-if="loading" class="practicePanel" role="status">정보를 불러오고 있습니다.</p>
      <div v-else-if="errorMessage" class="practicePanel" role="alert">
        <p>{{ errorMessage }}</p>
        <button class="practiceAction" @click="load">다시 시도</button>
      </div>

      <template v-else-if="screen === 'dashboard' && dashboard">
        <div class="metricGrid">
          <article v-for="card in cards" :key="card.label" class="metricCard">
            <h2>{{ card.label }}</h2>
            <strong>{{ number(card.value) }}</strong>
            <p>{{ card.description }}</p>
          </article>
        </div>
        <section class="practicePanel">
          <div class="panelHeading">
            <h2>방문 추이</h2>
            <span class="muted">한국 시간 기준</span>
          </div>
          <p v-if="!dashboard.collectedSince" class="muted emptyState">
            아직 수집된 방문이 없어요. 해당 사이트에 방문하면 통계가 쌓입니다.
          </p>
          <p v-else class="muted">
            {{ formatDate(dashboard.collectedSince) }}부터 수집한 방문 통계입니다.
          </p>
          <div class="trend" :aria-label="`최근 ${days}일 방문 횟수`" role="img">
            <div
              v-for="day in dashboard.daily"
              :key="day.date"
              class="trendDay"
              :title="`${day.date}: ${day.visits}회 방문, ${day.visitors}명, ${day.pageViews}회 조회`"
            >
              <div class="barSpace">
                <div
                  class="bar"
                  :style="{
                    height: `${day.visits ? Math.max(3, (day.visits / maxVisits) * 100) : 0}%`,
                  }"
                />
              </div>
              <span>{{ day.date.slice(8) }}</span>
            </div>
          </div>
          <details>
            <summary>날짜별 수치 보기</summary>
            <div class="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>방문</th>
                    <th>방문자</th>
                    <th>페이지 조회</th>
                    <th>암송 기록</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="day in dashboard.daily" :key="day.date">
                    <td>{{ day.date }}</td>
                    <td>{{ number(day.visits) }}</td>
                    <td>{{ number(day.visitors) }}</td>
                    <td>{{ number(day.pageViews) }}</td>
                    <td>{{ number(day.recordCount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section class="practicePanel">
          <h2>화면별 이용 현황</h2>
          <p v-if="!dashboard.pages.length" class="muted emptyState">조회된 화면이 없습니다.</p>
          <div v-else class="tableScroll">
            <table>
              <thead>
                <tr>
                  <th>화면</th>
                  <th>페이지 조회</th>
                  <th>방문자</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in dashboard.pages" :key="item.page">
                  <td>{{ monitoringPageNames[item.page] || item.page }}</td>
                  <td>{{ number(item.pageViews) }}</td>
                  <td>{{ number(item.visitors) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <p class="muted definitions">
          방문은 30분간 활동이 끊기면 새로 집계합니다. 방문자 수는 브라우저 기준 추정치이며 관리자
          방문은 제외합니다. 회원·암송 기록은 개발·운영이 함께 사용하는 DB 기준이고, 암송 기록은
          기록한 날짜로 집계합니다.
        </p>
      </template>

      <template v-else-if="screen === 'users' && members">
        <p class="muted listSummary">총 {{ number(members.total) }}명 · {{ memberPage }}페이지</p>
        <section class="practicePanel">
          <p v-if="!members.users.length" class="muted emptyState">
            검색 조건에 맞는 회원이 없습니다.
          </p>
          <div v-else class="tableScroll">
            <table class="membersTable">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>가입일</th>
                  <th>최근 로그인</th>
                  <th>암송 기록</th>
                  <th>계정 상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in members.users" :key="member.id">
                  <td>
                    <RouterLink class="memberLink" :to="`/admin/users/${member.id}`">{{
                      member.name
                    }}</RouterLink
                    ><small>{{ member.id.slice(0, 8) }}</small>
                  </td>
                  <td>{{ formatDate(member.createdAt) }}</td>
                  <td>{{ formatDate(member.lastSignInAt) }}</td>
                  <td>
                    {{ number(member.recordCount) }}회<small
                      >최근 {{ member.lastRecordDate || '기록 없음' }}</small
                    >
                  </td>
                  <td>
                    <span class="statusTag">{{
                      member.status === 'banned' ? '정지' : '정상'
                    }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div class="pagination">
          <button class="practiceAction" :disabled="memberPage <= 1" @click="memberPage--">
            이전</button
          ><span
            >{{ memberPage }} / {{ Math.max(1, Math.ceil(members.total / members.pageSize)) }}</span
          ><button
            class="practiceAction"
            :disabled="memberPage * members.pageSize >= members.total"
            @click="memberPage++"
          >
            다음
          </button>
        </div>
        <p class="muted definitions">
          최근 로그인은 실제 방문 시각과 다릅니다. 회원 정보는 조회만 가능하며 계정 변경 기능은
          포함하지 않습니다.
        </p>
      </template>

      <template v-else-if="screen === 'user' && memberDetail">
        <RouterLink class="practiceLink backToMembers" to="/admin/users">← 회원 목록</RouterLink>
        <section class="practicePanel memberDetail">
          <h2>
            {{ memberDetail.name }}
            <span v-if="memberDetail.isAdmin" class="statusTag">관리자</span>
          </h2>
          <dl>
            <dt>회원 ID</dt>
            <dd>{{ memberDetail.id }}</dd>
            <dt>이메일</dt>
            <dd>{{ memberDetail.email || '제공되지 않음' }}</dd>
            <dt>가입</dt>
            <dd>{{ formatTime(memberDetail.createdAt) }}</dd>
            <dt>최근 로그인</dt>
            <dd>{{ formatTime(memberDetail.lastSignInAt) }}</dd>
            <dt>계정 상태</dt>
            <dd>{{ memberDetail.status === 'banned' ? '정지' : '정상' }}</dd>
            <dt>전체 암송 기록</dt>
            <dd>{{ number(memberDetail.recordCount) }}회</dd>
            <dt>마지막 기록일</dt>
            <dd>{{ memberDetail.lastRecordDate || '기록 없음' }}</dd>
            <dt>최근 30일 기록</dt>
            <dd>{{ memberDetail.activeDays30 }}일</dd>
          </dl>
        </section>
        <section class="practicePanel">
          <h2>최근 기록 활동</h2>
          <p class="muted">
            최근 기록일 최대 30개를 표시합니다. 개인별 구절 내용은 표시하지 않습니다.
          </p>
          <p v-if="!memberDetail.recentActivity.length" class="muted emptyState">
            아직 암송 기록이 없습니다.
          </p>
          <ul v-else class="recentActivity">
            <li v-for="activity in memberDetail.recentActivity" :key="activity.date">
              <span>{{ activity.date }}</span
              ><span>{{ activity.count }}회 기록</span>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import KakaoLoginPanel from '@/components/KakaoLoginPanel.vue'
import { useAdminAccess } from '@/composables/useAdminAccess'
import { useAuthSession } from '@/composables/useAuthSession'
import { AdminError, monitoringPageNames, requestAdmin } from '@/lib/admin'
import { deploymentEnvironment } from '@/lib/visitTracking'
import type {
  AdminDashboard,
  AdminMemberDetail,
  AdminMembers,
  MonitoringEnvironment,
} from '@/types/admin'

const route = useRoute()
const { user } = useAuthSession()
const { status: access, refresh: refreshAccess, deny } = useAdminAccess()
const screen = computed(() =>
  route.name === 'admin-user' ? 'user' : route.name === 'admin-users' ? 'users' : 'dashboard',
)
const environment = ref<MonitoringEnvironment>(deploymentEnvironment() || 'dev')
const days = ref(7)
const memberPage = ref(1)
const searchInput = ref('')
const appliedSearch = ref('')
const dashboard = ref<AdminDashboard | null>(null)
const members = ref<AdminMembers | null>(null)
const memberDetail = ref<AdminMemberDetail | null>(null)
const loading = ref(false)
const errorMessage = ref('')
let requestVersion = 0

const clear = () => {
  dashboard.value = null
  members.value = null
  memberDetail.value = null
}
async function load() {
  const version = ++requestVersion
  const userId = user.value?.id
  clear()
  errorMessage.value = ''
  if (access.value !== 'allowed' || !userId) return
  loading.value = true
  const current = () =>
    version === requestVersion && user.value?.id === userId && access.value === 'allowed'
  try {
    if (screen.value === 'dashboard') {
      const result = await requestAdmin<AdminDashboard>({
        action: 'dashboard',
        environment: environment.value,
        days: days.value,
      })
      if (current()) dashboard.value = result
    } else if (screen.value === 'users') {
      const result = await requestAdmin<AdminMembers>({
        action: 'users',
        search: appliedSearch.value,
        page: memberPage.value,
      })
      if (current()) members.value = result
    } else {
      const result = await requestAdmin<AdminMemberDetail>({
        action: 'user',
        userId: String(route.params.userId),
      })
      if (current()) memberDetail.value = result
    }
  } catch (error) {
    if (!current()) return
    if (error instanceof AdminError && [401, 403].includes(error.status)) deny()
    else errorMessage.value = error instanceof Error ? error.message : '정보를 불러오지 못했어요.'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
const search = () => {
  appliedSearch.value = searchInput.value.trim()
  memberPage.value = 1
  void load()
}
const reload = async () => {
  await refreshAccess()
}
watch(
  [access, () => route.fullPath, environment, days, memberPage],
  () => {
    void load()
  },
  { immediate: true },
)
watch(
  () => user.value?.id,
  () => {
    ++requestVersion
    clear()
    errorMessage.value = ''
    loading.value = false
  },
  { flush: 'sync' },
)
onMounted(() => {
  void refreshAccess()
})

const number = (value: number) => value.toLocaleString('ko-KR')
const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '없음'
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '없음'
const maxVisits = computed(() =>
  Math.max(1, ...(dashboard.value?.daily.map((day) => day.visits) || [])),
)
const cards = computed(() => {
  if (!dashboard.value) return []
  const s = dashboard.value.summary
  return [
    { label: '방문 횟수', value: s.visits, description: '선택 기간 · 방문 세션' },
    { label: '방문자 수', value: s.visitors, description: '선택 기간 · 브라우저 기준' },
    { label: '페이지 조회', value: s.pageViews, description: '선택 기간 · 화면 조회' },
    { label: '전체 회원', value: s.totalUsers, description: '현재 등록된 회원' },
    { label: '신규 회원', value: s.newUsers, description: '선택 기간 · 가입' },
    { label: '기록한 회원', value: s.activeRecordUsers, description: '선택 기간 · 암송 기록 기준' },
    { label: '전체 암송 기록', value: s.totalRecords, description: '현재 저장된 기록' },
    {
      label: '기간 내 암송 기록',
      value: s.periodRecords,
      description: '선택 기간 · 기록 날짜 기준',
    },
  ]
})
</script>

<style scoped>
.adminView {
  padding: 24px 0 36px;
  color: var(--practice-text);
  font-size: 14px;
  line-height: 1.5;
}
.adminHeader,
.panelHeading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.adminHeader h1 {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.04em;
}
.eyebrow {
  color: var(--practice-accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
}
.muted {
  color: var(--practice-muted);
  font-size: 13px;
}
h2 {
  font-size: 17px;
  font-weight: 800;
}
.adminTabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--practice-border);
}
.adminTabs a {
  padding: 10px 16px;
  color: var(--practice-muted);
  font-weight: 700;
}
.adminTabs [aria-current='page'] {
  color: var(--practice-accent);
  border-bottom: 3px solid var(--practice-accent);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
.filters label {
  display: grid;
  gap: 5px;
  flex: 1;
  min-width: 120px;
  max-width: 220px;
  font-size: 12px;
  font-weight: 700;
}
select,
input {
  min-height: 44px;
  min-width: 0;
  border: 1px solid var(--practice-border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--practice-surface);
  color: var(--practice-text);
  font-size: 16px;
}
.metricGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.metricCard {
  min-width: 0;
  border: 1px solid var(--practice-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--practice-surface);
}
.metricCard h2 {
  font-size: 13px;
  color: var(--practice-muted);
}
.metricCard strong {
  display: block;
  font-size: 30px;
  letter-spacing: -0.03em;
  margin: 8px 0 4px;
}
.metricCard p {
  color: var(--practice-muted);
  font-size: 11px;
}
.trend {
  display: flex;
  height: 160px;
  gap: 4px;
  margin: 16px 0;
}
.trendDay {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 10px;
  color: var(--practice-muted);
}
.barSpace {
  display: flex;
  flex-direction: column;
  justify-content: end;
  height: 130px;
  background: var(--practice-soft);
  border-radius: 4px;
  margin-bottom: 6px;
}
.bar {
  background: var(--practice-accent);
  border-radius: 4px;
}
summary {
  cursor: pointer;
  min-height: 44px;
  display: list-item;
  padding-top: 10px;
  color: var(--practice-accent);
  font-weight: 700;
}
.tableScroll {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
  font-size: 13px;
}
th {
  color: var(--practice-muted);
  font-size: 12px;
  white-space: nowrap;
}
td,
th {
  border-bottom: 1px solid var(--practice-border);
  padding: 12px 8px;
}
.membersTable {
  min-width: 620px;
}
small {
  display: block;
  color: var(--practice-muted);
  font-size: 11px;
  margin-top: 3px;
}
.memberLink {
  color: var(--practice-accent);
  font-weight: 800;
  display: inline-block;
  min-height: 32px;
  padding-top: 4px;
}
.statusTag {
  display: inline-block;
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 11px;
  background: var(--practice-soft);
  color: var(--practice-text);
  white-space: nowrap;
}
.definitions {
  margin-top: 16px;
  line-height: 1.8;
}
.emptyState {
  padding: 16px 0;
}
.searchForm {
  display: grid;
  gap: 6px;
  margin-bottom: 16px;
}
.searchForm > div {
  display: flex;
  gap: 8px;
}
.searchForm input {
  flex: 1;
}
.listSummary {
  margin-bottom: 10px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.backToMembers {
  display: inline-block;
  margin: 0 0 16px;
  padding: 8px 0;
}
dl {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 12px;
  margin-top: 20px;
}
dt {
  color: var(--practice-muted);
}
dd {
  overflow-wrap: anywhere;
}
.recentActivity {
  margin-top: 12px;
}
.recentActivity li {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--practice-border);
}
button:focus-visible,
select:focus-visible,
input:focus-visible,
a:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--practice-accent);
  outline-offset: 3px;
}
@media (max-width: 640px) {
  .metricGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .metricCard {
    padding: 12px;
  }
  .adminHeader {
    align-items: flex-start;
  }
  .adminHeader > button {
    font-size: 12px;
    flex-shrink: 0;
    padding: 6px 8px;
  }
  .panelHeading {
    align-items: flex-start;
  }
}
</style>
