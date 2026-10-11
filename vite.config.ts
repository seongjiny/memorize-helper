import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

const getBuildCommit = () => {
  const deploymentCommit = process.env.COMMIT_REF || process.env.GITHUB_SHA
  if (deploymentCommit) return deploymentCommit.slice(0, 7)
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_COMMIT__: JSON.stringify(getBuildCommit()),
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
