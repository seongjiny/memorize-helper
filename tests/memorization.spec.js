import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const userA = '11111111-1111-4111-8111-111111111111'
const userB = '22222222-2222-4222-8222-222222222222'
const today = new Date().toLocaleDateString('en-CA')
const api = 'https://review.example.test/**'
const record = (userId = userA) => ({
  id: 1,
  user_id: userId,
  record_date: today,
  script_id: 'romans-8',
  book: '로마서',
  start_chapter: 8,
  start_verse: 1,
  end_chapter: 8,
  end_verse: 10,
  updated_at: new Date().toISOString(),
})

const authenticate = async (context) => {
  await context.addInitScript((id) => {
    localStorage.setItem(
      'sb-review-auth-token',
      JSON.stringify({
        access_token: 'review.access.token',
        refresh_token: 'review.refresh',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: { provider: 'kakao' },
          user_metadata: { name: 'Review User' },
          created_at: '2026-10-01T00:00:00Z',
        },
      }),
    )
  }, userA)
}
const openRecord = async (page) => {
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('button', { name: '암송 기록하기' }).click()
  await expect(page.getByRole('dialog', { name: '암송 기록 입력' })).toBeVisible()
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('mh_hide_update_2026-08-11-memorization-experience', '1')
  })
})

test('editing another script’s daily record preserves its original script', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let payload
  await page.route(api, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'PATCH') {
      payload = request.postDataJSON()
      await route.fulfill({ json: { ...payload, id: 1 } })
    } else {
      await route.fulfill({ json: url.searchParams.has('record_date') ? record() : [record()] })
    }
  })
  await page.goto('/script/sermon-on-the-mount')
  await openRecord(page)
  await expect(page.locator('.recordModal')).toContainText('로마서 8장의 오늘 기록')
  await expect(page.getByRole('button', { name: '수정 저장', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '수정 저장', exact: true }).click()
  await expect(page).toHaveURL(/\/records$/)
  expect(payload.script_id).toBe('romans-8')
  expect(payload.book).toBe('로마서')
})

test('lookup failure keeps the dialog open, blocks saving, and allows retry', async ({
  page,
  context,
}) => {
  await authenticate(context)
  let fail = true
  await page.route(api, async (route) => {
    if (fail) await route.fulfill({ status: 400, json: { message: 'unavailable' } })
    else await route.fulfill({ json: null })
  })
  await page.goto('/script/sermon-on-the-mount')
  await openRecord(page)
  await expect(page.locator('.recordError')).toContainText('다시 시도')
  await expect(page.getByRole('button', { name: '기록 저장', exact: true })).toBeDisabled()
  fail = false
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(page.getByRole('button', { name: '기록 저장', exact: true })).toBeEnabled()
  await expect(page.locator('.recordError')).toHaveCount(0)
})

