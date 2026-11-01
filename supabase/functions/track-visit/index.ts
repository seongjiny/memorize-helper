import { backend } from '../_shared/backend.ts'
import { createMonitoringHandler } from '../_shared/monitoring.ts'

// Anonymous visits are intentional; logged-in identities are verified in the handler.
Deno.serve(createMonitoringHandler(backend, false))
