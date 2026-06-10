import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // relative base so the build works when served from a sub-path (e.g. GitHub Pages /games/)
  base: './',
  plugins: [react()],
})
