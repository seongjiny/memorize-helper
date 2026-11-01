import { test as base, expect } from '@playwright/test'

// Keep background monitoring deterministic and off the network in every browser test.
export const test = base.extend({
  monitoringDefaults: [
    async ({ context }, use) => {
      await context.route('**/functions/v1/monitoring-admin', (route) =>
        route.fulfill({ status: 403, json: { error: '관리자 권한이 필요합니다.' } }),
      )
      await context.route('**/functions/v1/track-visit', (route) =>
        route.fulfill({ status: 202, json: { accepted: true } }),
      )
      await use()
    },
    { auto: true },
  ],
})
export { expect }
