export type RpcResult = { data: unknown; error: { code?: string } | null }
export type MonitoringBackend = {
  resolveUser: (token: string) => Promise<string | null>
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>
  anonKey: string
}

const origins: Record<string, 'dev' | 'prod'> = {
  'https://memorize-helper-dev.netlify.app': 'dev',
  'https://memorize-helper.netlify.app': 'prod',
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const pages = new Set(['home', 'memorize', 'read', 'records', 'achievements', 'updates'])

const headers = (origin: string) => ({
  ...(origins[origin] ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Headers':
    'authorization, apikey, x-client-info, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
  Vary: 'Origin',
})

async function body(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text()
  if (text.length > 2048) throw Error('Invalid body')
  const value = JSON.parse(text)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid body')
  return value
}

export function createMonitoringHandler(backend: MonitoringBackend, admin: boolean) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('Origin') || ''
    const reply = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers: headers(origin) })
    if ((origin && !origins[origin]) || (!admin && !origins[origin]))
      return reply(403, { error: '허용되지 않은 요청입니다.' })
    if (req.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: headers(origin) })
    if (req.method !== 'POST') return reply(405, { error: 'POST 요청만 지원합니다.' })
    try {
      const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || ''
      const actor = token && token !== backend.anonKey ? await backend.resolveUser(token) : null
      if (admin && !actor) return reply(401, { error: '다시 로그인해 주세요.' })
      if (!admin && token && token !== backend.anonKey && !actor)
        return reply(401, { error: '유효하지 않은 인증입니다.' })
      let input: Record<string, unknown>
      try {
        input = await body(req)
      } catch {
        return reply(400, { error: '요청 형식을 확인해 주세요.' })
      }
      let result: RpcResult
      if (admin) {
        const {
          action,
          environment = 'dev',
          days = 7,
          search = '',
          page = 1,
          userId = null,
        } = input
        if (
          typeof action !== 'string' ||
          !['check', 'dashboard', 'users', 'user'].includes(action) ||
          typeof environment !== 'string' ||
          !['dev', 'prod'].includes(environment) ||
          ![1, 7, 30].includes(days as number) ||
          typeof search !== 'string' ||
          search.length > 100 ||
          !Number.isInteger(page) ||
          Number(page) < 1 ||
          Number(page) > 10000 ||
          (action === 'user' && (typeof userId !== 'string' || !uuid.test(userId)))
        ) {
          return reply(400, { error: '조회 조건을 확인해 주세요.' })
        }
        result = await backend.rpc('monitoring_read_admin', {
          p_actor: actor,
          p_action: action,
          p_environment: environment,
          p_days: days,
          p_search: search.trim(),
          p_page: page,
          p_user: action === 'user' ? userId : null,
        })
      } else {
        const { visitorId, eventId, page } = input
        if (
          typeof visitorId !== 'string' ||
          !uuid.test(visitorId) ||
          typeof eventId !== 'string' ||
          !uuid.test(eventId) ||
          (page !== null && (typeof page !== 'string' || !pages.has(page)))
        ) {
          return reply(400, { error: '잘못된 방문 기록입니다.' })
        }
        if (page === null && !actor) return reply(202, { accepted: false })
        result = await backend.rpc('monitoring_track_view', {
          p_actor: actor,
          p_environment: origins[origin],
          p_visitor: visitorId,
          p_event: eventId,
          p_page: page,
        })
      }
      if (result.error) {
        if (result.error.code === '42501') return reply(403, { error: '관리자 권한이 필요합니다.' })
        if (result.error.code === 'P0002') return reply(404, { error: '회원을 찾을 수 없습니다.' })
        return reply(503, {
          error: '지금은 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.',
        })
      }
      return reply(admin ? 200 : 202, result.data)
    } catch {
      return reply(503, { error: '지금은 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' })
    }
  }
}
