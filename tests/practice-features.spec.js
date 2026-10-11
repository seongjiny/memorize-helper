import { test, expect } from '@playwright/test'
import { authenticate, record, recordsApi, updatesApi, userB } from './support.js'

test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    localStorage.setItem('mh_hide_update_2026-08-11-memorization-experience', '1')
  })
  await context.route(updatesApi, (route) => route.fulfill({ json: [] }))
  await page.clock.install({ time: new Date('2026-10-11T12:00:00Z') })
})

test('reading reveals text without changing memorization state or recorded range', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let writes = 0
  await page.route(recordsApi, async (route) => {
    if (route.request().method() !== 'GET') writes += 1
    await route.fulfill({
      json: new URL(route.request().url()).searchParams.has('record_date') ? null : [],
    })
  })
  await page.goto('/script/sermon-on-the-mount')
  await page.locator('.verseLine').first().click()
  const maskedBefore = await page.locator('.masked').count()
  await page.getByRole('button', { name: '읽기', exact: true }).click()
  await expect(page).toHaveURL(/mode=read/)
  await expect(page.locator('.masked')).toHaveCount(0)
  expect(
    await page
      .locator('.verseLine')
      .first()
      .evaluate((line) => getComputedStyle(line).userSelect),
  ).not.toBe('none')
  await page.locator('.verseLine').last().click()
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await expect(page.getByRole('button', { name: '전체 가리기' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '암송 기록하기' })).toHaveCount(0)
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('button', { name: '암송', exact: true }).click()
  await expect(page.locator('.masked')).toHaveCount(maskedBefore)
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('button', { name: '암송 기록하기' }).click()
  const range = page.locator('.recordModal input[type=number]')
  await expect(range.nth(0)).toHaveValue('5')
  await expect(range.nth(1)).toHaveValue('1')
  await expect(range.nth(2)).toHaveValue('5')
  await expect(range.nth(3)).toHaveValue('1')
  expect(writes).toBe(0)
})

test('reading URLs survive reload and history while invalid modes use memorization', async ({
  page,
}) => {
  await page.goto('/script/romans-8?mode=read')
  await expect(page.getByRole('button', { name: '읽기', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.reload()
  await expect(page.locator('.masked')).toHaveCount(0)
  await page.getByRole('button', { name: '암송', exact: true }).click()
  await expect(page).toHaveURL(/mode=memorize/)
  await page.goBack()
  await expect(page.getByRole('button', { name: '읽기', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.goto('/script/romans-8?mode=invalid')
  await expect(page.locator('.masked').first()).toBeAttached()
})

test('home calendar shows streaks and opens the selected past date in records', async ({
  page,
  context,
}) => {
  await authenticate(context)
  const rows = [
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-08',
    '2026-10-09',
    '2026-10-10',
  ].map((date, i) => record(date, { id: i + 1 }))
  await page.route(recordsApi, (route) => route.fulfill({ json: rows }))
  await page.goto('/')
  await expect(page.locator('.activitySummary')).toHaveText('이번 달 5일 기록 · 현재 3일 연속')
  await expect(page.locator('.activityNote').first()).toContainText('최장 3일 연속')
  await expect(page.getByRole('button', { name: '다음 달', exact: true })).toBeDisabled()
  await expect(
    page.getByRole('button', { name: '2026-10-12, 기록 없음, 미래 날짜', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: '이전 달', exact: true }).click()
  await page.getByRole('button', { name: '2026-09-30, 암송 기록 있음', exact: true }).click()
  await expect(page.locator('.activityDetail')).toContainText('로마서 8장 1–10절')
  await page.getByRole('link', { name: '기록 보기·수정' }).click()
  await expect(page).toHaveURL(/\/records\?date=2026-09-30&view=month/)
  await expect(page.locator('.selectedDateLabel')).toHaveText('선택한 날짜: 2026-09-30')
  await expect(page.locator('.historyNav strong')).toHaveText('2026년 9월')
  await page.locator('.calendarDay.selected').click()
  await expect(page.locator('.editorModal input[type=date]')).toHaveValue('2026-09-30')
})

test('record creation and deletion update the calendar and achievement conditions', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let rows = [record('2026-10-09', { id: 1, end_verse: 39 }), record('2026-10-10', { id: 2 })]
  await page.route(recordsApi, async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      const saved = { ...request.postDataJSON(), id: 3 }
      rows.push(saved)
      await route.fulfill({ json: saved })
    } else if (request.method() === 'DELETE') {
      const id = Number(new URL(request.url()).searchParams.get('id')?.slice(3))
      rows = rows.filter((row) => row.id !== id)
      await route.fulfill({ status: 204 })
    } else await route.fulfill({ json: rows })
  })
  await page.goto('/')
  await expect(page.locator('.activitySummary')).toContainText('현재 2일 연속')
  await page.getByRole('link', { name: '이 날짜에 기록하기' }).click()
  await page.locator('.calendarDay.selected').click()
  await page.locator('.editorModal select').selectOption('romans-8')
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: '암송 도우미 홈으로 이동' }).click()
  await expect(page.locator('.activitySummary')).toHaveText('이번 달 3일 기록 · 현재 3일 연속')
  await page.getByRole('link', { name: '나의 성취 보기 →' }).click()
  await expect(page.locator('[data-achievement="three-day-streak"] .badgeStatus')).toHaveText(
    '달성',
  )
  await expect(page.locator('[data-achievement="complete-script"] .badgeStatus')).toHaveText('달성')
  await page.goto('/records?date=2026-10-09&view=month')
  await page.locator('.calendarDay.selected').click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: '암송 도우미 홈으로 이동' }).click()
  await expect(page.locator('.activitySummary')).toHaveText('이번 달 2일 기록 · 현재 2일 연속')
  await page.getByRole('link', { name: '나의 성취 보기 →' }).click()
  await expect(page.locator('[data-achievement="three-day-streak"] .badgeStatus')).toHaveText(
    '진행 중',
  )
  await expect(page.locator('[data-achievement="complete-script"] .badgeStatus')).toHaveText(
    '진행 중',
  )
})

