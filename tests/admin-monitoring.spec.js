import { test, expect } from './fixtures.js'
import { authenticate, recordsApi, updatesApi, userA, userB } from './support.js'

const adminApi = '**/functions/v1/monitoring-admin'
const trackApi = '**/functions/v1/track-visit'
const member = (i = 1) => ({
  id: i === 1 ? userA : `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
  name: `회원 ${i}`,
  createdAt: '2026-10-11T01:00:00Z',
  lastSignInAt: '2026-10-31T12:00:00Z',
  status: 'active',
  recordCount: i,
  lastRecordDate: '2026-10-30',
})
const dashboard = (days = 7, environment = 'dev') => ({
  environment,
  days,
  timezone: 'Asia/Seoul',
  collectedSince: '2026-11-01T00:00:00Z',
  summary: {
    visits: 42,
    visitors: 30,
    pageViews: 120,
    totalUsers: 21,
    newUsers: 3,
    activeRecordUsers: 6,
    totalRecords: 61,
    periodRecords: 12,
  },
  daily: Array.from({ length: days }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    visits: i + 1,
    visitors: i + 1,
    pageViews: i + 3,
    recordCount: 2,
    recordUsers: 2,
  })),
  pages: [
    { page: 'memorize', pageViews: 80, visitors: 20 },
    { page: 'read', pageViews: 40, visitors: 10 },
  ],
})

test.beforeEach(async ({ page }) => {
  await page.route(updatesApi, (route) => route.fulfill({ json: [] }))
  await page.route(recordsApi, (route) => route.fulfill({ json: [] }))
})

async function allowAdmin(page, actionHandler) {
  await page.route(adminApi, async (route) => {
    const input = route.request().postDataJSON()
    if (input.action === 'check') return route.fulfill({ json: { isAdmin: true } })
    if (actionHandler) return actionHandler(route, input)
    return route.fulfill({ json: dashboard(input.days, input.environment) })
  })
}

test('anonymous and ordinary accounts cannot see admin data or menu', async ({ page, context }) => {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: '로그인이 필요해요' })).toBeVisible()
  await expect(page.locator('.metricGrid')).toHaveCount(0)
  await authenticate(context)
  await page.reload()
  await expect(page.getByRole('heading', { name: '관리자 권한이 필요해요' })).toBeVisible()
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await expect(page.getByRole('link', { name: '운영 모니터링' })).toHaveCount(0)
})

test('dashboard filters, daily numbers and page counts use selected environment', async ({
  page,
  context,
}) => {
  await authenticate(context)
  const calls = []
  await allowAdmin(page, (route, input) => {
    calls.push(input)
    return route.fulfill({ json: dashboard(input.days, input.environment) })
  })
  await page.goto('/admin')
  await expect(page.locator('.metricCard')).toHaveCount(8)
  await expect(page.locator('.metricCard').first()).toContainText('42')
  await page.getByLabel('조회 기간').selectOption('30')
  await expect(page.locator('.trendDay')).toHaveCount(30)
  await page.getByLabel('방문 통계 환경').selectOption('prod')
  await expect.poll(() => calls.at(-1)?.environment).toBe('prod')
  await page.getByText('날짜별 수치 보기', { exact: true }).click()
  await expect(page.locator('details tbody tr')).toHaveCount(30)
  await expect(page.getByRole('cell', { name: '암송', exact: true })).toBeVisible()
  await expect(page.locator('.definitions')).toContainText('관리자 방문은 제외')
})

test('member search, pagination and detail show summaries without verse contents', async ({
  page,
  context,
}) => {
  await authenticate(context)
  const members = Array.from({ length: 21 }, (_, i) => member(i + 1))
  await allowAdmin(page, (route, input) => {
    if (input.action === 'user')
      return route.fulfill({
        json: {
          ...member(),
          email: 'member@example.test',
          isAdmin: true,
          activeDays30: 4,
          recentActivity: [{ date: '2026-10-30', count: 1 }],
        },
      })
    const filtered = members.filter((item) => !input.search || item.name === input.search)
    return route.fulfill({
      json: {
        total: filtered.length,
        page: input.page,
        pageSize: 20,
        users: filtered.slice((input.page - 1) * 20, input.page * 20),
      },
    })
  })
  await page.goto('/admin/users')
  await expect(page.locator('.membersTable tbody tr')).toHaveCount(20)
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(page.locator('.membersTable tbody tr')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled()
  await page.getByRole('searchbox', { name: '회원 검색' }).fill('없는회원')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.getByText('검색 조건에 맞는 회원이 없습니다.')).toBeVisible()
  await page.getByRole('searchbox', { name: '회원 검색' }).fill('회원 1')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await page.getByRole('link', { name: '회원 1', exact: true }).click()
  await expect(page.locator('.memberDetail')).toContainText('member@example.test')
  await expect(page.locator('.recentActivity')).toContainText('2026-10-30')
  await expect(
    page.getByText('개인별 구절 내용은 표시하지 않습니다.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /삭제|정지|권한 변경/ })).toHaveCount(0)
})

test('a failed dashboard can be retried and never becomes a zero statistic', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let failed = true
  await allowAdmin(page, (route) =>
    failed
      ? route.fulfill({ status: 503, json: { error: 'unavailable' } })
      : route.fulfill({ json: dashboard() }),
  )
  await page.goto('/admin')
  await expect(page.getByRole('alert')).toContainText('정보를 불러오지 못했어요')
  await expect(page.locator('.metricGrid')).toHaveCount(0)
  failed = false
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(page.locator('.metricCard')).toHaveCount(8)
})

test('revoking admin access clears the dashboard on the next request', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let allowed = true
  await page.route(adminApi, (route) => {
    if (!allowed) return route.fulfill({ status: 403, json: {} })
    return route.fulfill({
      json: route.request().postDataJSON().action === 'check' ? { isAdmin: true } : dashboard(),
    })
  })
  await page.goto('/admin')
  await expect(page.locator('.metricCard')).toHaveCount(8)
  allowed = false
  await page.getByRole('button', { name: '새로고침', exact: true }).click()
  await expect(page.getByRole('heading', { name: '관리자 권한이 필요해요' })).toBeVisible()
  await expect(page.locator('.metricGrid')).toHaveCount(0)
})

test('an account switch drops an in-flight member response', async ({ page, context }) => {
  await authenticate(context)
  let release
  let denied = false
  const pending = new Promise((resolve) => {
    release = resolve
  })
  await page.route(adminApi, async (route) => {
    if (denied) return route.fulfill({ status: 403, json: {} })
    if (route.request().postDataJSON().action === 'check')
      return route.fulfill({ json: { isAdmin: true } })
    await pending
    return route.fulfill({ json: { total: 1, page: 1, pageSize: 20, users: [member()] } })
  })
  await page.goto('/admin/users')
  await expect(page.getByText('정보를 불러오고 있습니다.')).toBeVisible()
  denied = true
  await page.evaluate(async (id) => {
    const { useAuthSession } = await import('/src/composables/useAuthSession.ts')
    useAuthSession().user.value = { id }
  }, userB)
  release()
  await expect(page.getByRole('heading', { name: '관리자 권한이 필요해요' })).toBeVisible()
  await expect(page.getByRole('link', { name: '회원 1', exact: true })).toHaveCount(0)
})

test('an empty environment has a collection message instead of invented history', async ({
  page,
  context,
}) => {
  await authenticate(context)
  await allowAdmin(page, (route) =>
    route.fulfill({
      json: {
        ...dashboard(),
        collectedSince: null,
        pages: [],
        daily: [],
        summary: { ...dashboard().summary, visits: 0, visitors: 0, pageViews: 0 },
      },
    }),
  )
  await page.goto('/admin')
  await expect(page.getByText('아직 수집된 방문이 없어요.', { exact: false })).toBeVisible()
})

test('mobile admin stays within the viewport and escapes member names', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await authenticate(context)
  await allowAdmin(page, (route) =>
    route.fulfill({
      json: {
        total: 1,
        page: 1,
        pageSize: 20,
        users: [{ ...member(), name: '<img src=x onerror=alert(1)>' }],
      },
    }),
  )
  await page.goto('/admin/users')
  await expect(page.locator('.memberLink')).toHaveText('<img src=x onerror=alert(1)>')
  await expect(page.locator('.membersTable img')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('page tracking persists browser identity, changes event IDs and counts mode changes', async ({
  page,
}) => {
  const events = []
  await page.route(trackApi, (route) => {
    events.push(route.request().postDataJSON())
    return route.fulfill({ status: 202, json: { accepted: true } })
  })
  await page.goto('/script/romans-8')
  await expect.poll(() => events.filter((event) => event.page !== null).length).toBe(1)
  await page.getByRole('button', { name: '읽기', exact: true }).click()
  await expect.poll(() => events.filter((event) => event.page !== null).length).toBe(2)
  const visitor = events[0].visitorId
  await page.reload()
  await expect.poll(() => events.filter((event) => event.page !== null).length).toBe(3)
  expect(events.every((event) => event.visitorId === visitor)).toBe(true)
  expect(new Set(events.map((event) => event.eventId)).size).toBe(events.length)
  expect(events.filter((event) => event.page !== null).map((event) => event.page)).toEqual([
    'memorize',
    'read',
    'read',
  ])
  expect(Object.keys(events[0]).sort()).toEqual(['eventId', 'page', 'visitorId'])
})

test('admin pages, query-only record navigation and Do Not Track are respected', async ({
  page,
}) => {
  const events = []
  await page.route(trackApi, (route) => {
    events.push(route.request().postDataJSON())
    return route.fulfill({ status: 202, json: {} })
  })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: '로그인이 필요해요' })).toBeVisible()
  expect(events).toHaveLength(0)
  await page.goto('/records')
  await expect.poll(() => events.length).toBe(1)
  await page.evaluate(async () => {
    const { default: router } = await import('/src/router/index.ts')
    await router.push('/records?date=2026-10-01&view=month')
  })
  await expect(page).toHaveURL(/date=2026-10-01/)
  expect(events).toHaveLength(1)
  await page.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { value: '1' }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '암송 자료', exact: true })).toBeVisible()
  expect(events).toHaveLength(1)
})

test('collection failures leave the reading experience usable', async ({ page }) => {
  await page.route(trackApi, (route) => route.abort())
  await page.goto('/script/romans-8?mode=read')
  await expect(page.locator('.verseText').first()).toBeVisible()
  await expect(page.locator('.masked')).toHaveCount(0)
  await page.getByRole('button', { name: '암송', exact: true }).click()
  await expect(page.locator('.masked').first()).toBeVisible()
})
