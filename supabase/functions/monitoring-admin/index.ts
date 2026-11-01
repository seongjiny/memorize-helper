import { backend } from '../_shared/backend.ts'
import { createMonitoringHandler } from '../_shared/monitoring.ts'

Deno.serve(createMonitoringHandler(backend, true))