test('history errors are retryable and do not become zero-day summaries', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let fail = true
  await page.route(recordsApi, (route) =>
    fail
      ? route.fulfill({ status: 400, json: { message: 'unavailable' } })
      : route.fulfill({ json: [record()] }),
  )
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('기록을 불러오지 못했어요')
  await expect(page.locator('.activitySummary')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: '기록 다시 시도' }).click()
  await expect(page.locator('.activitySummary')).toContainText('이번 달 1일 기록')
})

test('script failure keeps completion achievement unknown and supports retry', async ({
  page,
  context,
}) => {
  await authenticate(context)
  await page.route(recordsApi, (route) => route.fulfill({ json: [record()] }))
  let fail = true
  await page.route('**/scripts/romans-8-kk.json', (route) =>
    fail ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue(),
  )
  await page.goto('/achievements')
  await expect(page.locator('[data-achievement="complete-script"] .badgeStatus')).toHaveText(
    '확인 불가',
  )
  await expect(page.locator('[data-achievement="first-record"] .badgeStatus')).toHaveText('달성')
  fail = false
  await page.getByRole('button', { name: '본문 다시 시도' }).click()
  await expect(page.locator('[data-achievement="complete-script"]')).toContainText('10 / 39절')
  await expect(page.locator('[data-achievement="complete-script"] .badgeStatus')).toHaveText(
    '진행 중',
  )
})

test('account changes and logout clear personal calendar and achievements', async ({
  page,
  context,
}) => {
  await authenticate(context)
  await page.route(recordsApi, (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.get('user_id')?.includes(userB)
        ? []
        : [record()],
    }),
  )
  await page.goto('/achievements')
  await expect(page.locator('[data-achievement="first-record"] .badgeStatus')).toHaveText('달성')
  await page.evaluate(async (id) => {
    const { useAuthSession } = await import('/src/composables/useAuthSession.ts')
    useAuthSession().user.value = { id }
  }, userB)
  await expect(page.locator('[data-achievement="first-record"] .badgeStatus')).toHaveText('진행 중')
  await page.getByRole('link', { name: '암송 도우미 홈으로 이동' }).click()
  await expect(page.locator('.activitySummary')).toHaveText('이번 달 0일 기록 · 현재 0일 연속')
  await page.evaluate(async () => {
    const { useAuthSession } = await import('/src/composables/useAuthSession.ts')
    useAuthSession().user.value = null
  })
  await expect(page.locator('.activityCalendar')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '카카오로 로그인' })).toBeVisible()
})