test('a conflicting new record does not overwrite the existing date', async ({ page, context }) => {
  await authenticate(context)
  let method
  await page.route(api, async (route) => {
    if (route.request().method() === 'POST') {
      method = route.request().method()
      expect(new URL(route.request().url()).searchParams.has('on_conflict')).toBe(false)
      await route.fulfill({ status: 409, json: { code: '23505', message: 'duplicate' } })
    } else await route.fulfill({ json: null })
  })
  await page.goto('/script/romans-8')
  await page.locator('.verseLine').first().click()
  await openRecord(page)
  await expect(page.getByRole('button', { name: '기록 저장', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.locator('.recordError')).toContainText('이미 다른 암송 기록')
  expect(method).toBe('POST')
  await expect(page).toHaveURL(/\/script\/romans-8$/)
})

test('script navigation clears words, reveal state and opened range', async ({ page }) => {
  await page.goto('/script/sermon-on-the-mount')
  await page.locator('.verseLine').first().click()
  await page.evaluate(async () => {
    const { default: router } = await import('/src/router/index.ts')
    await router.push('/script/romans-8')
  })
  await expect(page.locator('.scriptTitle')).toHaveText('로마서 8장')
  await expect(page.locator('.verseLine').first()).toContainText('정죄함이')
  await expect(page.locator('.verseLine').first().locator('.masked')).not.toHaveCount(0)
  await page.locator('.verseLine').first().click()
  await page.evaluate(async () => {
    const { useAuthSession } = await import('/src/composables/useAuthSession.ts')
    const { user } = useAuthSession()
    user.value = { id: '11111111-1111-4111-8111-111111111111' }
  })
  await page.route(api, (route) => route.fulfill({ json: null }))
  await openRecord(page)
  await expect(page.locator('.recordModal input[type=number]').nth(0)).toHaveValue('8')
})

test('ESV prayer lines retain verse references and headings are separate', async ({ page }) => {
  await page.goto('/script/sermon-on-the-mount-esv')
  const prayer = page.locator('.verseLine[data-reference="6:9"]')
  await expect(prayer).toContainText('Father')
  await expect(prayer).toContainText('hallowed')
  await expect(
    page.locator('.blockTitle').filter({ hasText: 'Build Your House on the Rock' }),
  ).toBeVisible()
  await expect(
    page.locator('.verseLine').filter({ hasText: 'Build Your House on the Rock' }),
  ).toHaveCount(0)
})

test('account changes and logout discard late responses and close the editor', async ({
  page,
  context,
}) => {
  await authenticate(context)
  await page.route(api, (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has('record_date') ? record() : [record()],
    }),
  )
  await page.goto('/records')
  await page.getByRole('button', { name: '암송 기록 수정', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.unroute(api)
  let releaseA
  const delayedA = new Promise((resolve) => {
    releaseA = resolve
  })
  await page.route(api, async (route) => {
    const id = new URL(route.request().url()).searchParams.get('user_id')?.slice(3)
    if (id === userA) await delayedA
    await route.fulfill({ json: [record(id)] })
  })
  const result = await page.evaluate(
    async ({ userA, userB }) => {
      const { useAuthSession } = await import('/src/composables/useAuthSession.ts')
      const { useMemorizationRecords } = await import('/src/composables/useMemorizationRecords.ts')
      const { user } = useAuthSession()
      const store = useMemorizationRecords()
      window.pendingA = store.load(userA)
      user.value = { id: userB }
      await Promise.resolve()
      await store.load(userB)
      return store.records.value.map((row) => row.userId)
    },
    { userA, userB },
  )
  expect(result).toEqual([userB])
  await expect(page.getByRole('dialog')).toHaveCount(0)
  releaseA()
  const afterA = await page.evaluate(async () => {
    await window.pendingA
    const { useMemorizationRecords } = await import('/src/composables/useMemorizationRecords.ts')
    return useMemorizationRecords().records.value.map((row) => row.userId)
  })
  expect(afterA).toEqual([userB])
  await page.evaluate(async () => {
    const { useAuthSession } = await import('/src/composables/useAuthSession.ts')
    useAuthSession().user.value = null
  })
  const afterLogout = await page.evaluate(async () => {
    const { useMemorizationRecords } = await import('/src/composables/useMemorizationRecords.ts')
    return useMemorizationRecords().records.value
  })
  expect(afterLogout).toEqual([])
})

test('all history pages are loaded', async ({ page, context }) => {
  await authenticate(context)
  const offsets = []
  await page.route(api, async (route) => {
    const url = new URL(route.request().url())
    const offset = Number(url.searchParams.get('offset'))
    offsets.push(offset)
    const count = offset < 1000 ? 500 : 1
    const rows = Array.from({ length: count }, (_, i) => ({ ...record(), id: offset + i + 1 }))
    await route.fulfill({ json: rows })
  })
  await page.goto('/records')
  await expect.poll(() => offsets.length).toBe(3)
  expect(offsets).toEqual([0, 500, 1000])
  const count = await page.evaluate(async () => {
    const { useMemorizationRecords } = await import('/src/composables/useMemorizationRecords.ts')
    return useMemorizationRecords().records.value.length
  })
  expect(count).toBe(1001)
})

test('bundled passages have complete unique verses and correct block ranges', () => {
  for (const [file, chapters] of [
    ['sermon-on-the-mount-kk.json', { 5: 48, 6: 34, 7: 29 }],
    ['sermon-on-the-mount-esv.json', { 5: 48, 6: 34, 7: 29 }],
    ['romans-8-kk.json', { 8: 39 }],
  ]) {
    const script = JSON.parse(
      readFileSync(new URL(`../public/scripts/${file}`, import.meta.url), 'utf8'),
    )
    const references = []
    for (const block of script.blocks) {
      const range = block.label.match(/(?:Matthew|마|롬)\s*(\d+):(\d+)(?:[–-](\d+))?/)
      expect(range).not.toBeNull()
      const verses = block.lines.map((line) => Number(line.match(/^(\d+)\./)?.[1]))
      expect(verses[0]).toBe(Number(range[2]))
      expect(verses.at(-1)).toBe(Number(range[3] || range[2]))
      references.push(...verses.map((verse) => `${range[1]}:${verse}`))
    }
    const expected = Object.entries(chapters).flatMap(([chapter, count]) =>
      Array.from({ length: count }, (_, i) => `${chapter}:${i + 1}`),
    )
    expect(references).toEqual(expected)
  }
})

test('a late history snapshot cannot undo a successful edit', async ({ page, context }) => {
  await authenticate(context)
  let releaseSnapshot
  let markRequested
  const snapshot = new Promise((resolve) => {
    releaseSnapshot = resolve
  })
  const requested = new Promise((resolve) => {
    markRequested = resolve
  })
  let reads = 0
  let current = record()
  await page.route(api, async (route) => {
    if (route.request().method() === 'PATCH') {
      current = { ...route.request().postDataJSON(), id: 1 }
      await route.fulfill({ json: current })
    } else if (reads++ === 0) {
      markRequested()
      await snapshot
      await route.fulfill({ json: [record()] })
    } else await route.fulfill({ json: [current] })
  })
  await page.goto('/script/romans-8')
  await page.locator('.verseLine').first().waitFor()
  await page.evaluate(async (id) => {
    const { useMemorizationRecords } = await import('/src/composables/useMemorizationRecords.ts')
    window.pendingSnapshot = useMemorizationRecords().load(id)
  }, userA)
  await requested
  await page.evaluate(async (id) => {
    const { useMemorizationRecords } = await import('/src/composables/useMemorizationRecords.ts')
    await useMemorizationRecords().update({
      id: 1,
      userId: id,
      recordDate: new Date().toLocaleDateString('en-CA'),
      scriptId: 'romans-8',
      book: '로마서',
      startChapter: 8,
      startVerse: 1,
      endChapter: 8,
      endVerse: 20,
      updatedAt: new Date().toISOString(),
    })
  }, userA)
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { useMemorizationRecords } = await import(
          '/src/composables/useMemorizationRecords.ts'
        )
        return useMemorizationRecords().records.value[0]?.endVerse
      }),
    )
    .toBe(20)
  releaseSnapshot()
  const afterSnapshot = await page.evaluate(async () => {
    await window.pendingSnapshot
    const { useMemorizationRecords } = await import('/src/composables/useMemorizationRecords.ts')
    return useMemorizationRecords().records.value[0].endVerse
  })
  expect(afterSnapshot).toBe(20)
})

test('failed scripture loading is recoverable', async ({ page }) => {
  let fail = true
  await page.route('**/scripts/romans-8-kk.json', async (route) => {
    if (fail) await route.fulfill({ status: 503, body: 'unavailable' })
    else await route.continue()
  })
  await page.goto('/script/romans-8')
  await expect(page.getByText('본문을 불러오지 못했습니다.', { exact: true })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(page.locator('.verseLine')).toHaveCount(39)
})
