import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Base path for GitHub Pages project sites (e.g. https://user.github.io/repo-name/).
// Set VITE_BASE_PATH=/repo-name/ when building for GH Pages; Cloudflare Pages can leave it unset ("/").
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