test('calendar and streaks refresh across midnight without reloading', async ({
  page,
  context,
}) => {
  await page.clock.setSystemTime(new Date('2026-10-11T23:59:30Z'))
  await authenticate(context)
  await page.route(recordsApi, (route) => route.fulfill({ json: [record('2026-10-10')] }))
  await page.goto('/')
  await expect(page.locator('.activitySummary')).toContainText('현재 1일 연속')
  await page.clock.runFor(30_100)
  await expect(page.locator('.activitySummary')).toContainText('현재 0일 연속')
  await expect(
    page.getByRole('button', { name: '2026-10-12, 기록 없음, 오늘', exact: true }),
  ).toBeEnabled()
})

test('date calculations handle leap years, missing days, duplicates and future records', async ({
  page,
}) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { summarizeActivity } = await import('/src/lib/practiceProgress.ts')
    const { getMonthCells, parseDateKey } = await import('/src/lib/date.ts')
    const dates = [
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
      '2024-03-01',
      '2024-03-03',
      '2024-03-05',
      '2024-02-30',
    ]
    return {
      activity: summarizeActivity(
        dates.map((recordDate) => ({ recordDate })),
        '2024-03-04',
      ),
      leapDays: getMonthCells(new Date(2024, 1, 1)).filter(Boolean).length,
      invalid: parseDateKey('2023-02-29'),
    }
  })
  expect(result.activity).toEqual({
    dates: ['2024-02-28', '2024-02-29', '2024-03-01', '2024-03-03'],
    totalDays: 4,
    currentStreak: 1,
    longestStreak: 3,
  })
  expect(result.leapDays).toBe(29)
  expect(result.invalid).toBeNull()
})

test('completion uses exact coverage rather than a rounded 100 percent', async ({ page }) => {
  await page.goto('/')
  const progress = await page.evaluate(async () => {
    const { getScriptProgress } = await import('/src/lib/practiceProgress.ts')
    const script = {
      id: 'large-script',
      title: 'Matthew',
      blocks: [
        {
          id: 1,
          label: 'Matthew 1:1–500',
          lines: Array.from({ length: 500 }, (_, i) => `${i + 1}. verse`),
        },
      ],
    }
    const records = [
      { scriptId: 'large-script', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 499 },
    ]
    return getScriptProgress(script, records)
  })
  expect(progress.percentage).toBe(100)
  expect(progress.coveredVerses).toBe(499)
  expect(progress.isComplete).toBe(false)
})

test.describe('daylight saving dates', () => {
  test.use({ timezoneId: 'America/New_York' })
  test('streaks count local calendar days across the DST transition', async ({ page }) => {
    await page.goto('/')
    const summary = await page.evaluate(async () => {
      const { summarizeActivity } = await import('/src/lib/practiceProgress.ts')
      return summarizeActivity(
        ['2026-03-07', '2026-03-08', '2026-03-09'].map((recordDate) => ({ recordDate })),
        '2026-03-09',
      )
    })
    expect(summary.currentStreak).toBe(3)
    expect(summary.longestStreak).toBe(3)
  })
})

test('new screens fit a narrow viewport with large fonts and dark mode', async ({
  page,
  context,
}) => {
  await authenticate(context)
  await context.addInitScript(() => {
    localStorage.setItem('mh_font_px', '60')
    localStorage.setItem('mh_dark_mode', '1')
  })
  await page.setViewportSize({ width: 320, height: 760 })
  await page.route(recordsApi, (route) => route.fulfill({ json: [record()] }))
  for (const path of ['/', '/achievements', '/script/romans-8?mode=read']) {
    await page.goto(path)
    await expect(page.locator('.app')).toHaveClass(/dark/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
