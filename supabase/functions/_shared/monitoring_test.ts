import { strict as assert } from 'node:assert'
import { createMonitoringHandler, type MonitoringBackend } from './monitoring.ts'

const adminId = '11111111-1111-4111-8111-111111111111'
const visitorId = '22222222-2222-4222-8222-222222222222'
const eventId = '33333333-3333-4333-8333-333333333333'
function setup(admin = true, error: { code: string } | null = null) {
  const calls: { name: string; args: Record<string, unknown> }[] = []
  const backend: MonitoringBackend = {
    anonKey: 'public-anon-key',
    resolveUser: async (token) => (token === 'valid-user' ? adminId : null),
    rpc: async (name, args) => {
      calls.push({ name, args })
      return { data: { accepted: true, isAdmin: true }, error }
    },
  }
  const handler = createMonitoringHandler(backend, admin)
  const request = (
    data: unknown,
    token = 'valid-user',
    origin = 'https://memorize-helper-dev.netlify.app',
  ) =>
    handler(
      new Request('https://example.test', {
        method: 'POST',
        headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(data),
      }),
    )
  return { request, handler, calls }
}

Deno.test('admin rejects missing or invalid authentication before querying', async () => {
  const { request, calls } = setup()
  assert.equal((await request({ action: 'dashboard' }, '')).status, 401)
  assert.equal((await request({ action: 'dashboard' }, 'forged')).status, 401)
  assert.equal(calls.length, 0)
})
Deno.test('database admin denial and missing members have explicit statuses', async () => {
  assert.equal((await setup(true, { code: '42501' }).request({ action: 'check' })).status, 403)
  assert.equal(
    (await setup(true, { code: 'P0002' }).request({ action: 'user', userId: visitorId })).status,
    404,
  )
})
Deno.test('actor comes from verified token and filters are bounded', async () => {
  const { request, calls } = setup()
  assert.equal(
    (await request({ action: 'users', actor: visitorId, page: 2, search: ' name ' })).status,
    200,
  )
  assert.equal(calls[0]?.args.p_actor, adminId)
  assert.equal(calls[0]?.args.p_search, 'name')
  for (const input of [
    { action: 'delete' },
    { action: 'users', page: -1 },
    { action: 'users', page: 10001 },
    { action: 'users', search: 'a'.repeat(101) },
    { action: 'dashboard', days: 999 },
    { action: 'user', userId: 'bad-id' },
  ]) {
    assert.equal((await request(input)).status, 400)
  }
  assert.equal(calls.length, 1)
})
Deno.test('tracking derives environment from origin and accepts anonymous visitors', async () => {
  const { request, calls } = setup(false)
  assert.equal(
    (await request({ visitorId, eventId, page: 'home', environment: 'prod' }, 'public-anon-key'))
      .status,
    202,
  )
  assert.equal(calls[0]?.args.p_environment, 'dev')
  assert.equal(calls[0]?.args.p_actor, null)
  assert.equal(
    (await request({ visitorId, eventId, page: 'home' }, '', 'https://untrusted.example')).status,
    403,
  )
  assert.equal(calls.length, 1)
})
Deno.test('tracking rejects raw URLs, IDs and invalid identities', async () => {
  const { request, calls } = setup(false)
  for (const input of [
    { visitorId, eventId, page: '/script/private?email=secret' },
    { visitorId: 'bad', eventId, page: 'home' },
    { visitorId, eventId: 'bad', page: 'home' },
  ]) {
    assert.equal((await request(input, '')).status, 400)
  }
  assert.equal((await request({ visitorId, eventId, page: 'home' }, 'forged')).status, 401)
  assert.equal(calls.length, 0)
})
Deno.test(
  'identity-only calls do not create anonymous views; admin identity reaches database',
  async () => {
    const { request, calls } = setup(false)
    assert.equal((await request({ visitorId, eventId, page: null }, '')).status, 202)
    assert.equal(calls.length, 0)
    await request({ visitorId, eventId, page: null })
    assert.equal(calls[0]?.args.p_actor, adminId)
    assert.equal(calls[0]?.args.p_page, null)
  },
)
Deno.test(
  'CORS preflight is scoped; errors expose no SQL details and responses are not cached',
  async () => {
    const { handler, request } = setup(true, { code: 'XX000' })
    const preflight = await handler(
      new Request('https://example.test', {
        method: 'OPTIONS',
        headers: { Origin: 'https://memorize-helper.netlify.app' },
      }),
    )
    assert.equal(preflight.status, 204)
    assert.equal(
      preflight.headers.get('Access-Control-Allow-Origin'),
      'https://memorize-helper.netlify.app',
    )
    const response = await request({ action: 'dashboard' })
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.equal((await response.text()).includes('XX000'), false)
  },
)
