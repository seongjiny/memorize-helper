import { test, expect } from '@playwright/test'
import { authenticate, record, recordsApi, updatesApi, userB } from './support.js'

test.beforeEach(async ({ page }) => {
  await page.route(updatesApi, (route) => route.fulfill({ json: [] }))
  await page.clock.install({ time: new Date('2026-10-11T12:00:00Z') })
})

test('a direct script save announces first record and completion once, then expires', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let saved = null
  await page.route(recordsApi, (route) => {
    if (route.request().method() === 'POST') {
      saved = { ...route.request().postDataJSON(), id: 1 }
      return route.fulfill({ json: saved })
    }
    const byDate = new URL(route.request().url()).searchParams.has('record_date')
    return route.fulfill({ json: byDate ? saved : saved ? [saved] : [] })
  })
  await page.goto('/script/romans-8')
  await expect(page.locator('.achievementToast')).toHaveCount(0)
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('button', { name: '전체 열기' }).click()
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('button', { name: '암송 기록하기' }).click()
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page).toHaveURL(/\/records$/)
  await expect(page.locator('.achievementToast')).toContainText('첫 기록')
  await expect(page.locator('.achievementToast')).toContainText('로마서 8장 전체 기록 완료!')
  await expect(page.getByRole('button', { name: '달성 알림 닫기' })).not.toBeFocused()
  await page.clock.runFor(4200)
  await expect(page.locator('.achievementToast')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.achievementToast')).toHaveCount(0)
})

test('ten recorded days trigger a toast and an unchanged edit does not repeat it', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let rows = Array.from({ length: 9 }, (_, i) =>
    record(`2026-10-${String(i + 1).padStart(2, '0')}`, { id: i + 1 }),
  )
  await page.route(recordsApi, (route) => {
    const method = route.request().method()
    if (method === 'POST' || method === 'PATCH') {
      const saved = { ...route.request().postDataJSON(), id: 10 }
      rows = rows.filter((row) => row.id !== 10).concat(saved)
      return route.fulfill({ json: saved })
    }
    return route.fulfill({ json: rows })
  })
  await page.goto('/records?date=2026-10-11&view=month')
  await expect(page.locator('.achievementToast')).toHaveCount(0)
  await page.locator('.calendarDay.selected').click()
  await page.locator('.editorModal select').selectOption('romans-8')
  const inputs = page.locator('.editorModal input[type=number]')
  await inputs.nth(3).fill('10')
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.locator('.achievementToast')).toContainText('10일의 발자국')
  await expect(page.locator('.achievementToast p')).toHaveCount(1)
  await page.getByRole('button', { name: '달성 알림 닫기' }).click()
  await expect(page.locator('.achievementToast')).toHaveCount(0)
  await page.locator('.calendarDay.selected').click()
  await page.getByRole('button', { name: '수정 저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.achievementToast')).toHaveCount(0)
})

test('failed saves do not announce an achievement', async ({ page, context }) => {
  await authenticate(context)
  await page.route(recordsApi, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 400, json: { message: 'save failed' } })
      : route.fulfill({ json: [] }),
  )
  await page.goto('/records?date=2026-10-11&view=month')
  await page.locator('.calendarDay.selected').click()
  await page.locator('.editorModal select').selectOption('romans-8')
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.locator('.editError')).toContainText('암송 기록을 저장하지 못했습니다.')
  await expect(page.locator('.achievementToast')).toHaveCount(0)
})

test('an account change discards a pending achievement announcement', async ({ page, context }) => {
  await authenticate(context)
  let release
  const waiting = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/scripts/romans-8-kk.json', async (route) => {
    await waiting
    await route.continue()
  })
  await page.route(recordsApi, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ json: { ...route.request().postDataJSON(), id: 1 } })
      : route.fulfill({ json: [] }),
  )
  await page.goto('/records?date=2026-10-11&view=month')
  await page.locator('.calendarDay.selected').click()
  await page.locator('.editorModal select').selectOption('romans-8')
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.evaluate(async (id) => {
    const { useAuthSession } = await import('/src/composables/useAuthSession.ts')
    useAuthSession().user.value = { id }
  }, userB)
  release()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.achievementToast')).toHaveCount(0)
})

test.describe('mobile text sizing', () => {
  test.use({ isMobile: true, viewport: { width: 390, height: 844 } })
  test('memorization is first and default and both modes share every font step', async ({
    page,
  }) => {
    await page.goto('/script/romans-8')
    await expect(page.locator('.scriptModes button')).toHaveText(['암송', '읽기'])
    await expect(page.getByRole('button', { name: '암송', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: '메뉴 열기' }).click()
    await page.getByRole('button', { name: '전체 열기' }).click()
    const dimensions = () =>
      page
        .locator('.verseText')
        .first()
        .evaluate((el) => ({
          size: getComputedStyle(el).fontSize,
          wordSize: getComputedStyle(el.querySelector('.word')).fontSize,
          height: el.getBoundingClientRect().height,
        }))
    for (const size of [15, 18, 22, 28, 36, 44, 52, 60]) {
      await page.getByRole('button', { name: '암송', exact: true }).click()
      const memorization = await dimensions()
      expect(memorization.size).toBe(`${size}px`)
      expect(memorization.wordSize).toBe(`${size}px`)
      await page.getByRole('button', { name: '읽기', exact: true }).click()
      expect(await dimensions()).toEqual(memorization)
      if (size < 60) {
        await page.getByRole('button', { name: '메뉴 열기' }).click()
        await page.getByRole('button', { name: '글씨 크게' }).click()
        await page.getByRole('button', { name: '메뉴 열기' }).click()
      }
    }
    await page.reload()
    expect((await dimensions()).size).toBe('60px')
  })
})
