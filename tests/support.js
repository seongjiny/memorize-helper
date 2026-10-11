export const userA = '11111111-1111-4111-8111-111111111111'
export const userB = '22222222-2222-4222-8222-222222222222'
export const recordsApi = 'https://review.example.test/rest/v1/memorization_records**'
export const updatesApi = 'https://review.example.test/rest/v1/update_notes**'

export const authenticate = async (context) => {
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

export const record = (date = '2026-10-10', overrides = {}) => ({
  id: 1,
  user_id: userA,
  record_date: date,
  script_id: 'romans-8',
  book: '로마서',
  start_chapter: 8,
  start_verse: 1,
  end_chapter: 8,
  end_verse: 10,
  updated_at: '2026-10-11T12:00:00Z',
  ...overrides,
})
