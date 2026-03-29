// v2.1
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['imap', 'mailparser'],
    }
  },
  plugins: [react()],
})
