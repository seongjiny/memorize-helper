import { test, expect } from '@playwright/test'
import { updatesApi } from './support.js'

const note = (id = 'db-current-release', overrides = {}) => ({
  id,
  app_version: '0.2.0',
  title: 'DB에서 읽은 새 안내',
  introduction: '이번 기능을 소개합니다.',
  published_at: '2026-10-10T00:00:00Z',
  items: [{ icon: '✓', title: '읽기 모드', description: '펼쳐 읽을 수 있어요.' }],
  ...overrides,
})

test('published updates render from the database and dismiss per update ID', async ({ page }) => {
  await page.route(updatesApi, (route) => route.fulfill({ json: [note()] }))
  await page.goto('/')
  const dialog = page.getByRole('dialog', { name: '업데이트 노트' })
  await expect(dialog).toContainText('DB에서 읽은 새 안내')
  await expect(dialog).toContainText('읽기 모드')
  await expect(page.getByRole('button', { name: '확인했어요' })).toBeFocused()
  await page.getByRole('checkbox', { name: '이 업데이트 다시 보지 않기' }).check()
  await page.getByRole('button', { name: '확인했어요' }).click()
  await page.reload()
  await expect(dialog).toHaveCount(0)
  await page.route(updatesApi, (route) => route.fulfill({ json: [note('db-next-release')] }))
  await page.reload()
  await expect(dialog).toBeVisible()
})

test('updates history preserves previous releases and hides newer app versions', async ({
  page,
}) => {
  await page.route(updatesApi, (route) =>
    route.fulfill({
      json: [
        note('future-app-release', { app_version: '0.3.0', title: '아직 사용할 수 없는 기능' }),
        note(),
        note('2026-08-11-memorization-experience', {
          app_version: '0.1.0',
          title: '기존 업데이트',
        }),
      ],
    }),
  )
  await page.goto('/updates')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'DB에서 읽은 새 안내' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '기존 업데이트' })).toBeVisible()
  await expect(page.getByText('아직 사용할 수 없는 기능')).toHaveCount(0)
})

test('update dialog supports keyboard dismissal and keeps focus within its controls', async ({
  page,
}) => {
  await page.route(updatesApi, (route) => route.fulfill({ json: [note()] }))
  await page.goto('/')
  const close = page.getByRole('button', { name: '확인했어요' })
  const checkbox = page.getByRole('checkbox', { name: '이 업데이트 다시 보지 않기' })
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(checkbox).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('old dismissal keys remain valid after the database migration', async ({ page, context }) => {
  await context.addInitScript(() =>
    localStorage.setItem('mh_hide_update_2026-08-11-memorization-experience', '1'),
  )
  await page.route(updatesApi, (route) =>
    route.fulfill({ json: [note('2026-08-11-memorization-experience', { app_version: '0.1.0' })] }),
  )
  await page.goto('/')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('link', { name: /^업데이트 노트/ }).click()
  await expect(page.getByRole('heading', { name: 'DB에서 읽은 새 안내' })).toBeVisible()
})

test('update lookup failure leaves the app usable and can be retried', async ({ page }) => {
  let fail = true
  await page.route(updatesApi, (route) =>
    fail
      ? route.fulfill({ status: 400, json: { message: 'unavailable' } })
      : route.fulfill({ json: [note()] }),
  )
  await page.goto('/script/romans-8?mode=read')
  await expect(page.locator('.verseLine')).toHaveCount(39)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('link', { name: /^업데이트 노트/ }).click()
  await expect(page.getByRole('alert')).toContainText('불러오지 못했어요')
  fail = false
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'DB에서 읽은 새 안내' })).toBeVisible()
})

test('empty or malformed database content is handled without breaking navigation', async ({
  page,
}) => {
  await page.route(updatesApi, (route) => route.fulfill({ json: [] }))
  await page.goto('/updates')
  await expect(page.getByText('아직 공개된 업데이트 노트가 없습니다.')).toBeVisible()
  await page.route(updatesApi, (route) =>
    route.fulfill({ json: [note('invalid', { items: null })] }),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('불러오지 못했어요')
  await page.getByRole('link', { name: '암송 도우미 홈으로 이동' }).click()
  await expect(page.getByRole('heading', { name: '암송 자료' })).toBeVisible()
})
