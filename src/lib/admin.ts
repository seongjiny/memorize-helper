import { supabase } from '@/lib/supabase'
import type { MonitoringEnvironment } from '@/types/admin'

export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function requestAdmin<T>(input: {
  action: 'check' | 'dashboard' | 'users' | 'user'
  environment?: MonitoringEnvironment
  days?: number
  search?: string
  page?: number
  userId?: string
}): Promise<T> {
  if (!supabase) throw new AdminError(503, '지금은 연결할 수 없습니다.')
  const { data, error } = await supabase.functions.invoke('monitoring-admin', { body: input })
  if (error) {
    const status = error.context instanceof Response ? error.context.status : 503
    throw new AdminError(
      status,
      status === 401
        ? '다시 로그인해 주세요.'
        : status === 403
          ? '관리자 권한이 필요합니다.'
          : status === 404
            ? '회원을 찾을 수 없습니다.'
            : '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    )
  }
  return data as T
}

export const monitoringPageNames: Record<string, string> = {
  home: '홈',
  memorize: '암송',
  read: '읽기',
  records: '암송 기록',
  achievements: '나의 성취',
  updates: '업데이트 노트',
}
