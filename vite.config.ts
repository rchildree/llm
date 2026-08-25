import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub project sites are served from /<repository>/ rather than /. Keep
  // the default root path for Cloudflare Pages and local production previews.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/llm/' : '/',
  plugins: [react()],
})
