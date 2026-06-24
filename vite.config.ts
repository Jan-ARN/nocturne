import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from https://<user>.github.io/nocturne/, so assets must
// resolve under that sub-path. Allow an env override for forks/custom hosts.
const base = process.env.VITE_BASE ?? '/nocturne/'

export default defineConfig({
  base,
  plugins: [react()],
})
