import { supabase } from '@/lib/supabase'
import type { MonitoringEnvironment } from '@/types/admin'

export function deploymentEnvironment(
  hostname = window.location.hostname,
): MonitoringEnvironment | null {
  if (hostname === 'memorize-helper-dev.netlify.app') return 'dev'
  if (hostname === 'memorize-helper.netlify.app') return 'prod'
  return import.meta.env.VITE_MONITORING_ENV === 'dev' ? 'dev' : null
}

export function trackedPage(path: string, mode?: unknown): string | null {
  if (path === '/') return 'home'
  if (/^\/script\/[^/]+$/.test(path)) return mode === 'read' ? 'read' : 'memorize'
  return (
    (
      { '/records': 'records', '/achievements': 'achievements', '/updates': 'updates' } as Record<
        string,
        string
      >
    )[path] || null
  )
}

let visitorId: string | undefined
function visitor() {
  if (visitorId) return visitorId
  try {
    visitorId = localStorage.getItem('mh_visitor_id') || undefined
  } catch {
    /* Storage can be disabled. */
  }
  if (!visitorId || !/^[0-9a-f-]{36}$/i.test(visitorId)) visitorId = crypto.randomUUID()
  try {
    localStorage.setItem('mh_visitor_id', visitorId)
  } catch {
    /* Keep an in-memory identity for this tab. */
  }
  return visitorId
}

export async function trackPageView(page: string | null) {
  if (!supabase || !deploymentEnvironment() || navigator.doNotTrack === '1') return
  try {
    await supabase.functions.invoke('track-visit', {
      body: { visitorId: visitor(), eventId: crypto.randomUUID(), page },
    })
  } catch {
    /* Monitoring failures must not interrupt reading or saving records. */
  }
}
