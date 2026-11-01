import { createClient } from 'npm:@supabase/supabase-js@2.106.0'
import type { MonitoringBackend } from './monitoring.ts'

// These reserved secrets are supplied by the Edge runtime, never by the browser.
const client = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
)

export const backend: MonitoringBackend = {
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
  async resolveUser(token) {
    const { data, error } = await client.auth.getUser(token)
    return error ? null : data.user?.id || null
  },
  async rpc(name, args) {
    const { data, error } = await client.rpc(name, args)
    return { data, error }
  },
}
