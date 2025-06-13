import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ADD THIS LINE:
  base: '/', // This tells Vite to resolve assets relative to the root URL
})