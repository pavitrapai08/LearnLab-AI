import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Parse .env.local for integration tests (vitest doesn't load it by default)
function loadEnvLocal(): Record<string, string> {
  try {
    const content = readFileSync(path.resolve('.env.local'), 'utf-8')
    const env: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#\s][^=]*)=(.*)$/)
      if (match) env[match[1].trim()] = match[2].trim()
    }
    return env
  } catch {
    return {}
  }
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    env: loadEnvLocal(),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
